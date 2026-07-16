import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { generateText } from "@/lib/ai/cloudflare-ai";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { styleId, styleName, category, price, season, targetAudience, designFeatures } = body;

    const prompt = `你是一位资深的服装行业买手和趋势分析师。请对以下款式进行AI测款分析：

款式名称：${styleName}
品类：${category}
价格：¥${price}
季节：${season}
目标人群：${targetAudience}
设计特点：${designFeatures}

请从以下维度进行专业分析并给出评分（0-100分）：
1. 市场接受度评分及理由
2. 竞争力评分及理由
3. 利润潜力评分及理由
4. 流行趋势契合度评分及理由

最后给出综合评分和改进建议。

请用简洁清晰的格式输出，不要使用markdown。`;

    const result = await generateText(prompt);

    if (styleId) {
      await supabase.from("styles").update({ ai_test_result: result }).eq("id", styleId);
    }

    return NextResponse.json({ analysis: result });
  } catch {
    return NextResponse.json({ error: "AI测款分析失败" }, { status: 500 });
  }
}
