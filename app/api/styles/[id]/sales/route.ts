// 款式销售明细 API

import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const { data, error } = await supabase
      .from("sales_records")
      .select("*")
      .eq("style_id", id)
      .order("sale_date", { ascending: false });

    if (error) {
      return NextResponse.json({ sales: [] });
    }

    const rawSales = toCamelCase(data);
    const sales: any[] = Array.isArray(rawSales) ? rawSales : [];
    const totalRevenue = sales.reduce((s: number, r: any) => s + (r.totalAmount || 0), 0);
    const totalQuantity = sales.reduce((s: number, r: any) => s + (r.quantity || 0), 0);

    return NextResponse.json({
      sales,
      totalRevenue,
      totalQuantity,
      totalOrders: sales.length,
    });
  } catch {
    return NextResponse.json({ sales: [] });
  }
}
