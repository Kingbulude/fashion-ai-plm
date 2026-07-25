import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db/client";
import { generateText } from "@/lib/ai/cloudflare-ai";
import { safeJsonParse } from "@/lib/pipeline/steps";
import {
  AIRoleLevel,
  AISpecialistType,
  AISuggestionPriority,
  AISuggestionType,
} from "@/lib/ai/architecture";
import { createAISuggestion } from "@/lib/ai/suggestion-helper";

export const runtime = "edge";

type RouteContext = { params: Promise<{ styleId: string }> };

interface OrderSuggestionResult {
  suggestedQuantity: number;
  safetyStock: number;
  colorSizeRatio: { color: string; size: string };
  reasoning: string;
  risks: string[];
  replenishStrategy: string;
}

// 兜底建议（AI 不可用时返回的合理默认值）
function buildFallbackSuggestion(styleName?: string): OrderSuggestionResult {
  const suggestedQuantity = 200;
  const safetyStock = 40;
  return {
    suggestedQuantity,
    safetyStock,
    colorSizeRatio: {
      color: "主色 50%，辅色 30%，点缀色 20%",
      size: "S 20%，M 35%，L 30%，XL 15%",
    },
    reasoning:
      `AI 不可用，已使用保守默认值。建议${styleName || "该款式"}首单生产 ${suggestedQuantity} 件，` +
      `其中含 ${safetyStock} 件安全库存。请人工复核后确认。`,
    risks: ["AI 调用失败，缺少数据支撑", "建议人工评估市场情况后调整数量"],
    replenishStrategy: "首单保守备货，根据首周销售数据决定是否补货",
  };
}

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { styleId } = await params;

    // 1. 拉取款式基础信息
    const { data: style } = await dbAdmin
      .from("styles")
      .select("id, name, style_no, category, season, target_cost, actual_cost, description, ai_tags, ai_color_palette")
      .eq("id", styleId)
      .single();

    if (!style) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    // 2. 拉取最近 30 天历史销售数据
    const { data: salesHistory } = await dbAdmin
      .from("sales_records")
      .select("quantity, unit_price, total_amount, color, size, sale_date")
      .eq("style_id", styleId)
      .order("sale_date", { ascending: false })
      .limit(30);

    const totalSold = (salesHistory || []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const totalRevenue = (salesHistory || []).reduce(
      (s, r) => s + (Number(r.total_amount) || 0),
      0
    );

    // 3. 拉取最近一次 AI 测款结果
    const { data: aiTestResult } = await dbAdmin
      .from("ai_test_results")
      .select("test_score, feedback_count, feedback_summary, suggested_quantity")
      .eq("style_id", styleId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // 4. 拉取 BOM 单耗与成本（用于估算单件成本）
    const { data: bomItems } = await dbAdmin
      .from("bom_items")
      .select("material_name, unit_consumption, unit_price, material_type")
      .eq("style_id", styleId);

    const materialCost = (bomItems || []).reduce(
      (s, b) => s + (Number(b.unit_consumption) || 0) * (Number(b.unit_price) || 0),
      0
    );
    const unitCost = Number(style.actual_cost) || Number(style.target_cost) || materialCost || 0;

    // 5. 拉取当前库存（用于判断是否需要补货）
    const { data: inventory } = await dbAdmin
      .from("inventory_records")
      .select("quantity")
      .eq("style_id", styleId);
    const currentStock = (inventory || []).reduce(
      (s, r) => s + (Number(r.quantity) || 0),
      0
    );

    // 6. 构建 AI Prompt
    const colorPalette = Array.isArray(style.ai_color_palette)
      ? (style.ai_color_palette as string[]).join("、")
      : "未指定";

    const tags = Array.isArray(style.ai_tags)
      ? (style.ai_tags as string[]).join("、")
      : "未指定";

    const prompt = `你是服装品牌的备货决策专家。基于以下真实业务数据，给出首单生产建议。

款式信息：
- 款号：${style.style_no}
- 名称：${style.name}
- 品类：${style.category || "未指定"}
- 季节：${style.season || "未指定"}
- 单件成本：¥${unitCost.toFixed(2)}
- 描述：${style.description || "无"}
- AI 标签：${tags}
- AI 色卡：${colorPalette}

历史销售数据（最近 30 天）：
- 总销量：${totalSold} 件
- 总销售额：¥${totalRevenue.toFixed(2)}
- ${salesHistory && salesHistory.length > 0 ? "有真实销售记录" : "无销售记录（新款）"}

AI 测款结果：
- 测款分数：${aiTestResult?.test_score ?? "未测款"}
- 反馈数：${aiTestResult?.feedback_count ?? 0}
- 反馈摘要：${aiTestResult?.feedback_summary || "无"}

当前库存：${currentStock} 件

请严格以 JSON 输出，不要任何其他文字：
{
  "suggestedQuantity": <建议首单数量，整数>,
  "safetyStock": <安全库存，整数，一般为建议数量的 15%-25%>,
  "colorSizeRatio": {
    "color": "<颜色比例说明，例如：黑色40%、白色30%、灰色20%、其他10%>",
    "size": "<尺码比例说明，例如：S 20%、M 35%、L 30%、XL 15%>"
  },
  "reasoning": "决策依据（详细说明为何是这个数量，结合测款分数、销售数据、成本）",
  "risks": ["风险1", "风险2", "风险3"],
  "replenishStrategy": "补货策略说明"
}`;

    const raw = await generateText(
      prompt,
      "你是务实的备货决策专家，避免库存积压，宁可补货不可压货。"
    );

    const parsed = safeJsonParse<OrderSuggestionResult>(raw);

    // AI 失败时使用兜底
    const suggestion: OrderSuggestionResult = parsed
      ? {
          suggestedQuantity: Number(parsed.suggestedQuantity) || 200,
          safetyStock: Number(parsed.safetyStock) || 40,
          colorSizeRatio: parsed.colorSizeRatio || {
            color: "主色 50%，辅色 30%，点缀色 20%",
            size: "S 20%，M 35%，L 30%，XL 15%",
          },
          reasoning: parsed.reasoning || "AI 未输出决策依据",
          risks: Array.isArray(parsed.risks) ? parsed.risks : [],
          replenishStrategy: parsed.replenishStrategy || "首单保守备货",
        }
      : buildFallbackSuggestion(style.name);

    // 7. 写入 AI 建议表（待人工审核）
    await createAISuggestion({
      aiRoleLevel: AIRoleLevel.AI_SPECIALIST,
      specialistType: AISpecialistType.STOCKING_AI,
      processNode: "stocking",
      type: AISuggestionType.DECISION,
      priority: AISuggestionPriority.HIGH,
      title: `下单建议：${style.name} 首单 ${suggestion.suggestedQuantity} 件`,
      content:
        `${suggestion.reasoning}\n\n` +
        `建议数量：${suggestion.suggestedQuantity} 件（含安全库存 ${suggestion.safetyStock} 件）\n` +
        `色码比：${suggestion.colorSizeRatio.color}\n` +
        `尺码比：${suggestion.colorSizeRatio.size}\n\n` +
        `风险提示：\n${suggestion.risks.map((r) => "• " + r).join("\n")}\n\n` +
        `补货策略：${suggestion.replenishStrategy}`,
      proposedData: {
        styleId,
        suggestedQuantity: suggestion.suggestedQuantity,
        safetyStock: suggestion.safetyStock,
        colorSizeRatio: suggestion.colorSizeRatio,
        basedOn: {
          totalSold,
          totalRevenue,
          unitCost,
          currentStock,
          testScore: aiTestResult?.test_score ?? null,
        },
      },
      targetTable: "production_orders",
      targetId: styleId,
    });

    return NextResponse.json({
      ...suggestion,
      basedOn: {
        totalSold,
        totalRevenue,
        unitCost,
        currentStock,
        testScore: aiTestResult?.test_score ?? null,
      },
    });
  } catch (err) {
    console.error("[order-suggestion] error:", err);
    return NextResponse.json({ error: "获取建议失败" }, { status: 500 });
  }
}
