import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("production_orders")
      .select("*, suppliers:factory_id(name)")
      .eq("style_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取生产订单失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch {
    return NextResponse.json({ error: "获取生产订单失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { factoryId, status, quantity, colorSizeRatio, materialReady, startDate, expectedEndDate } = body;

    if (!quantity) {
      return NextResponse.json({ error: "订单数量不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("production_orders")
      .insert({
        style_id: id,
        factory_id: factoryId || null,
        status: status || "pending",
        quantity: Number(quantity),
        color_size_ratio: colorSizeRatio || null,
        material_ready: materialReady || false,
        start_date: startDate || null,
        expected_end_date: expectedEndDate || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建生产订单失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建生产订单失败" }, { status: 500 });
  }
}
