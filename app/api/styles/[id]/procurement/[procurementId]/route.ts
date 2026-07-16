import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string; procurementId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { procurementId } = await params;
    const { data, error } = await supabase.from("material_procurement").select("*").eq("id", procurementId).single();
    if (error || !data) {
      return NextResponse.json({ error: "采购记录不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取采购记录失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { procurementId } = await params;
    const body = await request.json();
    const { supplierId, status, orderDate, expectedDate, actualDate, quantity, unitPrice } = body;

    const updateData: Record<string, unknown> = {};
    if (supplierId !== undefined) updateData.supplier_id = supplierId;
    if (status !== undefined) updateData.status = status;
    if (orderDate !== undefined) updateData.order_date = orderDate;
    if (expectedDate !== undefined) updateData.expected_date = expectedDate;
    if (actualDate !== undefined) updateData.actual_date = actualDate;
    if (quantity !== undefined) updateData.quantity = Number(quantity);
    if (unitPrice !== undefined) updateData.unit_price = Number(unitPrice);

    const { data, error } = await supabase.from("material_procurement").update(updateData).eq("id", procurementId).select().single();
    if (error || !data) {
      return NextResponse.json({ error: "采购记录不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新采购记录失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { procurementId } = await params;
    const { error } = await supabase.from("material_procurement").delete().eq("id", procurementId);
    if (error) {
      return NextResponse.json({ error: "删除采购记录失败" }, { status: 500 });
    }
    return NextResponse.json({ message: "删除成功" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "删除采购记录失败" }, { status: 500 });
  }
}
