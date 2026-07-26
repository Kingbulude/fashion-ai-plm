// 生产管理聚合 API
// 跨款式聚合所有生产订单 + 统计 + 风险检测

import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const url = new URL(request.url);
    const brandId = url.searchParams.get("brandId") || tenant.brand_id;
    const seasonId = url.searchParams.get("seasonId") || tenant.season_id;
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
          avgProductionDays: 0,
          onTimeDeliveryRate: 0,
          thisMonthQuantity: 0,
        },
        factoryStats: [],
        dailyTrend: [],
        qcStats: {
          total: 0,
          passed: 0,
          failed: 0,
          pending: 0,
          passRate: 0,
          byType: {},
          recent: [],
        },
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
    const factoryMap: Record<string, { orders: number; quantity: number; cost: number; completed: number; overdue: number }> = {};
    for (const o of filtered) {
      const f = o.factoryName || "未指定";
      if (!factoryMap[f]) factoryMap[f] = { orders: 0, quantity: 0, cost: 0, completed: 0, overdue: 0 };
      factoryMap[f].orders += 1;
      factoryMap[f].quantity += o.quantity || 0;
      factoryMap[f].cost += o.totalCost || 0;
      if (o.status === "completed") factoryMap[f].completed++;
      if (o.status !== "completed" && o.expectedDate && new Date(o.expectedDate) < now) factoryMap[f].overdue++;
    }
    const factoryStats = Object.entries(factoryMap)
      .map(([name, stat]) => ({
        name,
        ...stat,
        onTimeRate: stat.orders > 0 ? ((stat.orders - stat.overdue) / stat.orders) * 100 : 100,
      }))
      .sort((a, b) => b.cost - a.cost);

    // 生产趋势（近14天，按完成日期统计）
    const trendDays: Record<string, { completed: number; started: number; quantity: number }> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      trendDays[key] = { completed: 0, started: 0, quantity: 0 };
    }

    for (const o of orders) {
      // 完成的订单
      if (o.status === "completed" && o.completedAt) {
        const day = o.completedAt.split("T")[0];
        if (trendDays[day]) {
          trendDays[day].completed++;
          trendDays[day].quantity += o.quantity || 0;
        }
      }
      // 开始的订单
      if (o.startDate) {
        const day = o.startDate.split("T")[0];
        if (trendDays[day]) {
          trendDays[day].started++;
        }
      }
    }

    const dailyTrend = Object.entries(trendDays)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({
        date,
        dateLabel: date.split("-").slice(1).join("/"),
        ...v,
      }));

    // 质检统计（从qc_records表）
    let qcStats = {
      total: 0,
      passed: 0,
      failed: 0,
      pending: 0,
      passRate: 0,
      byType: {} as Record<string, number>,
      recent: [] as any[],
    };

    try {
      const { data: qcData } = await supabase
        .from("qc_records")
        .select("*")
        .in("style_id", styleIds)
        .order("created_at", { ascending: false })
        .limit(50);

      const rawQc = toCamelCase(qcData);
      const qcRecords: any[] = Array.isArray(rawQc) ? rawQc : [];

      if (qcRecords.length > 0) {
        const passed = qcRecords.filter((r) => r.result === "pass" || r.result === "passed").length;
        const failed = qcRecords.filter((r) => r.result === "fail" || r.result === "failed").length;
        const pending = qcRecords.filter((r) => r.result === "pending" || !r.result).length;

        const byType: Record<string, number> = {};
        for (const r of qcRecords) {
          const type = r.qcType || r.type || "其他";
          byType[type] = (byType[type] || 0) + 1;
        }

        qcStats = {
          total: qcRecords.length,
          passed,
          failed,
          pending,
          passRate: qcRecords.length > 0 ? (passed / qcRecords.length) * 100 : 0,
          byType,
          recent: qcRecords.slice(0, 10).map((r) => ({
            id: r.id,
            styleId: r.styleId,
            result: r.result,
            type: r.qcType || r.type,
            createdAt: r.createdAt,
            inspector: r.inspector,
          })),
        };
      }
    } catch (qcErr) {
      console.warn("获取质检数据失败:", qcErr);
    }

    // 生产效率分析
    const completedOrders = orders.filter((o) => o.status === "completed" && o.startDate && o.completedAt);
    let avgProductionDays = 0;
    let onTimeDeliveryRate = 0;

    if (completedOrders.length > 0) {
      const totalDays = completedOrders.reduce((sum: number, o: any) => {
        const start = new Date(o.startDate);
        const end = new Date(o.completedAt);
        return sum + Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
      }, 0);
      avgProductionDays = totalDays / completedOrders.length;

      const onTime = completedOrders.filter((o: any) => {
        if (!o.expectedDate) return true;
        return new Date(o.completedAt) <= new Date(o.expectedDate);
      }).length;
      onTimeDeliveryRate = (onTime / completedOrders.length) * 100;
    }

    // 本月产量统计
    const nowMonth = new Date().getMonth();
    const nowYear = new Date().getFullYear();
    const thisMonthCompleted = completedOrders.filter((o: any) => {
      const d = new Date(o.completedAt);
      return d.getMonth() === nowMonth && d.getFullYear() === nowYear;
    });
    const thisMonthQuantity = thisMonthCompleted.reduce((sum: number, o: any) => sum + (o.quantity || 0), 0);

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
        avgProductionDays: parseFloat(avgProductionDays.toFixed(1)),
        onTimeDeliveryRate: parseFloat(onTimeDeliveryRate.toFixed(1)),
        thisMonthQuantity,
      },
      factoryStats,
      dailyTrend,
      qcStats,
    });
  } catch {
    return NextResponse.json({ error: "获取生产数据失败" }, { status: 500 });
  }
}
