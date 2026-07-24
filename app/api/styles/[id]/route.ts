import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { getSession } from "@/lib/auth/supabase";
import { hasPermission, Permission, RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

// 获取当前用户可访问的品牌 ID 列表
async function getAllowedBrandIds(sessionUserId: string, roleLevel: string | null, companyId: string | null): Promise<string[]> {
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
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role_level")
      .eq("user_id", session.user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "未加入公司" }, { status: 400 });
    }

    const allowedBrandIds = await getAllowedBrandIds(session.user.id, profile.role_level, profile.company_id);

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
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role_level")
      .eq("user_id", session.user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "未加入公司" }, { status: 400 });
    }

    if (!hasPermission(profile.role_level || "", Permission.EDIT)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedBrandIds = await getAllowedBrandIds(session.user.id, profile.role_level, profile.company_id);

    const body = await request.json();

    const { styleNo, name, season, category, description, targetCost, actualCost, status } = body;

    if (!styleNo || !name) {
      return NextResponse.json({ error: "款号和款式名称不能为空" }, { status: 400 });
    }

    // 校验目标款式是否在可访问品牌内
    const { data: existingStyle } = await supabase
      .from("styles")
      .select("id, brand_id, style_no")
      .eq("id", id)
      .single();

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

    const { data, error } = await supabase.from("styles").update({
      style_no: styleNo,
      name,
      season,
      category,
      description,
      target_cost: targetCost ? Number(targetCost) : null,
      actual_cost: actualCost ? Number(actualCost) : null,
      status: status || "planning",
      updated_at: new Date(),
    }).eq("id", id).in("brand_id", allowedBrandIds).select().single();

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
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role_level")
      .eq("user_id", session.user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({ error: "未加入公司" }, { status: 400 });
    }

    if (!hasPermission(profile.role_level || "", Permission.DELETE)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedBrandIds = await getAllowedBrandIds(session.user.id, profile.role_level, profile.company_id);

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
