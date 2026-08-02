// 记录 AI 建议的后续结果（测款评分、销售额、退货率等）

import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { toCamelCase } from "@/lib/db/mappers";
import { validateBody, aiRecOutcomeSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;

    const { supabase } = ctx;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const validation = validateBody(aiRecOutcomeSchema, body);
    if (!validation.ok) return validation.response;
    const { styleId, outcomeType, outcomeValue } = validation.data;

    const { data: rec } = await supabase
      .from("ai_recommendations")
      .select("id")
      .eq("id", id)
      .single();

    if (!rec) {
      return NextResponse.json({ error: "建议不存在" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("ai_recommendation_outcomes")
      .insert({
        recommendation_id: id,
        style_id: styleId || null,
        outcome_type: outcomeType,
        outcome_value: outcomeValue !== undefined ? Number(outcomeValue) : null,
      })
      .select()
      .single();

    if (error) {
      console.error("[outcome] 创建结果记录失败:", error);
      return NextResponse.json({ error: "记录结果失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch (error: any) {
    console.error("[outcome] error:", error);
    return NextResponse.json({ error: error?.message || "记录结果失败" }, { status: 500 });
  }
}
