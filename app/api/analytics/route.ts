// 经营反馈中心聚合 API
// 一次返回：KPI、销售趋势、品类占比、款式排行、售后分析、复盘建议

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
    const days = parseInt(url.searchParams.get("days") || "30"); // 趋势图默认 30 天

    // 1. 获取本品牌款式
    let styleQuery = supabase
      .from("styles")
      .select("id, style_no, name, category, season_id, target_cost, actual_cost, status, target_quantity, produced_quantity, sold_quantity");
    if (brandId) styleQuery = styleQuery.eq("brand_id", brandId);
    if (seasonId) styleQuery = styleQuery.eq("season_id", seasonId);

    const { data: styles } = await styleQuery;
    const styleList = (toCamelCase(styles) || []) as any[];
    const styleIds = styleList.map((s) => s.id);
    const styleMap: Record<string, any> = {};
    for (const s of styleList) styleMap[s.id] = s;

    if (styleIds.length === 0) {
      return NextResponse.json({
        brand: { id: brandId, seasonId },
        kpi: {
          totalRevenue: 0,
          totalQuantity: 0,
          totalOrders: 0,
          avgOrderValue: 0,
          avgSellingPrice: 0,
          returnRate: 0,
          stylesOnSale: 0,
          activeSellRate: 0,
        },
        trend: [],
        categoryBreakdown: [],
        topStylesByRevenue: [],
        topStylesByQuantity: [],
        channelBreakdown: [],
        aftersales: { total: 0, byType: {} },
        sellthrough: {
          styles: [],
          distribution: { excellent: 0, good: 0, fair: 0, low: 0 },
          deadStockStyles: [],
          avgSellthroughRate: 0,
        },
        insights: [],
      });
    }

    // 2. 销售数据
    const { data: salesData } = await supabase
      .from("sales_records")
      .select("*")
      .in("style_id", styleIds);
    const sales = (toCamelCase(salesData) || []) as any[];

    // 3. 售后数据
    const { data: aftersalesData } = await supabase
      .from("aftersales_records")
      .select("*")
      .in("style_id", styleIds);
    const aftersales = (toCamelCase(aftersalesData) || []) as any[];

    // 4. KPI 计算
    const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
    const totalQuantity = sales.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
    const totalOrders = sales.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
    const avgSellingPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;
    const returnCount = aftersales.filter((a: any) => a.type === "return").length;
    const returnRate = totalQuantity > 0 ? (returnCount / totalQuantity) * 100 : 0;
    const stylesOnSale = styleList.filter((s) => s.status === "selling" || s.status === "sold" || s.status === "reviewing").length;

    // 5. 销售趋势（按日）
    const now = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const dailyMap: Record<string, { revenue: number; quantity: number; orders: number }> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i + 1);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = { revenue: 0, quantity: 0, orders: 0 };
    }
    for (const s of sales) {
      if (!s.saleDate) continue;
      const day = s.saleDate.split("T")[0];
      if (dailyMap[day]) {
        dailyMap[day].revenue += s.totalAmount || 0;
        dailyMap[day].quantity += s.quantity || 0;
        dailyMap[day].orders += 1;
      }
    }
    const trend = Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, ...v }));

    // 6. 品类销售占比
    const categoryMap: Record<string, { revenue: number; quantity: number }> = {};
    for (const s of sales) {
      const style = styleMap[s.styleId];
      if (!style) continue;
      const cat = style.category || "未分类";
      if (!categoryMap[cat]) categoryMap[cat] = { revenue: 0, quantity: 0 };
      categoryMap[cat].revenue += s.totalAmount || 0;
      categoryMap[cat].quantity += s.quantity || 0;
    }
    const categoryBreakdown = Object.entries(categoryMap)
      .map(([category, v]) => ({ category, ...v }))
      .sort((a, b) => b.revenue - a.revenue);

    // 7. 款式销售排行
    const styleRevenue: Record<string, { revenue: number; quantity: number; orders: number }> = {};
    for (const s of sales) {
      if (!styleRevenue[s.styleId]) {
        styleRevenue[s.styleId] = { revenue: 0, quantity: 0, orders: 0 };
      }
      styleRevenue[s.styleId].revenue += s.totalAmount || 0;
      styleRevenue[s.styleId].quantity += s.quantity || 0;
      styleRevenue[s.styleId].orders += 1;
    }
    const topStylesByRevenue = Object.entries(styleRevenue)
      .map(([id, v]) => ({
        styleId: id,
        styleNo: styleMap[id]?.styleNo,
        name: styleMap[id]?.name,
        category: styleMap[id]?.category,
        ...v,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);

    const topStylesByQuantity = [...topStylesByRevenue]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // 8. 渠道分布
    const channelMap: Record<string, number> = {};
    for (const s of sales) {
      const ch = s.channel || "其他";
      channelMap[ch] = (channelMap[ch] || 0) + (s.totalAmount || 0);
    }
    const channelBreakdown = Object.entries(channelMap)
      .map(([channel, revenue]) => ({ channel, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    // 9. 售后分析
    const aftersalesByType: Record<string, number> = {};
    for (const a of aftersales) {
      aftersalesByType[a.type] = (aftersalesByType[a.type] || 0) + 1;
    }

    // 10. 售罄率与动销分析（结构化数据）
    const sellthroughStyles = styleList
      .filter((s) => s.targetQuantity && s.targetQuantity > 0)
      .map((s) => {
        const sold = s.soldQuantity || 0;
        const target = s.targetQuantity || 0;
        const produced = s.producedQuantity || 0;
        const sellthroughRate = target > 0 ? (sold / target) * 100 : 0;
        const productionAchievement = target > 0 ? (produced / target) * 100 : 0;
        let tier = "low";
        if (sellthroughRate >= 80) tier = "excellent";
        else if (sellthroughRate >= 50) tier = "good";
        else if (sellthroughRate >= 30) tier = "fair";
        return {
          styleId: s.id,
          styleNo: s.styleNo,
          name: s.name,
          category: s.category || "未分类",
          status: s.status,
          targetQuantity: target,
          producedQuantity: produced,
          soldQuantity: sold,
          remainingQuantity: Math.max(0, produced - sold),
          sellthroughRate: parseFloat(sellthroughRate.toFixed(1)),
          productionAchievement: parseFloat(productionAchievement.toFixed(1)),
          tier,
        };
      })
      .sort((a, b) => b.sellthroughRate - a.sellthroughRate);

    // 售罄率分层统计
    const sellthroughDistribution = {
      excellent: sellthroughStyles.filter((s) => s.tier === "excellent").length,
      good: sellthroughStyles.filter((s) => s.tier === "good").length,
      fair: sellthroughStyles.filter((s) => s.tier === "fair").length,
      low: sellthroughStyles.filter((s) => s.tier === "low").length,
    };

    // 动销率：有销售记录的款式数 / 在售款式数
    const stylesWithSales = new Set(sales.map((s: any) => s.styleId)).size;
    const activeSellRate = stylesOnSale > 0 ? (stylesWithSales / stylesOnSale) * 100 : 0;

    // 滞销款（在售但销量为0或极低）
    const deadStockStyles = sellthroughStyles
      .filter((s) => s.sellthroughRate < 10 && (s.status === "selling" || s.status === "reviewing"))
      .sort((a, b) => a.sellthroughRate - b.sellthroughRate);

    // 11. 复盘建议（数据驱动）
    const insights: { type: "warning" | "success" | "info"; title: string; description: string }[] = [];

    // 售罄率分析
    const lowSellthrough = styleList.filter((s) => {
      if (!s.targetQuantity || s.status !== "selling") return false;
      const sold = s.soldQuantity || 0;
      return sold / s.targetQuantity < 0.3;
    });
    if (lowSellthrough.length > 0) {
      insights.push({
        type: "warning",
        title: `${lowSellthrough.length} 款售罄率不足 30%`,
        description: `建议关注：${lowSellthrough.slice(0, 3).map((s) => s.name).join("、")} 等款式销售情况`,
      });
    }

    // 高售罄率
    const highSellthrough = styleList.filter((s) => {
      if (!s.targetQuantity) return false;
      const sold = s.soldQuantity || 0;
      return sold / s.targetQuantity >= 0.8;
    });
    if (highSellthrough.length > 0) {
      insights.push({
        type: "success",
        title: `${highSellthrough.length} 款售罄率超 80%`,
        description: `可考虑追单：${highSellthrough.slice(0, 3).map((s) => s.name).join("、")}`,
      });
    }

    // 成本超支款式
    const costOverruns = styleList.filter(
      (s) => s.actualCost && s.targetCost && s.actualCost > s.targetCost
    );
    if (costOverruns.length > 0) {
      insights.push({
        type: "warning",
        title: `${costOverruns.length} 款成本超支`,
        description: "建议复盘 BOM 和供应链成本",
      });
    }

    // 退货率过高
    if (returnRate > 5) {
      insights.push({
        type: "warning",
        title: `退货率 ${returnRate.toFixed(1)}% 偏高`,
        description: "建议分析售后记录中的主要退货原因",
      });
    }

    // 渠道集中度
    if (channelBreakdown.length > 0 && channelBreakdown[0].revenue / totalRevenue > 0.8) {
      insights.push({
        type: "info",
        title: `${channelBreakdown[0].channel} 渠道占比超 80%`,
        description: "渠道集中度较高，建议拓展其他销售渠道",
      });
    }

    // 没有销售数据
    if (sales.length === 0) {
      insights.push({
        type: "info",
        title: "暂无销售数据",
        description: "导入销售记录后即可查看经营分析",
      });
    }

    const avgSellthroughRate =
      sellthroughStyles.length > 0
        ? parseFloat(
            (sellthroughStyles.reduce((sum, s) => sum + s.sellthroughRate, 0) / sellthroughStyles.length).toFixed(1)
          )
        : 0;

    return NextResponse.json({
      brand: { id: brandId, seasonId },
      kpi: {
        totalRevenue,
        totalQuantity,
        totalOrders,
        avgOrderValue,
        avgSellingPrice,
        returnRate: parseFloat(returnRate.toFixed(2)),
        stylesOnSale,
        activeSellRate: parseFloat(activeSellRate.toFixed(1)),
      },
      trend,
      categoryBreakdown,
      topStylesByRevenue,
      topStylesByQuantity,
      channelBreakdown,
      aftersales: {
        total: aftersales.length,
        byType: aftersalesByType,
      },
      sellthrough: {
        styles: sellthroughStyles,
        distribution: sellthroughDistribution,
        deadStockStyles,
        avgSellthroughRate,
      },
      insights,
      period: { days, startDate: startDate.toISOString(), endDate: now.toISOString() },
    });
  } catch (err) {
    console.error("分析 API 失败:", err);
    return NextResponse.json({ error: "经营数据获取失败" }, { status: 500 });
  }
}
