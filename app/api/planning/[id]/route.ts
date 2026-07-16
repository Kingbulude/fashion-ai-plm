import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase.from("planning").select("*").eq("id", id).single();
    if (error || !data) {
      return NextResponse.json({ error: "企划不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取企划失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { season, theme, category, targetCost, timeline, aiTrendAnalysis, inspirationTags } = body;

    const updateData: Record<string, unknown> = {};
    if (season !== undefined) updateData.season = season;
    if (theme !== undefined) updateData.theme = theme;
    if (category !== undefined) updateData.category = category;
    if (targetCost !== undefined) updateData.target_cost = Number(targetCost);
    if (timeline !== undefined) updateData.timeline = timeline;
    if (aiTrendAnalysis !== undefined) updateData.ai_trend_analysis = aiTrendAnalysis;
    if (inspirationTags !== undefined) updateData.inspiration_tags = inspirationTags;

    const { data, error } = await supabase.from("planning").update(updateData).eq("id", id).select().single();
    if (error || !data) {
      return NextResponse.json({ error: "企划不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新企划失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { error } = await supabase.from("planning").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "删除企划失败" }, { status: 500 });
    }
    return NextResponse.json({ message: "删除成功" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "删除企划失败" }, { status: 500 });
  }
}
