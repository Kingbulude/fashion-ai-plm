// 核心 Pipeline：测款 → 决策 → 下单（全自动流水线）
//
// 触发：款式创建（STYLE_CREATED）
// 流程：
//   P1 AI 测款分析 → P2 数据汇总评估 → P3 下单建议生成
//     → P4 [暂停等人确认] → P5 自动创建生产单
//
// 决策分级：
//   🟢 P1 P2：AUTO（AI 自主执行）
//   🟡 P3 P4：CONFIRM（AI 建议 + 跟单一键确认）
//   🔴 —（大额采购走另一条 Pipeline，单独审批）

import { Pipeline } from "../types";
import { EventType } from "../../events/types";
import {
  AISpecialistType,
  AISuggestionPriority,
  AISuggestionType,
} from "@/lib/ai/architecture";
import {
  callLLMJson,
  createSuggestion,
  getStyle,
  getSalesHistory,
  updateStyleAIFields,
} from "../steps";
import { emit } from "../../events/emitter";
import { executeSkill } from "../../skills/executor";
import { dbAdmin } from "@/lib/db/client";

// ─── 测款评分阈值（超过此分数才进入决策阶段） ───
const DECISION_SCORE_THRESHOLD = 60;

export const testingDecisionOrderingPipeline: Pipeline = {
  id: "testing-decision-ordering",
  name: "测款决策下单流水线",
  description:
    "款式创建后，AI 自动完成测款分析、数据汇总、下单建议；跟单确认后自动创建生产单",
  trigger: EventType.STYLE_CREATED,

  steps: [
    // ───────────────────────────────────────
    // P1: AI 测款分析（AUTO）
    // ───────────────────────────────────────
    {
      name: "ai_style_test",
      label: "AI 测款分析",
      description: "AI 从市场接受度、竞争力、利润潜力、趋势契合度 4 维度评分",
      run: async (ctx) => {
        const style = await getStyle(ctx.styleId!);
        if (!style) {
          return { type: "fail" as const, reason: "款式不存在" };
        }

        const prompt = `你是服装行业资深测款专家。请对新款式进行 4 维度评分（每项 0-100）。

款式信息：
- 款号：${style.style_no}
- 名称：${style.name}
- 品类：${style.category || "未指定"}
- 季节：${style.season || "未指定"}
- 目标成本：${style.target_cost || "未指定"}
- 描述：${style.description || "无"}

请严格以 JSON 输出：
{
  "marketAcceptance": <0-100 市场接受度>,
  "competitiveness": <0-100 竞争力>,
  "profitPotential": <0-100 利润潜力>,
  "trendFit": <0-100 趋势契合度>,
  "overallScore": <0-100 综合分>,
  "tags": ["标签1", "标签2", "标签3"],
  "colorPalette": ["主色", "辅色", "点缀色"],
  "summary": "一句话总结"
}
只输出 JSON，不要其他文字。`;

        const result = await callLLMJson<{
          marketAcceptance: number;
          competitiveness: number;
          profitPotential: number;
          trendFit: number;
          overallScore: number;
          tags: string[];
          colorPalette: string[];
          summary: string;
        }>(prompt, "你是一位谨慎、数据驱动的服装测款专家，不轻易给高分。");

        if (!result) {
          return {
            type: "fail" as const,
            reason: "AI 输出解析失败",
            retryable: true,
          };
        }

        // 写回款式的 AI 字段
        await updateStyleAIFields(ctx.styleId!, {
          ai_tags: result.tags,
          ai_color_palette: result.colorPalette,
        });

        ctx.data.testResult = result;

        return {
          type: "continue" as const,
          data: { testResult: result },
        };
      },
    },

    // ───────────────────────────────────────
    // P2: 数据汇总评估（AUTO）
    // ───────────────────────────────────────
    {
      name: "evaluate_test_score",
      label: "评估测款结果",
      description: "根据测款分数判断是否进入决策阶段",
      run: async (ctx) => {
        const testResult = ctx.data.testResult as {
          overallScore: number;
        } | undefined;

        if (!testResult) {
          return { type: "fail" as const, reason: "缺少测款结果" };
        }

        ctx.data.passedThreshold =
          testResult.overallScore >= DECISION_SCORE_THRESHOLD;

        if (!ctx.data.passedThreshold) {
          return {
            type: "skip" as const,
            reason: `测款分数 ${testResult.overallScore} 低于阈值 ${DECISION_SCORE_THRESHOLD}，不进入下单流程`,
          };
        }

        return { type: "continue" as const };
      },
    },

    // ───────────────────────────────────────
    // P3: 下单建议生成（CONFIRM）
    // ───────────────────────────────────────
    {
      name: "generate_order_suggestion",
      label: "生成下单建议",
      description: "AI 综合测款分数、历史销售、品类特性，生成下单数量与色码比建议",
      guard: (ctx) => !!ctx.data.passedThreshold,

      run: async (ctx) => {
        const testResult = ctx.data.testResult as any;
        const style = await getStyle(ctx.styleId!);
        const salesHistory = await getSalesHistory(ctx.styleId!, 30);

        const prompt = `你是服装品牌的备货决策专家。基于以下信息，给出首单生产建议。

款式：${style?.name}（${style?.category}）
测款综合分：${testResult.overallScore}/100
  - 市场接受度：${testResult.marketAcceptance}
  - 竞争力：${testResult.competitiveness}
  - 利润潜力：${testResult.profitPotential}
  - 趋势契合度：${testResult.trendFit}
同款历史销量（最近30天）：${
          salesHistory.length > 0
            ? salesHistory.reduce((s, r) => s + (r.quantity || 0), 0) + " 件"
            : "无历史数据"
        }

请严格以 JSON 输出：
{
  "suggestedQuantity": <建议首单数量>,
  "safetyStock": <安全库存>,
  "colorSizeRatio": { "color": "<颜色比例说明>", "size": "<尺码比例说明>" },
  "reasoning": "决策依据（详细说明为何是这个数量）",
  "risks": ["风险1", "风险2"],
  "replenishStrategy": "补货策略说明"
}
只输出 JSON。`;

        const suggestion = await callLLMJson<{
          suggestedQuantity: number;
          safetyStock: number;
          colorSizeRatio: { color: string; size: string };
          reasoning: string;
          risks: string[];
          replenishStrategy: string;
        }>(prompt, "你是务实的备货决策专家，避免库存积压，宁可补货不可压货。");

        if (!suggestion) {
          return {
            type: "fail" as const,
            reason: "AI 下单建议生成失败",
            retryable: true,
          };
        }

        ctx.data.orderSuggestion = suggestion;

        // 写入 AI 建议表，等待跟单确认
        const suggestionId = await createSuggestion({
          ctx,
          type: AISuggestionType.DECISION,
          priority: AISuggestionPriority.HIGH,
          specialistType: AISpecialistType.STOCKING_AI,
          title: `下单建议：${style?.name} 首单 ${suggestion.suggestedQuantity} 件`,
          content: `${suggestion.reasoning}\n\n建议数量：${suggestion.suggestedQuantity} 件（含安全库存 ${suggestion.safetyStock} 件）\n色码比：${suggestion.colorSizeRatio.color}\n尺码比：${suggestion.colorSizeRatio.size}\n\n风险提示：\n${suggestion.risks.map((r) => "• " + r).join("\n")}\n\n补货策略：${suggestion.replenishStrategy}`,
          proposedData: {
            styleId: ctx.styleId,
            suggestedQuantity: suggestion.suggestedQuantity,
            safetyStock: suggestion.safetyStock,
            colorSizeRatio: suggestion.colorSizeRatio,
          },
          targetTable: "production_orders",
          targetId: ctx.styleId,
        });

        if (!suggestionId) {
          return { type: "fail" as const, reason: "建议写入失败" };
        }

        ctx.data.suggestionId = suggestionId;

        // 发射"下单建议就绪"事件（用于触发通知 Skill）
        await emit(EventType.ORDER_SUGGESTION_READY, {
          source: "ai-system",
          brandId: ctx.brandId,
          styleId: ctx.styleId,
          suggestionId,
          suggestedQuantity: suggestion.suggestedQuantity,
          safetyStock: suggestion.safetyStock,
          reasoning: suggestion.reasoning,
        });

        // 🤖 调用 Skill：发送飞书通知给跟单
        await executeSkill("send-lark-message", {
          title: "下单建议待确认",
          content: `**${style?.name || "款式"}** 测款完成，AI 建议下单：\n\n` +
            `📦 **建议数量**：${suggestion.suggestedQuantity} 件（含安全库存 ${suggestion.safetyStock} 件）\n` +
            `🎨 **色码比**：${suggestion.colorSizeRatio?.color}\n` +
            `📏 **尺码比**：${suggestion.colorSizeRatio?.size}\n\n` +
            `📊 **测款综合分**：${(ctx.data.testResult as any)?.overallScore}/100\n\n` +
            `请点击下方按钮查看详情并确认。`,
          styleId: ctx.styleId,
          suggestionId,
        }).catch(() => {}); // 通知失败不影响主流程

        // 暂停 Pipeline，等待跟单确认
        return {
          type: "pause_confirm" as const,
          reason: "等待跟单确认下单建议",
          suggestionId,
        };
      },
    },

    // ───────────────────────────────────────
    // P4: [暂停点] 跟单确认
    // ───────────────────────────────────────
    // 此步骤不实际执行，仅作为文档标记。
    // 确认动作通过 resumePipeline(runId, true) 触发，继续执行 P5。
    // （详见 src/lib/pipeline/runner.ts 的 resumePipeline 函数）

    // ───────────────────────────────────────
    // P5: 自动创建生产单（CONFIRM 通过后执行）
    // ───────────────────────────────────────
    {
      name: "create_production_order",
      label: "自动创建生产单",
      description: "跟单确认后，AI 自动创建生产订单并通知工厂",
      run: async (ctx) => {
        const suggestion = ctx.data.orderSuggestion as any;
        const suggestionId = ctx.data.suggestionId as string;

        if (!suggestion) {
          return { type: "fail" as const, reason: "缺少下单建议数据" };
        }

        // 创建生产订单
        const { data: order, error } = await dbAdmin
          .from("production_orders")
          .insert({
            style_id: ctx.styleId,
            status: "pending",
            quantity: suggestion.suggestedQuantity,
            color_size_ratio: suggestion.colorSizeRatio,
            material_ready: false,
          })
          .select()
          .single();

        if (error || !order) {
          return {
            type: "fail" as const,
            reason: `生产订单创建失败：${error?.message}`,
            retryable: true,
          };
        }

        ctx.data.orderId = order.id;

        // 更新建议状态为已执行
        await dbAdmin
          .from("ai_suggestions")
          .update({ status: "executed" })
          .eq("id", suggestionId);

        // 发射"生产订单创建"事件（触发后续采购、通知）
        await emit(EventType.PRODUCTION_ORDER_CREATED, {
          source: "ai-system",
          brandId: ctx.brandId,
          styleId: ctx.styleId,
          orderId: order.id,
          quantity: suggestion.suggestedQuantity,
        });

        // 🤖 调用 Skill：通知跟单生产单已创建
        await executeSkill("send-lark-message", {
          title: "生产单已创建",
          content: `**${(ctx.data.testResult as any)?.summary || "款式"}** 已确认下单，生产单已创建：\n\n` +
            `📦 **生产数量**：${suggestion.suggestedQuantity} 件\n` +
            `📋 **订单 ID**：${order.id}\n\n` +
            `采购流程已自动启动，请跟进工厂排产。`,
          styleId: ctx.styleId,
        }).catch(() => {});

        return {
          type: "continue" as const,
          data: { orderId: order.id },
        };
      },
    },
  ],
};
