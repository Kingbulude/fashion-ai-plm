// 每日定时 Pipeline
//
// 触发：CRON_DAILY（每天执行）
// 流程：
//   1. 扫描待测款款式（status=planning/designing 但没有 ai_tags 的）
//   2. 为每个待测款式发射 STYLE_CREATED 事件，触发测款流水线
//   3. 生成每日 AI 简报

import { Pipeline } from "../types";
import { EventType } from "../../events/types";
import { dbAdmin } from "@/lib/db/client";
import { emit } from "../../events/emitter";
import { generateText } from "@/lib/ai/cloudflare-ai";

export const dailyCheckinPipeline: Pipeline = {
  id: "daily-checkin",
  name: "每日巡检流水线",
  description: "每天扫描待测款款式、补跑测款分析、生成 AI 简报",
  trigger: EventType.CRON_DAILY,

  steps: [
    // ─── P1: 扫描待测款款式 ───
    {
      name: "scan_untested_styles",
      label: "扫描待测款款式",
      description: "查找已创建但未做 AI 测款分析的款式",
      run: async (ctx) => {
        const { data: untested } = await dbAdmin
          .from("styles")
          .select("id, style_no, name")
          .or("ai_tags.is.null,ai_tags.eq.[]")
          .order("created_at", { ascending: false })
          .limit(20);

        const styles = untested || [];
        ctx.data.untestedStyles = styles;

        if (styles.length === 0) {
          return { type: "skip" as const, reason: "无待测款款式" };
        }

        // 为每个款式发射事件，触发测款 Pipeline
        for (const style of styles) {
          await emit(EventType.STYLE_CREATED, {
            source: "cron",
            styleId: style.id,
            styleNo: style.style_no,
            name: style.name,
          });
        }

        return {
          type: "continue" as const,
          data: { triggeredCount: styles.length },
        };
      },
    },

    // ─── P2: 生成每日 AI 简报 ───
    {
      name: "generate_daily_briefing",
      label: "生成每日简报",
      description: "汇总今日数据，生成 AI 简报",
      run: async (ctx) => {
        // 统计今日各项数据
        const today = new Date().toISOString().slice(0, 10);

        const [styles, orders, sales, suggestions] = await Promise.all([
          dbAdmin.from("styles").select("id", { count: "exact" }),
          dbAdmin
            .from("production_orders")
            .select("id, quantity")
            .gte("created_at", today),
          dbAdmin
            .from("sales_records")
            .select("quantity, total_amount")
            .eq("sale_date", today),
          dbAdmin
            .from("ai_suggestions")
            .select("type, status")
            .gte("created_at", today),
        ]);

        const totalSales = (sales.data || []).reduce(
          (s, r) => s + (r.total_amount || 0),
          0
        );
        const totalSalesQty = (sales.data || []).reduce(
          (s, r) => s + (r.quantity || 0),
          0
        );
        const pendingSuggestions = (suggestions.data || []).filter(
          (s) => s.status === "pending"
        ).length;

        const briefing = await generateText(
          `你是品牌运营助理。请基于以下数据生成一份简洁的每日简报（200字内）：

- 总款式数：${styles.count || 0}
- 今日新增生产订单：${orders.data?.length || 0} 个
- 今日销售：${totalSalesQty} 件，营收 ¥${totalSales}
- 待处理 AI 建议：${pendingSuggestions} 条
- 今日待测款款式：${(ctx.data.triggeredCount as number) || 0}

请生成简报，突出需要关注的事项。`,
          "你是简洁务实的品牌运营助理，重点突出待办事项。"
        );

        ctx.data.dailyBriefing = briefing;

        // 写入 AI 建议（供前端展示）
        await dbAdmin.from("ai_suggestions").insert({
          ai_role_level: "ai_master",
          type: "analysis",
          priority: "low",
          title: `每日简报 ${today}`,
          content: briefing,
          status: "pending",
          created_by: "ai_system",
        });

        return { type: "continue" as const };
      },
    },
  ],
};
