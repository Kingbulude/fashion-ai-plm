// 款式销售明细 API

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("sales")
      .select("*")
      .eq("style_id", id)
      .order("sale_date", { ascending: false });

    if (error) {
      return NextResponse.json({ sales: [] });
    }

    const rawSales = toCamelCase(data);
    const sales: any[] = Array.isArray(rawSales) ? rawSales : [];
    const totalRevenue = sales.reduce((s: number, r: any) => s + (r.amount || 0), 0);
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
