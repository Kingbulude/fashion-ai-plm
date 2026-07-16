import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string; orderId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { orderId } = await params;
    const { data, error } = await supabase.from("production_orders").select("*").eq("id", orderId).single();
    if (error || !data) {
      return NextResponse.json({ error: "生产订单不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取生产订单失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { orderId } = await params;
    const body = await request.json();
    const { factoryId, status, quantity, colorSizeRatio, materialReady, startDate, expectedEndDate, actualEndDate } = body;

    const updateData: Record<string, unknown> = {};
    if (factoryId !== undefined) updateData.factory_id = factoryId;
    if (status !== undefined) updateData.status = status;
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (colorSizeRatio !== undefined) updateData.color_size_ratio = colorSizeRatio;
    if (materialReady !== undefined) updateData.material_ready = materialReady;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (expectedEndDate !== undefined) updateData.expected_end_date = expectedEndDate;
    if (actualEndDate !== undefined) updateData.actual_end_date = actualEndDate;

    const { data, error } = await supabase.from("production_orders").update(updateData).eq("id", orderId).select().single();
    if (error || !data) {
      return NextResponse.json({ error: "生产订单不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新生产订单失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { orderId } = await params;
    const { error } = await supabase.from("production_orders").delete().eq("id", orderId);
    if (error) {
      return NextResponse.json({ error: "删除生产订单失败" }, { status: 500 });
    }
    return NextResponse.json({ message: "删除成功" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "删除生产订单失败" }, { status: 500 });
  }
}
