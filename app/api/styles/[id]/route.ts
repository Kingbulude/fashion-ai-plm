import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const { data, error } = await supabase.from("styles").select("*").eq("id", id).single();

    if (error || !data) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取款式信息失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { styleNo, name, season, category, description, targetCost, actualCost, status } = body;

    if (!styleNo || !name) {
      return NextResponse.json({ error: "款号和款式名称不能为空" }, { status: 400 });
    }

    const { data: existing } = await supabase.from("styles").select("id").eq("style_no", styleNo);
    if (existing && existing.length > 0 && existing[0].id !== id) {
      return NextResponse.json({ error: "款号已存在" }, { status: 400 });
    }

    const { data, error } = await supabase.from("styles").update({
      style_no: styleNo,
      name,
      season,
      category,
      description,
      target_cost: targetCost ? Number(targetCost) : null,
      actual_cost: actualCost ? Number(actualCost) : null,
      status: status || "planning",
      updated_at: new Date(),
    }).eq("id", id).select().single();

    if (error || !data) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新款式失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const { error } = await supabase.from("styles").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: "删除款式失败" }, { status: 500 });
    }

    return NextResponse.json({ message: "删除成功" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "删除款式失败" }, { status: 500 });
  }
}
