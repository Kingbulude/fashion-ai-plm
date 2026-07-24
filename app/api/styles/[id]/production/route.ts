import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { resolveStyleTenant, withTenant } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("production_orders")
      .select("*")
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
    const { quantity, status, schedule, startDate, expectedEndDate, factoryId, materialReady, colorSizeRatio, totalCost } = body;

    if (!quantity) {
      return NextResponse.json({ error: "订单数量不能为空" }, { status: 400 });
    }

    // 自动从款式继承租户字段
    const { tenant, error: tenantError } = await resolveStyleTenant(id);
    if (tenantError) {
      return NextResponse.json({ error: tenantError }, { status: 400 });
    }

    const orderNo = `PO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

    const { data, error } = await supabase
      .from("production_orders")
      .insert(
        withTenant(
          {
            style_id: id,
            order_no: orderNo,
            quantity: Number(quantity),
            status: status || "pending",
            schedule: schedule || null,
            start_date: startDate || null,
            expected_end_date: expectedEndDate || null,
            factory_id: factoryId || null,
            material_ready: materialReady === true,
            color_size_ratio: colorSizeRatio || null,
            total_cost: totalCost ? Number(totalCost) : null,
          },
          tenant
        )
      )
      .select()
      .single();

    if (error) {
      console.error("创建生产订单失败:", error);
      return NextResponse.json({ error: "创建生产订单失败", detail: error.message }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建生产订单失败" }, { status: 500 });
  }
}
