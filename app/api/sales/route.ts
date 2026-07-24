// 销售 API - 多品牌隔离
// 销售记录按款式 -> 品牌链路隔离

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { getTenantFromHeaders } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const headerTenant = getTenantFromHeaders(request);
    const brandId = url.searchParams.get("brandId") || headerTenant?.brand_id;
    const seasonId = url.searchParams.get("seasonId") || headerTenant?.season_id;

    // 先获取本品牌的款式 ID
    let styleQuery = supabase.from("styles").select("id, category, season_id");
    if (brandId) styleQuery = styleQuery.eq("brand_id", brandId);
    if (seasonId) styleQuery = styleQuery.eq("season_id", seasonId);

    const { data: styles } = await styleQuery;
    const styleIds = (styles || []).map((s) => s.id);
    const styleMap: Record<string, any> = {};
    for (const s of styles || []) {
      styleMap[s.id] = s;
    }

    if (styleIds.length === 0) {
      return NextResponse.json({
        sales: [],
        summary: { totalRevenue: 0, totalQuantity: 0, totalOrders: 0, avgOrderValue: 0 },
      });
    }

    const { data, error } = await supabase
      .from("sales_records")
      .select("*, styles:style_id(name, category, style_no)")
      .in("style_id", styleIds)
      .order("sale_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取销售数据失败" }, { status: 500 });
    }

    const sales = (toCamelCase(data) || []) as any[];

    const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
    const totalQuantity = sales.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
    const totalOrders = sales.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    return NextResponse.json({
      sales,
      summary: { totalRevenue, totalQuantity, totalOrders, avgOrderValue },
    });
  } catch {
    return NextResponse.json({ error: "获取销售数据失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { styleId, saleDate, quantity, amount, unitPrice, color, size, channel, customerInfo } = body;

    if (!styleId || !saleDate || !quantity || !amount) {
      return NextResponse.json({ error: "必填字段不能为空" }, { status: 400 });
    }

    // 从款式自动继承租户字段
    const { data: style } = await supabase
      .from("styles")
      .select("company_id, brand_id, season_id")
      .eq("id", styleId)
      .single();

    const orderNo = `SO-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const qty = Number(quantity);
    const amt = Number(amount);
    const computedUnitPrice = unitPrice ? Number(unitPrice) : (qty > 0 ? amt / qty : 0);

    const { data, error } = await supabase
      .from("sales_records")
      .insert({
        style_id: styleId,
        company_id: style?.company_id || null,
        brand_id: style?.brand_id || null,
        season_id: style?.season_id || null,
        order_no: orderNo,
        sale_date: saleDate,
        quantity: qty,
        unit_price: computedUnitPrice,
        total_amount: amt,
        color: color || null,
        size: size || null,
        channel: channel || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建销售记录失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建销售记录失败" }, { status: 500 });
  }
}
