import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { hasPermission, Permission, RoleLevel } from "@/lib/auth/rbac";
import { canTransitionTo, type StyleStatus } from "@/lib/workflow/style-state-machine";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

// 获取当前用户可访问的品牌 ID 列表
async function getAllowedBrandIds(
  supabase: SupabaseClient,
  sessionUserId: string,
  roleLevel: string | null,
  companyId: string | null
): Promise<string[]> {
  if (!companyId) return [];

  if (roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN) {
    const { data: brands } = await supabase
      .from("brands")
      .select("id")
      .eq("company_id", companyId);
    return (brands || []).map((b: any) => b.id);
  }

  const { data: ub } = await supabase
    .from("user_brands")
    .select("brand_id")
    .eq("user_id", sessionUserId);
  return (ub || []).map((x: any) => x.brand_id);
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase, user, tenant, roleLevel } = ctx;

    const { id } = await params;

    if (!tenant.company_id) {
      return NextResponse.json({ error: "未加入公司" }, { status: 400 });
    }

    const allowedBrandIds = await getAllowedBrandIds(supabase, user.id, roleLevel, tenant.company_id);

    const { data, error } = await supabase
      .from("styles")
      .select("*")
      .eq("id", id)
      .in("brand_id", allowedBrandIds)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取款式信息失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase, user, tenant, roleLevel } = ctx;

    const { id } = await params;

    if (!tenant.company_id) {
      return NextResponse.json({ error: "未加入公司" }, { status: 400 });
    }

    if (!hasPermission(roleLevel || "", Permission.EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedBrandIds = await getAllowedBrandIds(supabase, user.id, roleLevel, tenant.company_id);

    const body = await request.json();

    const { styleNo, name, season, category, description, targetCost, actualCost, status } = body;

    if (!styleNo || !name) {
      return NextResponse.json({ error: "款号和款式名称不能为空" }, { status: 400 });
    }

    // 校验目标款式是否在可访问品牌内
    const { data: existingStyle } = await supabase
      .from("styles")
      .select("id, brand_id, style_no, status")
      .eq("id", id)
      .maybeSingle();

    if (!existingStyle || !allowedBrandIds.includes(existingStyle.brand_id)) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    // 款号唯一性检查（排除当前款式，仅在本品牌内）
    const { data: existing } = await supabase
      .from("styles")
      .select("id")
      .eq("brand_id", existingStyle.brand_id)
      .eq("style_no", styleNo);
    if (existing && existing.length > 0 && existing[0].id !== id) {
      return NextResponse.json({ error: "款号已存在" }, { status: 400 });
    }

    // 状态机校验：若请求包含 status 且与当前状态不同，必须为合法转换
    const currentStatus = existingStyle.status as StyleStatus;
    const targetStatus = (status as StyleStatus) || currentStatus;
    if (status && !canTransitionTo(currentStatus, targetStatus)) {
      return NextResponse.json(
        { error: `非法状态流转：${currentStatus} → ${targetStatus}` },
        { status: 409 }
      );
    }

    // 仅更新提供的字段；未传 status 时保持原状态（避免误重置为 planning）
    const updatePayload: Record<string, unknown> = {
      style_no: styleNo,
      name,
      season,
      category,
      description,
      target_cost: targetCost ? Number(targetCost) : null,
      actual_cost: actualCost ? Number(actualCost) : null,
      updated_at: new Date(),
    };
    if (status) {
      updatePayload.status = targetStatus;
    }

    const { data, error } = await supabase.from("styles").update(updatePayload).eq("id", id).in("brand_id", allowedBrandIds).select().maybeSingle();

    if (error || !data) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新款式失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase, user, tenant, roleLevel } = ctx;

    const { id } = await params;

    if (!tenant.company_id) {
      return NextResponse.json({ error: "未加入公司" }, { status: 400 });
    }

    if (!hasPermission(roleLevel || "", Permission.DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedBrandIds = await getAllowedBrandIds(supabase, user.id, roleLevel, tenant.company_id);

    // 校验目标款式是否在可访问品牌内
    const { data: existingStyle } = await supabase
      .from("styles")
      .select("id, brand_id")
      .eq("id", id)
      .single();

    if (!existingStyle || !allowedBrandIds.includes(existingStyle.brand_id)) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    const { error } = await supabase
      .from("styles")
      .delete()
      .eq("id", id)
      .in("brand_id", allowedBrandIds);

    if (error) {
      return NextResponse.json({ error: "删除款式失败" }, { status: 500 });
    }

    return NextResponse.json({ message: "删除成功" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "删除款式失败" }, { status: 500 });
  }
}
