// 生产管理聚合 API
// 跨款式聚合所有生产订单 + 统计 + 风险检测

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
    const status = url.searchParams.get("status");
    const factory = url.searchParams.get("factory");

    // 先获取本品牌的款式 ID
    let styleQuery = supabase.from("styles").select("id, style_no, name, category");
    if (brandId) styleQuery = styleQuery.eq("brand_id", brandId);
    if (seasonId) styleQuery = styleQuery.eq("season_id", seasonId);

    const { data: styles } = await styleQuery;
    const rawStyles = toCamelCase(styles);
    const styleList: any[] = Array.isArray(rawStyles) ? rawStyles : [];
    const styleIds = styleList.map((s: any) => s.id);
    const styleMap: Record<string, any> = {};
    for (const s of styleList) styleMap[s.id] = s;

    if (styleIds.length === 0) {
      return NextResponse.json({
        orders: [],
        summary: {
          total: 0,
          totalQuantity: 0,
          totalCost: 0,
          inProgress: 0,
          completed: 0,
          pending: 0,
          overdue: 0,
        },
        factoryStats: [],
      });
    }

    // 获取所有生产订单
    const { data, error } = await supabase
      .from("production_orders")
      .select("*")
      .in("style_id", styleIds)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取生产订单失败" }, { status: 500 });
    }

    const orders: any[] = (Array.isArray(toCamelCase(data)) ? toCamelCase(data) : []) as any[];

    // 关联款式信息
    for (const o of orders) {
      const style = styleMap[o.styleId];
      if (style) {
        o.styleNo = style.styleNo;
        o.styleName = style.name;
        o.styleCategory = style.category;
      }
    }

    // 筛选
    let filtered = orders;
    if (status) {
      filtered = filtered.filter((o) => o.status === status);
    }
    if (factory) {
      filtered = filtered.filter((o) => o.factoryName === factory);
    }

    // 统计
    const total = filtered.length;
    const totalQuantity = filtered.reduce((s, o) => s + (o.quantity || 0), 0);
    const totalCost = filtered.reduce((s, o) => s + (o.totalCost || 0), 0);
    const inProgress = filtered.filter(
      (o) => o.status !== "completed" && o.status !== "pending"
    ).length;
    const completed = filtered.filter((o) => o.status === "completed").length;
    const pending = filtered.filter((o) => o.status === "pending").length;

    // 逾期订单（expectedDate 早于今天且未完成）
    const now = new Date();
    const overdue = filtered.filter((o) => {
      if (o.status === "completed") return false;
      if (!o.expectedDate) return false;
      return new Date(o.expectedDate) < now;
    }).length;

    // 加工厂统计
    const factoryMap: Record<string, { orders: number; quantity: number; cost: number }> = {};
    for (const o of filtered) {
      const f = o.factoryName || "未指定";
      if (!factoryMap[f]) factoryMap[f] = { orders: 0, quantity: 0, cost: 0 };
      factoryMap[f].orders += 1;
      factoryMap[f].quantity += o.quantity || 0;
      factoryMap[f].cost += o.totalCost || 0;
    }
    const factoryStats = Object.entries(factoryMap)
      .map(([name, stat]) => ({ name, ...stat }))
      .sort((a, b) => b.cost - a.cost);

    return NextResponse.json({
      orders: filtered,
      summary: {
        total,
        totalQuantity,
        totalCost,
        inProgress,
        completed,
        pending,
        overdue,
      },
      factoryStats,
    });
  } catch {
    return NextResponse.json({ error: "获取生产数据失败" }, { status: 500 });
  }
}
