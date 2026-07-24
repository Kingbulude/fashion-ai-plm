// 款式状态机 API
// 列出可用转换 / 执行状态转换

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import {
  StyleStatus,
  getAvailableTransitions,
  STYLE_TRANSITIONS,
} from "@/lib/workflow/style-state-machine";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

// GET: 获取当前款式的可用转换列表
export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data: style } = await supabase
      .from("styles")
      .select("status")
      .eq("id", id)
      .single();

    if (!style) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    const currentStatus = style.status as StyleStatus;
    const available = getAvailableTransitions(currentStatus);

    // 获取关联数据完成度
    const [assets, techPacks, boms, productions, procurements, inventories] = await Promise.all([
      supabase.from("design_assets").select("id", { count: "exact", head: true }).eq("style_id", id),
      supabase.from("tech_packs").select("id", { count: "exact", head: true }).eq("style_id", id),
      supabase.from("bom_items").select("id", { count: "exact", head: true }).eq("style_id", id),
      supabase.from("production_orders").select("id", { count: "exact", head: true }).eq("style_id", id),
      supabase.from("material_procurement").select("status").eq("style_id", id),
      supabase.from("inventory_records").select("id", { count: "exact", head: true }).eq("style_id", id),
    ]);

    return NextResponse.json({
      currentStatus,
      available,
      completion: {
        design_assets: assets.count || 0,
        tech_packs: techPacks.count || 0,
        bom_items: boms.count || 0,
        production_orders: productions.count || 0,
        procurements: procurements.data?.length || 0,
        procurements_complete: procurements.data?.filter((p) => p.status === "fully_received").length || 0,
        inventory_records: inventories.count || 0,
      },
    });
  } catch {
    return NextResponse.json({ error: "获取状态机失败" }, { status: 500 });
  }
}

// POST: 执行状态转换
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { toStatus, event, comment } = body;

    if (!toStatus || !event) {
      return NextResponse.json({ error: "缺少目标状态或事件" }, { status: 400 });
    }

    // 动态导入避免 Edge Runtime 问题
    const { transitionStyle } = await import("@/lib/workflow/style-transition");
    const { data: style } = await supabase
      .from("styles")
      .select("status, company_id, brand_id")
      .eq("id", id)
      .single();

    if (!style) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    const result = await transitionStyle({
      styleId: id,
      fromStatus: style.status as StyleStatus,
      toStatus: toStatus as StyleStatus,
      event,
      comment,
      userId: session.user.id,
      brandId: style.brand_id,
    });

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      newStatus: result.newStatus,
      createdTodoId: result.createdTodoId,
    });
  } catch (error) {
    console.error("状态转换失败:", error);
    return NextResponse.json({ error: "状态转换失败" }, { status: 500 });
  }
}
