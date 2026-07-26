import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { data, error } = await supabase
      .from("planning")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取企划数据失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch {
    return NextResponse.json({ error: "获取企划数据失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const body = await request.json();
    const { season, theme, category, targetCost, timeline, aiTrendAnalysis, inspirationTags } = body;

    if (!season || !theme) {
      return NextResponse.json({ error: "季节和主题不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("planning")
      .insert({
        season,
        theme,
        category: category || null,
        target_cost: targetCost ? Number(targetCost) : null,
        timeline: timeline || null,
        ai_trend_analysis: aiTrendAnalysis || null,
        inspiration_tags: inspirationTags || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建企划失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建企划失败" }, { status: 500 });
  }
}
