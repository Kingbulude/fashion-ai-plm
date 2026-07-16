import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("material_procurement")
      .select("*, bom_items:bom_item_id(material_name, specification), suppliers:supplier_id(name)")
      .eq("style_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取采购记录失败" }, { status: 500 });
    }

    const procurement = (toCamelCase(data) || []) as any[];

    const bomRes = await supabase.from("bom_items").select("id, material_name, unit_consumption").eq("style_id", id);
    const bomItems = (toCamelCase(bomRes.data) || []) as any[];

    const fulfillment = bomItems.map((bom: any) => {
      const proc = procurement.find((p: any) => p.bomItemId === bom.id);
      return {
        bomId: bom.id,
        materialName: bom.materialName,
        requiredQuantity: bom.unitConsumption,
        status: proc?.status || "pending",
        receivedDate: proc?.actualDate || null,
        isFulfilled: proc?.status === "fully_received",
      };
    });

    const allFulfilled = fulfillment.every((f) => f.isFulfilled);
    const missingItems = fulfillment.filter((f) => !f.isFulfilled);

    return NextResponse.json({
      procurement,
      fulfillment,
      allFulfilled,
      missingItems: missingItems.length,
    });
  } catch {
    return NextResponse.json({ error: "获取采购记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { bomItemId, supplierId, status, orderDate, expectedDate, quantity, unitPrice } = body;

    if (!bomItemId || !quantity) {
      return NextResponse.json({ error: "物料项和数量不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("material_procurement")
      .insert({
        style_id: id,
        bom_item_id: bomItemId,
        supplier_id: supplierId || null,
        status: status || "pending",
        order_date: orderDate || null,
        expected_date: expectedDate || null,
        quantity: Number(quantity),
        unit_price: unitPrice ? Number(unitPrice) : null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建采购记录失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建采购记录失败" }, { status: 500 });
  }
}
