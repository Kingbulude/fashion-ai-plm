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
    const { id, procurementId } = await params;
    const body = await request.json();
    const { supplierId, status, orderDate, expectedDate, actualDate, quantity, unitPrice, receivedQuantity } = body;

    const updateData: Record<string, unknown> = {};
    if (supplierId !== undefined) updateData.supplier_id = supplierId;
    if (status !== undefined) updateData.status = status;
    if (orderDate !== undefined) updateData.order_date = orderDate;
    if (expectedDate !== undefined) updateData.expected_date = expectedDate;
    if (actualDate !== undefined) updateData.actual_date = actualDate;
    if (quantity !== undefined) updateData.order_quantity = Number(quantity);
    if (unitPrice !== undefined) updateData.unit_price = Number(unitPrice);
    if (receivedQuantity !== undefined) updateData.received_quantity = Number(receivedQuantity);

    // 如果状态变成全部到货，设置实际到货日期和收到数量
    if (status === "fully_received") {
      if (!updateData.actual_date) updateData.actual_date = new Date().toISOString().split("T")[0];
      if (receivedQuantity === undefined) {
        const existing = await supabase.from("material_procurement").select("order_quantity").eq("id", procurementId).single();
        if (existing.data) {
          updateData.received_quantity = existing.data.order_quantity;
        }
      }
      updateData.is_delayed = false;
      updateData.delay_days = 0;
    }

    // 如果设置了预计到货日期，计算延迟
    if (expectedDate && status !== "fully_received") {
      const today = new Date();
      const expected = new Date(expectedDate);
      if (today > expected) {
        const diffDays = Math.ceil((today.getTime() - expected.getTime()) / (1000 * 60 * 60 * 24));
        updateData.is_delayed = true;
        updateData.delay_days = diffDays;
      } else {
        updateData.is_delayed = false;
        updateData.delay_days = 0;
      }
    }

    const { data, error } = await supabase.from("material_procurement").update(updateData).eq("id", procurementId).select().single();
    if (error || !data) {
      return NextResponse.json({ error: "采购记录不存在" }, { status: 404 });
    }

    // 物料到货后检查是否齐套，齐套则关闭相关缺料预警待办
    if (status === "fully_received" || receivedQuantity !== undefined) {
      await checkAndCloseFulfillmentAlerts(id);
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新采购记录失败" }, { status: 500 });
  }
}

async function checkAndCloseFulfillmentAlerts(styleId: string) {
  try {
    const bomRes = await supabase.from("bom_items").select("id").eq("style_id", styleId);
    const bomItems = bomRes.data || [];
    const procRes = await supabase.from("material_procurement").select("status").in("bom_item_id", bomItems.map(b => b.id));
    const allReceived = procRes.data && procRes.data.length > 0 && procRes.data.every(p => p.status === "fully_received");
    
    if (allReceived) {
      await supabase
        .from("todos")
        .update({ status: "completed" })
        .eq("target_table", "styles")
        .eq("target_id", styleId)
        .eq("alert_type", "material_shortage")
        .eq("status", "pending");
    }
  } catch {
    // 静默处理
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
