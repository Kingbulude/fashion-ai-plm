// 售后 API - 多品牌隔离
// 售后记录按款式 -> 品牌链路隔离

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
    let styleQuery = supabase.from("styles").select("id");
    if (brandId) styleQuery = styleQuery.eq("brand_id", brandId);
    if (seasonId) styleQuery = styleQuery.eq("season_id", seasonId);

    const { data: styles } = await styleQuery;
    const styleIds = (styles || []).map((s) => s.id);

    if (styleIds.length === 0) {
      return NextResponse.json({
        records: [],
        summary: { totalCount: 0, returnCount: 0, exchangeCount: 0, complaintCount: 0 },
      });
    }

    const { data, error } = await supabase
      .from("aftersales_records")
      .select("*, styles:style_id(name, style_no)")
      .in("style_id", styleIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取售后记录失败" }, { status: 500 });
    }

    const records = (toCamelCase(data) || []) as any[];

    const summary = {
      totalCount: records.length,
      returnCount: records.filter((r: any) => r.type === "return").length,
      exchangeCount: records.filter((r: any) => r.type === "exchange").length,
      complaintCount: records.filter((r: any) => r.type === "complaint").length,
    };

    return NextResponse.json({ records, summary });
  } catch {
    return NextResponse.json({ error: "获取售后记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { styleId, type, reason, quantity, amount, status, solution } = body;

    if (!styleId || !type || !reason) {
      return NextResponse.json({ error: "必填字段不能为空" }, { status: 400 });
    }

    // 从款式自动继承租户字段
    const { data: style } = await supabase
      .from("styles")
      .select("company_id, brand_id")
      .eq("id", styleId)
      .single();

    const { data, error } = await supabase
      .from("aftersales_records")
      .insert({
        style_id: styleId,
        company_id: style?.company_id || null,
        brand_id: style?.brand_id || null,
        type,
        reason,
        quantity: quantity ? Number(quantity) : 1,
        amount: amount ? Number(amount) : null,
        status: status || "pending",
        solution: solution || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建售后记录失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建售后记录失败" }, { status: 500 });
  }
}
