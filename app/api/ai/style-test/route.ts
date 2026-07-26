import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { generateJson } from "@/lib/ai/json-generation";
import { createAISuggestion } from "@/lib/ai/suggestion-helper";
import { AIRoleLevel, AISpecialistType, AISuggestionType, AISuggestionPriority } from "@/lib/ai/architecture";

export const runtime = "edge";

interface StyleTestResult {
  marketAcceptance: number;
  marketAcceptanceReason: string;
  competitiveness: number;
  competitivenessReason: string;
  profitPotential: number;
  profitPotentialReason: string;
  trendAlignment: number;
  trendAlignmentReason: string;
  overallScore: number;
  summary: string;
  suggestions: string;
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const body = await request.json();
    const { styleId, styleName, category, price, season, targetAudience, designFeatures } = body;

    const prompt = `你是资深服装行业买手和趋势分析师。请对以下款式进行AI测款分析。

款式名称：${styleName}
品类：${category || "未指定"}
价格：¥${price || "未定价"}
季节：${season || "未指定"}
目标人群：${targetAudience || "大众"}
设计特点：${designFeatures || "未描述"}

请从以下维度进行专业分析并给出评分（0-100分），返回JSON格式：
{
  "marketAcceptance": 85,
  "marketAcceptanceReason": "市场接受度理由（50字内）",
  "competitiveness": 80,
  "competitivenessReason": "竞争力理由（50字内）",
  "profitPotential": 75,
  "profitPotentialReason": "利润潜力理由（50字内）",
  "trendAlignment": 90,
  "trendAlignmentReason": "趋势契合度理由（50字内）",
  "overallScore": 82,
  "summary": "综合评价（100字内）",
  "suggestions": "改进建议（100字内）"
}`;

    const fallback: StyleTestResult = {
      marketAcceptance: 70,
      marketAcceptanceReason: "基于款式基本信息的基本评估",
      competitiveness: 65,
      competitivenessReason: "需更多竞品数据进行精确评估",
      profitPotential: 60,
      profitPotentialReason: "价格定位合理，利润空间适中",
      trendAlignment: 68,
      trendAlignmentReason: "符合当季基本趋势要求",
      overallScore: 66,
      summary: "该款式整体表现中等，建议结合市场反馈进一步优化。",
      suggestions: "建议增加差异化设计元素，关注目标人群偏好，优化价格策略。",
    };

    const result = await generateJson<StyleTestResult>({
      prompt,
      systemPrompt: "你是服装行业测款分析专家，只输出合法JSON，不添加任何额外说明。",
      fallback,
    });

    const analysisText = `综合评分：${result.overallScore}分

市场接受度：${result.marketAcceptance}分 - ${result.marketAcceptanceReason}
竞争力：${result.competitiveness}分 - ${result.competitivenessReason}
利润潜力：${result.profitPotential}分 - ${result.profitPotentialReason}
趋势契合度：${result.trendAlignment}分 - ${result.trendAlignmentReason}

综合评价：${result.summary}

改进建议：${result.suggestions}`;

    if (styleId) {
      await supabase
        .from("styles")
        .update({ ai_test_result: analysisText })
        .eq("id", styleId);

      if (result.overallScore >= 80) {
        await createAISuggestion({
          aiRoleLevel: AIRoleLevel.AI_SPECIALIST,
          specialistType: AISpecialistType.TESTING_AI,
          processNode: "testing",
          type: AISuggestionType.ANALYSIS,
          priority: AISuggestionPriority.HIGH,
          title: `测款高分预警 - ${styleName}`,
          content: `款式"${styleName}"AI测款综合评分${result.overallScore}分，市场接受度${result.marketAcceptance}分，建议优先推进打样和上架。\n\n${result.summary}`,
          targetTable: "styles",
          targetId: styleId,
        });
      } else if (result.overallScore < 50) {
        await createAISuggestion({
          aiRoleLevel: AIRoleLevel.AI_SPECIALIST,
          specialistType: AISpecialistType.TESTING_AI,
          processNode: "testing",
          type: AISuggestionType.ALERT,
          priority: AISuggestionPriority.HIGH,
          title: `测款低分预警 - ${styleName}`,
          content: `款式"${styleName}"AI测款综合评分仅${result.overallScore}分，建议重新审视设计方案。\n\n${result.suggestions}`,
          targetTable: "styles",
          targetId: styleId,
        });
      }
    }

    return NextResponse.json({ analysis: analysisText, scores: result });
  } catch {
    return NextResponse.json({ error: "AI测款分析失败" }, { status: 500 });
  }
}
