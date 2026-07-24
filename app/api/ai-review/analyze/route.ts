// AI 审核深度分析 API
// 对单个审核项调用 Cloudflare AI 进行深度问题分析与改进建议

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { generateJson } from "@/lib/ai/json-generation";

export const runtime = "edge";

interface AIAnalysisResult {
  riskLevel: "high" | "medium" | "low";
  rootCauses: string[];
  recommendations: { action: string; priority: string; expectedImpact: string }[];
  estimatedCostImpact: string;
  aiSummary: string;
}

function buildFallback(item: any): AIAnalysisResult {
  return {
    riskLevel: item.priority === "urgent" ? "high" : item.priority === "high" ? "medium" : "low",
    rootCauses: (item.issues || []).map((i: string) => i),
    recommendations: (item.suggestions || []).map((s: string) => ({
      action: s,
      priority: "medium",
      expectedImpact: "改善当前问题",
    })),
    estimatedCostImpact: item.totalCost && item.targetCost
      ? `当前成本 ¥${item.totalCost}，目标 ¥${item.targetCost}，偏差 ${(((item.totalCost - item.targetCost) / item.targetCost) * 100).toFixed(1)}%`
      : "暂无成本数据",
    aiSummary: `基于规则检测发现 ${(item.issues || []).length} 个问题，建议尽快处理以避免影响后续流程。`,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { reviewItem } = body as { reviewItem: any };

    if (!reviewItem || !reviewItem.type || !reviewItem.styleId) {
      return NextResponse.json({ error: "缺少审核项数据" }, { status: 400 });
    }

    // 拉取关联数据用于 AI 分析上下文
    let contextData: Record<string, any> = {};
    try {
      if (reviewItem.type === "design") {
        const { data: assets } = await supabase
          .from("style_assets")
          .select("*")
          .eq("style_id", reviewItem.styleId)
          .order("created_at", { ascending: false })
          .limit(5);
        const { data: style } = await supabase
          .from("styles")
          .select("style_no, name, category, ai_tags, ai_color_palette")
          .eq("id", reviewItem.styleId)
          .single();
        contextData = { assets: assets || [], style: style || {} };
      } else if (reviewItem.type === "bom") {
        const { data: bomItems } = await supabase
          .from("bom_items")
          .select("*")
          .eq("style_id", reviewItem.styleId);
        const { data: style } = await supabase
          .from("styles")
          .select("style_no, name, target_cost, actual_cost")
          .eq("id", reviewItem.styleId)
          .single();
        contextData = { bomItems: bomItems || [], style: style || {} };
      } else if (reviewItem.type === "techpack") {
        const { data: techPacks } = await supabase
          .from("tech_packs")
          .select("*")
          .eq("style_id", reviewItem.styleId)
          .limit(3);
        contextData = { techPacks: techPacks || [] };
      } else if (reviewItem.type === "sampling") {
        const { data: sampling } = await supabase
          .from("sampling_records")
          .select("*")
          .eq("style_id", reviewItem.styleId)
          .order("created_at", { ascending: false })
          .limit(5);
        contextData = { sampling: sampling || [] };
      }
    } catch (ctxErr) {
      console.warn("AI 审核上下文获取失败，使用审核项自带数据:", ctxErr);
    }

    const fallback = buildFallback(reviewItem);

    const prompt = `你是一位资深服装 PLM 审核专家。请对以下审核项进行深度分析。

审核项信息：
- 类型：${reviewItem.type}
- 标题：${reviewItem.title}
- 款式：${reviewItem.styleName || reviewItem.styleNo || reviewItem.styleId}
- 已发现问题：${(reviewItem.issues || []).join("；")}
- 现有建议：${(reviewItem.suggestions || []).join("；")}
${reviewItem.totalCost ? `- BOM 总成本：¥${reviewItem.totalCost}` : ""}
${reviewItem.targetCost ? `- 目标成本：¥${reviewItem.targetCost}` : ""}

关联数据上下文：
${JSON.stringify(contextData).slice(0, 1500)}

请输出 JSON：
{
  "riskLevel": "high" | "medium" | "low",
  "rootCauses": ["根本原因1", "根本原因2"],
  "recommendations": [
    { "action": "具体行动", "priority": "high|medium|low", "expectedImpact": "预期影响" }
  ],
  "estimatedCostImpact": "成本影响描述",
  "aiSummary": "50-100 字的 AI 总结分析"
}`;

    const analysis = await generateJson<AIAnalysisResult>({
      prompt,
      systemPrompt: "你是服装行业 PLM 资深审核专家，擅长设计稿、BOM、工艺包、打样的质量与成本审核。只输出合法 JSON。",
      fallback,
      onError: (err) => console.warn("AI 审核深度分析失败，使用 fallback:", err),
    });

    return NextResponse.json({ analysis, reviewItemId: reviewItem.id });
  } catch (err) {
    return NextResponse.json({ error: "AI 审核分析失败" }, { status: 500 });
  }
}
