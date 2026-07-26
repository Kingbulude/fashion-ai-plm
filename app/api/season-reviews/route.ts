import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

const DEFAULT_COMPANY = "00000000-0000-0000-0000-000000000010";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;
    const brandId = tenant.brand_id;

    const { searchParams } = new URL(request.url);
    const seasonId = searchParams.get("seasonId");
    const status = searchParams.get("status");

    let query = supabase
      .from("season_reviews")
      .select("*")
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (brandId) query = query.eq("brand_id", brandId);
    if (seasonId) query = query.eq("season_id", seasonId);
    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(toCamelCase(data) || []);
  } catch {
    return NextResponse.json({ error: "获取季度复盘失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;
    const brandId = tenant.brand_id;

    const body = await request.json();
    const { action, seasonId, reviewType = "mid_season" } = body;

    if (action === "generate") {
      const result = await generateReview(supabase, companyId, brandId, seasonId, reviewType);
      return NextResponse.json(result);
    }

    const { seasonName, summary, highlights, issues, actionItems, kpiSummary, styleAnalysis, supplyChainAnalysis, overallScore, designFeedbackCount } = body;

    const { data, error } = await supabase
      .from("season_reviews")
      .insert({
        company_id: companyId,
        brand_id: brandId,
        season_id: seasonId || null,
        season_name: seasonName || "未命名复盘",
        review_type: reviewType,
        status: "draft",
        overall_score: overallScore || null,
        summary: summary || null,
        highlights: highlights || [],
        issues: issues || [],
        action_items: actionItems || [],
        kpi_summary: kpiSummary || {},
        style_analysis: styleAnalysis || {},
        supply_chain_analysis: supplyChainAnalysis || {},
        design_feedback_count: designFeedbackCount || 0,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建季度复盘失败" }, { status: 500 });
  }
}

async function generateReview(supabase: SupabaseClient, _companyId: string, brandId: string | undefined, seasonId: string | undefined, _reviewType: string) {
  let styleQuery = supabase
    .from("styles")
    .select("id, style_no, name, category, status, target_cost, actual_cost, target_quantity, produced_quantity, sold_quantity, season_id");

  if (brandId) styleQuery = styleQuery.eq("brand_id", brandId);
  if (seasonId) styleQuery = styleQuery.eq("season_id", seasonId);

  const { data: stylesData } = await styleQuery;
  const styles = (toCamelCase(stylesData) || []) as any[];
  const styleIds = styles.map((s) => s.id);

  if (styleIds.length === 0) {
    return {
      success: false,
      message: "该季度暂无款式数据",
    };
  }

  const [{ data: salesData }, { data: aftersalesData }, { data: procurementData }, { data: productionData }, { data: feedbackData }] = await Promise.all([
    supabase.from("sales_records").select("*").in("style_id", styleIds),
    supabase.from("aftersales_records").select("*").in("style_id", styleIds),
    supabase.from("material_procurement").select("*").in("style_id", styleIds),
    supabase.from("production_orders").select("*").in("style_id", styleIds),
    supabase.from("design_feedback_items").select("*").in("style_id", styleIds),
  ]);

  const sales = (toCamelCase(salesData) || []) as any[];
  const aftersales = (toCamelCase(aftersalesData) || []) as any[];
  const procurements = (toCamelCase(procurementData) || []) as any[];
  const production = (toCamelCase(productionData) || []) as any[];
  const designFeedback = (toCamelCase(feedbackData) || []) as any[];

  const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.totalAmount || 0), 0);
  const totalQuantity = sales.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);
  const totalOrders = sales.length;
  const avgSellingPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

  const targetTotal = styles.reduce((sum: number, s: any) => sum + (s.targetQuantity || 0), 0);
  const producedTotal = styles.reduce((sum: number, s: any) => sum + (s.producedQuantity || 0), 0);
  const soldTotal = styles.reduce((sum: number, s: any) => sum + (s.soldQuantity || 0), 0);
  const sellthroughRate = targetTotal > 0 ? (soldTotal / targetTotal) * 100 : 0;
  const productionRate = targetTotal > 0 ? (producedTotal / targetTotal) * 100 : 0;

  const costOverruns = styles.filter(
    (s: any) => s.actualCost && s.targetCost && s.actualCost > s.targetCost
  ).length;

  const returnCount = aftersales.filter((a: any) => a.type === "return").length;
  const returnRate = totalQuantity > 0 ? (returnCount / totalQuantity) * 100 : 0;

  const onTimeDelivery = production.filter((p: any) => {
    if (!p.expectedDate || !p.completedAt) return false;
    return new Date(p.completedAt) <= new Date(p.expectedDate);
  }).length;
  const onTimeRate = production.length > 0 ? (onTimeDelivery / production.length) * 100 : 0;

  const fullyProcured = procurements.filter((p: any) => p.status === "fully_received").length;
  const procurementRate = procurements.length > 0 ? (fullyProcured / procurements.length) * 100 : 0;

  const categoryStats: Record<string, { count: number; sold: number; revenue: number; target: number }> = {};
  for (const style of styles) {
    const cat = style.category || "未分类";
    if (!categoryStats[cat]) {
      categoryStats[cat] = { count: 0, sold: 0, revenue: 0, target: 0 };
    }
    categoryStats[cat].count++;
    categoryStats[cat].sold += style.soldQuantity || 0;
    categoryStats[cat].target += style.targetQuantity || 0;
  }
  for (const sale of sales) {
    const style = styles.find((s: any) => s.id === sale.styleId);
    if (style) {
      const cat = style.category || "未分类";
      if (categoryStats[cat]) {
        categoryStats[cat].revenue += sale.totalAmount || 0;
      }
    }
  }

  const topStyles = [...styles]
    .sort((a: any, b: any) => (b.soldQuantity || 0) - (a.soldQuantity || 0))
    .slice(0, 5)
    .map((s: any) => ({
      styleId: s.id,
      styleNo: s.styleNo,
      name: s.name,
      category: s.category,
      soldQuantity: s.soldQuantity || 0,
      targetQuantity: s.targetQuantity || 0,
      sellthroughRate: s.targetQuantity ? ((s.soldQuantity || 0) / s.targetQuantity) * 100 : 0,
    }));

  const poorPerformers = styles
    .filter((s: any) => s.targetQuantity && s.targetQuantity > 0 && (s.soldQuantity || 0) / s.targetQuantity < 0.3)
    .sort((a: any, b: any) => (a.soldQuantity || 0) / (a.targetQuantity || 1) - (b.soldQuantity || 0) / (b.targetQuantity || 1))
    .slice(0, 5)
    .map((s: any) => ({
      styleId: s.id,
      styleNo: s.styleNo,
      name: s.name,
      category: s.category,
      soldQuantity: s.soldQuantity || 0,
      targetQuantity: s.targetQuantity || 0,
      sellthroughRate: ((s.soldQuantity || 0) / s.targetQuantity) * 100,
    }));

  const highlights: { title: string; description: string; metric?: string }[] = [];
  const issues: { title: string; description: string; severity: string }[] = [];
  const actionItems: { title: string; description: string; priority: string; category: string }[] = [];

  if (sellthroughRate >= 60) {
    highlights.push({
      title: "整体售罄率良好",
      description: `本季整体售罄率达 ${sellthroughRate.toFixed(1)}%，超过 60% 目标线`,
      metric: `${sellthroughRate.toFixed(1)}%`,
    });
  } else if (sellthroughRate < 40) {
    issues.push({
      title: "整体售罄率偏低",
      description: `本季整体售罄率仅 ${sellthroughRate.toFixed(1)}%，低于 40%，需重点关注库存消化`,
      severity: "high",
    });
    actionItems.push({
      title: "推进滞销款促销",
      description: "对售罄率低于 30% 的款式制定促销方案，加快库存周转",
      priority: "high",
      category: "销售",
    });
  }

  if (topStyles.length > 0 && topStyles[0].sellthroughRate >= 80) {
    highlights.push({
      title: `爆款：${topStyles[0].name}`,
      description: `售罄率达 ${topStyles[0].sellthroughRate.toFixed(1)}%，可作为后续设计参考`,
      metric: `${topStyles[0].sellthroughRate.toFixed(1)}%`,
    });
  }

  if (costOverruns > 0) {
    issues.push({
      title: `${costOverruns} 款成本超支`,
      description: "建议复盘 BOM 结构和采购价格，优化成本控制",
      severity: costOverruns > styles.length * 0.3 ? "high" : "medium",
    });
    actionItems.push({
      title: "复盘成本超支款式",
      description: "分析成本超支原因，优化面料采购和生产工艺",
      priority: "medium",
      category: "供应链",
    });
  }

  if (returnRate > 5) {
    issues.push({
      title: `退货率 ${returnRate.toFixed(1)}% 偏高`,
      description: "建议加强品控和尺码准确性，降低售后退货",
      severity: "high",
    });
    actionItems.push({
      title: "分析退货原因并优化",
      description: "统计主要退货原因，针对性改进尺码版型和产品质量",
      priority: "high",
      category: "品质",
    });
  }

  if (onTimeRate < 80 && production.length > 0) {
    issues.push({
      title: `生产准交率 ${onTimeRate.toFixed(1)}%`,
      description: "大货交期延迟率较高，影响上新节奏",
      severity: "medium",
    });
    actionItems.push({
      title: "提升生产准交率",
      description: "加强供应商交期管理，提前规划生产排期",
      priority: "medium",
      category: "供应链",
    });
  }

  if (procurementRate < 70 && procurements.length > 0) {
    issues.push({
      title: `物料齐套率 ${procurementRate.toFixed(1)}%`,
      description: "物料采购到货率偏低，可能影响生产进度",
      severity: "medium",
    });
  }

  if (highlights.length === 0) {
    highlights.push({
      title: "本季已上架款式",
      description: `共 ${styles.length} 款产品投入市场，持续销售中`,
      metric: `${styles.length} 款`,
    });
  }

  if (actionItems.length === 0) {
    actionItems.push({
      title: "持续优化产品结构",
      description: "根据销售数据持续优化品类结构和选品策略",
      priority: "low",
      category: "企划",
    });
  }

  const feedbackByCategory: Record<string, number> = {};
  const feedbackBySeverity: Record<string, number> = {};
  const feedbackByStatus: Record<string, number> = {};
  for (const fb of designFeedback) {
    const cat = fb.defectCategory || "未分类";
    feedbackByCategory[cat] = (feedbackByCategory[cat] || 0) + 1;
    const sev = fb.severity || "minor";
    feedbackBySeverity[sev] = (feedbackBySeverity[sev] || 0) + 1;
    const stat = fb.status || "pending";
    feedbackByStatus[stat] = (feedbackByStatus[stat] || 0) + 1;
  }

  if (designFeedback.length > 0) {
    const criticalCount = feedbackBySeverity.critical || 0;
    if (criticalCount > 0) {
      issues.push({
        title: `${criticalCount} 条严重设计反馈`,
        description: "存在严重缺陷反馈，需立即处理并优化相关款式",
        severity: "high",
      });
      actionItems.push({
        title: "处理严重设计反馈",
        description: "优先处理严重级别的设计反馈，确保产品质量",
        priority: "high",
        category: "品质",
      });
    }
  }

  let overallScore = 60;
  if (sellthroughRate >= 70) overallScore += 15;
  else if (sellthroughRate >= 50) overallScore += 8;
  else if (sellthroughRate >= 30) overallScore += 3;

  if (returnRate <= 3) overallScore += 10;
  else if (returnRate <= 5) overallScore += 5;

  if (onTimeRate >= 90) overallScore += 10;
  else if (onTimeRate >= 70) overallScore += 5;

  if (costOverruns === 0) overallScore += 10;
  else if (costOverruns <= styles.length * 0.1) overallScore += 5;

  if (designFeedback.length > 0) {
    const resolvedRate = feedbackByStatus.resolved
      ? (feedbackByStatus.resolved / designFeedback.length) * 100
      : 0;
    if (resolvedRate >= 80) overallScore += 5;
    else if (resolvedRate < 50) overallScore -= 5;
  }

  overallScore = Math.min(overallScore, 100);

  const season = styles[0]?.seasonId ? await supabase.from("seasons").select("name").eq("id", styles[0].seasonId).single() : null;
  const seasonName = (season as any)?.data?.name || "本季度";

  const summary = `【${seasonName}】复盘总结：
本季共推出 ${styles.length} 款产品，实现销售额 ${(totalRevenue / 10000).toFixed(1)}万元，总销量 ${totalQuantity} 件。
整体售罄率 ${sellthroughRate.toFixed(1)}%，退货率 ${returnRate.toFixed(1)}%。
${highlights.length > 0 ? `亮点：${highlights.map((h) => h.title).join("、")}。` : ""}
${issues.length > 0 ? `待改进：${issues.map((i) => i.title).join("、")}。` : ""}
综合评分：${overallScore}分。`;

  return {
    success: true,
    seasonName,
    overallScore,
    summary,
    highlights,
    issues,
    actionItems,
    kpiSummary: {
      totalStyles: styles.length,
      totalRevenue,
      totalQuantity,
      totalOrders,
      avgSellingPrice,
      sellthroughRate: parseFloat(sellthroughRate.toFixed(1)),
      productionRate: parseFloat(productionRate.toFixed(1)),
      returnRate: parseFloat(returnRate.toFixed(2)),
      onTimeRate: parseFloat(onTimeRate.toFixed(1)),
      procurementRate: parseFloat(procurementRate.toFixed(1)),
      costOverrunCount: costOverruns,
    },
    styleAnalysis: {
      categoryStats,
      topStyles,
      poorPerformers,
    },
    supplyChainAnalysis: {
      totalProcurements: procurements.length,
      fullyReceived: fullyProcured,
      procurementRate: parseFloat(procurementRate.toFixed(1)),
      productionOrders: production.length,
      onTimeDelivery,
      onTimeRate: parseFloat(onTimeRate.toFixed(1)),
    },
    designFeedbackAnalysis: {
        totalFeedbacks: designFeedback.length,
        byCategory: feedbackByCategory,
        bySeverity: feedbackBySeverity,
        byStatus: feedbackByStatus,
        resolvedRate: designFeedback.length > 0
          ? (feedbackByStatus.resolved ? feedbackByStatus.resolved : 0) / designFeedback.length * 100
          : 0,
      },
      designFeedbackCount: designFeedback.length,
  };
}
