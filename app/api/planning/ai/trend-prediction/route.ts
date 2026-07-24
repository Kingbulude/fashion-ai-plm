import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";
import { generateJsonArray } from "@/lib/ai/json-generation";
import { AIRoleLevel, AISpecialistType, AISuggestionType, AISuggestionPriority } from "@/lib/ai/architecture";
import { createAISuggestion } from "@/lib/ai/suggestion-helper";

export const runtime = "edge";

interface TrendItem {
  trend: string;
  description: string;
  confidence: number;
  impact: "high" | "medium" | "low";
}

const FALLBACK_TRENDS: TrendItem[] = [
  { trend: "极简主义回归", description: "简约线条、中性色调成为主流，消费者追求百搭单品", confidence: 92, impact: "high" },
  { trend: "可持续面料", description: "环保面料、再生材料需求持续增长，消费者关注环保议题", confidence: 88, impact: "medium" },
  { trend: "复古混搭", description: "90年代风格回潮，oversize剪裁与现代元素融合", confidence: 85, impact: "high" },
  { trend: "功能性设计", description: "舒适与功能并重，透气、防皱等功能面料应用增多", confidence: 80, impact: "medium" },
  { trend: "数字化印花", description: "AI生成图案、数字艺术印花成为新亮点", confidence: 78, impact: "medium" },
];

export async function POST(request: Request) {
  try {
    const { season, category } = await request.json();

    const trends = await generateJsonArray<TrendItem>({
      prompt: `你是一位资深服装行业趋势分析师。请为「${season || "下一季"}」的「${category || "全品类"}」女装市场生成 5 个高置信度趋势洞察。

输出格式要求为 JSON 数组，每个元素包含：
{
  "trend": "趋势名称",
  "description": "趋势描述，30-60 字",
  "confidence": 70-95 之间的整数,
  "impact": "high" | "medium" | "low"
}`,
      systemPrompt: "你是服装行业趋势分析专家，熟悉每季时装周、社媒热点和消费者偏好变化。只输出合法 JSON 数组。",
      fallback: FALLBACK_TRENDS,
      onError: (err) => console.warn("趋势预测 AI 生成失败，使用 fallback:", err),
    });

    await supabase.from("planning_ai_results").insert([{
      planning_id: null,
      skill_type: "trend_prediction",
      skill_name: "趋势预测",
      result: { trends, season, category },
      confidence_score: Math.round(trends.reduce((sum, t) => sum + (t.confidence || 0), 0) / Math.max(trends.length, 1)),
    }]);

    const suggestionContent = trends
      .filter(t => (t.confidence || 0) >= 85)
      .map(t => `【${t.trend}】(置信度${t.confidence}%)
${t.description}
影响程度：${t.impact === "high" ? "高" : t.impact === "medium" ? "中" : "低"}`)
      .join("\n\n");

    await createAISuggestion({
      aiRoleLevel: AIRoleLevel.AI_SPECIALIST,
      specialistType: AISpecialistType.PLANNING_AI,
      processNode: "planning",
      type: AISuggestionType.PREDICTION,
      priority: AISuggestionPriority.HIGH,
      title: `${season || "最新季次"}趋势预测 - ${category || "全品类"}`,
      content: `AI企划专员基于市场数据分析，发现以下高置信度趋势：\n\n${suggestionContent}\n\n建议在企划阶段重点参考这些趋势方向。`,
      proposedData: { trends, season, category },
      targetTable: "planning_ai_results",
    });

    return NextResponse.json({ trends, confidence: Math.round(trends.reduce((sum, t) => sum + (t.confidence || 0), 0) / Math.max(trends.length, 1)) });
  } catch (err) {
    return NextResponse.json({ error: "趋势预测失败" }, { status: 500 });
  }
}
