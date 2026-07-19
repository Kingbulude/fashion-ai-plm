// 采购自动化 Pipeline
//
// 触发：生产订单创建（PRODUCTION_ORDER_CREATED）
// 流程：物料清单检查 → AI 供应商匹配 → 创建采购建议（待审批）

import { Pipeline } from "../types";
import { EventType } from "../../events/types";
import {
  AISpecialistType,
  AISuggestionPriority,
  AISuggestionType,
} from "@/lib/ai/architecture";
import { dbAdmin } from "@/lib/db/client";
import { callLLMJson, createSuggestion, getBomItems } from "../steps";
import { emit } from "../../events/emitter";

export const procurementAutomationPipeline: Pipeline = {
  id: "procurement-automation",
  name: "采购自动化流水线",
  description: "生产订单创建后，AI 自动检查物料、匹配供应商、生成采购建议",
  trigger: EventType.PRODUCTION_ORDER_CREATED,

  steps: [
    // ─── P1: 物料清单检查 ───
    {
      name: "check_bom",
      label: "物料清单检查",
      description: "检查款式的 BOM 是否完整，列出所有需要采购的物料",
      run: async (ctx) => {
        const bomItems = await getBomItems(ctx.styleId!);

        if (bomItems.length === 0) {
          return {
            type: "skip" as const,
            reason: "款式没有 BOM，跳过采购流程",
          };
        }

        // 检查哪些物料还没采购
        const { data: existingProcurement } = await dbAdmin
          .from("material_procurement")
          .select("bom_item_id, status")
          .eq("style_id", ctx.styleId);

        const procuredIds = new Set(
          (existingProcurement || []).map((p) => p.bom_item_id)
        );
        const missingItems = bomItems.filter((b) => !procuredIds.has(b.id));

        if (missingItems.length === 0) {
          return { type: "skip" as const, reason: "所有物料已采购" };
        }

        ctx.data.missingBomItems = missingItems;

        return { type: "continue" as const };
      },
    },

    // ─── P2: AI 供应商匹配 ───
    {
      name: "supplier_match",
      label: "AI 供应商匹配",
      description: "AI 根据物料类型、规格、历史评分匹配最佳供应商",
      guard: (ctx) => {
        const items = ctx.data.missingBomItems as any[];
        return Array.isArray(items) && items.length > 0;
      },

      run: async (ctx) => {
        const missingItems = ctx.data.missingBomItems as any[];

        // 拉取供应商池
        const { data: suppliers } = await dbAdmin
          .from("suppliers")
          .select("*");

        if (!suppliers || suppliers.length === 0) {
          return {
            type: "fail" as const,
            reason: "无可用供应商",
            retryable: false,
          };
        }

        const prompt = `你是服装供应链专家。请为以下物料匹配最合适的供应商。

物料清单：
${missingItems
  .map(
    (b, i) =>
      `${i + 1}. ${b.material_name} (${b.material_type}) - 规格: ${
        b.specification || "未指定"
      }, 用量: ${b.unit_consumption}, 单价: ${b.unit_price || "未指定"}`
  )
  .join("\n")}

可选供应商：
${suppliers
  .map(
    (s) =>
      `- ${s.name} (${s.type}) 联系: ${s.contact || "-"} ${s.phone || "-"} 质量评分: ${
        s.quality_score || "-"
      } 交期评分: ${s.delivery_score || "-"}`
  )
  .join("\n")}

请严格以 JSON 输出：
{
  "matches": [
    {
      "bomItemName": "物料名",
      "supplierName": "推荐供应商名",
      "supplierId": "<供应商 ID>",
      "reason": "推荐理由",
      "estimatedPrice": <预估单价>,
      "riskWarning": "风险提示（可为空）"
    }
  ]
}
只输出 JSON。`;

        const matchResult = await callLLMJson<{
          matches: Array<{
            bomItemName: string;
            supplierName: string;
            supplierId: string;
            reason: string;
            estimatedPrice: number;
            riskWarning?: string;
          }>;
        }>(prompt, "你是供应链匹配专家，优先考虑质量评分和交期评分。");

        if (!matchResult || !matchResult.matches) {
          return {
            type: "fail" as const,
            reason: "AI 供应商匹配失败",
            retryable: true,
          };
        }

        ctx.data.supplierMatches = matchResult.matches;

        // 为每个物料创建采购建议（待审批）
        const matchSummary = matchResult.matches
          .map(
            (m) =>
              `• ${m.bomItemName} → ${m.supplierName}（预估单价 ${m.estimatedPrice}）\n  理由：${m.reason}${
                m.riskWarning ? `\n  ⚠️ ${m.riskWarning}` : ""
              }`
          )
          .join("\n\n");

        const suggestionId = await createSuggestion({
          ctx,
          type: AISuggestionType.DECISION,
          priority: AISuggestionPriority.HIGH,
          specialistType: AISpecialistType.PROCUREMENT_AI,
          title: `采购建议：${matchResult.matches.length} 项物料待下单`,
          content: `已根据 BOM 自动匹配 ${matchResult.matches.length} 项物料的供应商：\n\n${matchSummary}\n\n请审核后确认采购。`,
          proposedData: {
            styleId: ctx.styleId,
            orderId: ctx.orderId,
            matches: matchResult.matches,
          },
          targetTable: "material_procurement",
        });

        ctx.data.procurementSuggestionId = suggestionId;

        // 发射采购建议事件
        await emit(EventType.PROCUREMENT_CREATED, {
          source: "ai-system",
          brandId: ctx.brandId,
          styleId: ctx.styleId,
          procurementId: suggestionId || "",
          bomItemId: "",
        });

        // 采购需要审批（属于较高风险）
        return {
          type: "pause_approve" as const,
          reason: `等待采购审批：${matchResult.matches.length} 项物料`,
          suggestionId: suggestionId || undefined,
        };
      },
    },
  ],
};
