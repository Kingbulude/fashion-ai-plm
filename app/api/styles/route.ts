import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const { styleNo, name, season, category, description, targetCost, status } = body;
    
    if (!styleNo || !name) {
      return NextResponse.json({ error: "款号和款式名称不能为空" }, { status: 400 });
    }

    const { data: existing } = await supabase.from("styles").select("id").eq("style_no", styleNo);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "款号已存在" }, { status: 400 });
    }

    const { data, error } = await supabase.from("styles").insert({
      style_no: styleNo,
      name,
      season,
      category,
      description,
      target_cost: targetCost ? Number(targetCost) : null,
      status: status || "planning",
    }).select().single();

    if (error) {
      return NextResponse.json({ error: "创建款式失败" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "创建款式失败" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const { data, error } = await supabase.from("styles").select("*").order("created_at", { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: "获取款式列表失败" }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "获取款式列表失败" }, { status: 500 });
  }
}
