// 工作台首页聚合 API
// 一次返回：今日待办、逾期风险、款式进度、最近款式

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getTenantFromHeaders } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

const DEFAULT_BRAND = "00000000-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const headerTenant = getTenantFromHeaders(request);
    const brandId = url.searchParams.get("brandId") || headerTenant?.brand_id || DEFAULT_BRAND;
    const seasonId = url.searchParams.get("seasonId") || headerTenant?.season_id;

    // 1. 今日待办
    const { data: todos } = await supabase
      .from("todos")
      .select("*")
      .eq("brand_id", brandId)
      .eq("status", "pending")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20);

    // 2. 逾期待办（due_date < now 且 status = pending）
    const now = new Date().toISOString();
    const { data: overdueTodos } = await supabase
      .from("todos")
      .select("*")
      .eq("brand_id", brandId)
      .eq("status", "pending")
      .not("due_date", "is", null)
      .lt("due_date", now);

    // 3. 款式按状态分组统计
    const { data: allStyles } = await supabase
      .from("styles")
      .select("id, status, style_no, name, target_cost, actual_cost, season_id, updated_at, created_at")
      .eq("brand_id", brandId)
      .order("updated_at", { ascending: false });

    const stylesByStatus: Record<string, any[]> = {
      planning: [],
      designing: [],
      designed: [],
      sampling: [],
      sampled: [],
      producing: [],
      produced: [],
      selling: [],
      sold: [],
      reviewing: [],
      archived: [],
    };
    for (const s of allStyles || []) {
      if (stylesByStatus[s.status]) {
        stylesByStatus[s.status].push(s);
      }
    }

    // 4. 风险识别
    const risks: any[] = [];
    
    // 风险1：款式打样超过7天还在sampling
    const { data: stuckSamples } = await supabase
      .from("sampling_records")
      .select("id, style_id, sent_date, status, round, styles(style_no, name)")
      .eq("status", "pending");
    for (const s of stuckSamples || []) {
      if (s.sent_date) {
        const days = Math.floor((Date.now() - new Date(sentDateNormalize(s.sent_date)).getTime()) / (1000 * 60 * 60 * 24));
        if (days > 7) {
          risks.push({
            type: "warning",
            level: "high",
            title: `打样超时 ${days} 天`,
            message: `${(s as any).styles?.style_no || "未知"} 第 ${s.round} 轮打样已超期`,
            targetTable: "sampling_records",
            targetId: s.id,
            styleId: s.style_id,
          });
        }
      }
    }

    // 风险2：未完成的采购
    const { data: pendingProc } = await supabase
      .from("material_procurement")
      .select("id, style_id, expected_date, status, styles(style_no, name, status)")
      .in("status", ["pending", "ordered"]);
    for (const p of pendingProc || []) {
      if (p.expected_date) {
        const days = Math.floor((new Date(expectedDateNormalize(p.expected_date)).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        const styleStatus = (p as any).styles?.status;
        if (days < 0 && (styleStatus === "sampling" || styleStatus === "sampled" || styleStatus === "producing")) {
          risks.push({
            type: "error",
            level: "urgent",
            title: `采购逾期 ${Math.abs(days)} 天`,
            message: `${(p as any).styles?.style_no} 物料未到，将影响生产`,
            targetTable: "material_procurement",
            targetId: p.id,
            styleId: p.style_id,
          });
        } else if (days <= 3 && days >= 0) {
          risks.push({
            type: "warning",
            level: "medium",
            title: `采购即将到期`,
            message: `${(p as any).styles?.style_no} 物料预计 ${days} 天后到货`,
            targetTable: "material_procurement",
            targetId: p.id,
            styleId: p.style_id,
          });
        }
      }
    }

    // 风险3：实际成本超目标
    const overspendingStyles = (allStyles || []).filter(
      (s) => s.actual_cost && s.target_cost && s.actual_cost > s.target_cost
    );
    for (const s of overspendingStyles) {
      risks.push({
        type: "error",
        level: "high",
        title: `成本超支`,
        message: `${s.style_no} 实际成本 ¥${s.actual_cost} > 目标 ¥${s.target_cost}`,
        targetTable: "styles",
        targetId: s.id,
        styleId: s.id,
      });
    }

    // 5. 阶段统计
    const stageStats = {
      total: allStyles?.length || 0,
      byStage: Object.entries(stylesByStatus).map(([stage, items]) => ({
        stage,
        count: items.length,
      })),
    };

    // 6. 最近款式
    const recentStyles = (allStyles || []).slice(0, 6);

    return NextResponse.json({
      brand: { id: brandId, seasonId },
      summary: {
        totalStyles: allStyles?.length || 0,
        pendingTodos: todos?.length || 0,
        overdueCount: overdueTodos?.length || 0,
        highRiskCount: risks.filter((r) => r.level === "urgent" || r.level === "high").length,
      },
      todos: todos || [],
      overdueTodos: overdueTodos || [],
      risks,
      stageStats,
      recentStyles,
      stylesByStatus,
    });
  } catch (error) {
    console.error("工作台API失败:", error);
    return NextResponse.json({ error: "工作台数据获取失败" }, { status: 500 });
  }
}

function sentDateNormalize(d: any): string {
  if (typeof d === "string") return d;
  return new Date(d).toISOString();
}

function expectedDateNormalize(d: any): string {
  if (typeof d === "string") return d;
  return new Date(d).toISOString();
}
