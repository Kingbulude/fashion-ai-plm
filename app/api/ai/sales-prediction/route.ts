import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { generateText } from "@/lib/ai/cloudflare-ai";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { styleId, styleName, category, price, season, targetAudience, initialStock } = body;

    const prompt = `你是一位资深的服装行业销售预测专家。请对以下款式进行销量预估：

款式名称：${styleName}
品类：${category}
价格：¥${price}
季节：${season}
目标人群：${targetAudience}
初始库存：${initialStock}件

请根据市场情况给出以下预测：
1. 首月预估销量
2. 整个销售周期预估总销量
3. 各颜色/尺码占比预测（如果适用）
4. 库存周转建议
5. 补货时机建议

请用简洁清晰的格式输出，不要使用markdown。`;

    const result = await generateText(prompt);

    if (styleId) {
      await supabase.from("styles").update({ sales_prediction: result }).eq("id", styleId);
    }

    return NextResponse.json({ prediction: result });
  } catch {
    return NextResponse.json({ error: "销量预估失败" }, { status: 500 });
  }
}
