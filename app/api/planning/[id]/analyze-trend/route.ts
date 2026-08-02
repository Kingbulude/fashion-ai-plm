import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai/cloudflare-ai";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { validateBody, planningTrendAnalyzeSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const validation = validateBody(planningTrendAnalyzeSchema, body);
    if (!validation.ok) return validation.response;
    const { season, theme } = validation.data;

    const prompt = `你是一位资深的服装行业趋势分析师。请针对以下企划进行趋势分析：

季节：${season}
主题：${theme}

请从以下几个维度进行分析：
1. 色彩趋势预测（3-5种流行色及搭配建议）
2. 面料趋势预测（2-3种推荐面料）
3. 款式风格建议（适合的设计风格）
4. 目标人群画像
5. 市场竞争分析要点

请用简洁清晰的格式输出，不要使用markdown。`;

    const result = await generateText(prompt);

    await supabase.from("planning").update({ ai_trend_analysis: result }).eq("id", id);

    return NextResponse.json({ analysis: result });
  } catch {
    return NextResponse.json({ error: "AI趋势分析失败" }, { status: 500 });
  }
}
