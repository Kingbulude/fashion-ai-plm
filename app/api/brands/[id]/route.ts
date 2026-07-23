// 品牌详情 API
// 包含基本信息 + 品牌 DNA + 款式统计

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    // 1. 品牌基本信息
    const { data: brandData, error: brandErr } = await supabase
      .from("brands")
      .select("*")
      .eq("id", id)
      .single();

    if (brandErr || !brandData) {
      return NextResponse.json({ error: "品牌不存在" }, { status: 404 });
    }

    // 2. 品牌 DNA
    const { data: dnaData } = await supabase
      .from("brand_dna")
      .select("*")
      .eq("brand_id", id)
      .maybeSingle();

    // 3. 季节列表
    const { data: seasonsData } = await supabase
      .from("seasons")
      .select("*")
      .eq("brand_id", id)
      .order("year", { ascending: false });

    // 4. 款式统计
    const { data: stylesData } = await supabase
      .from("styles")
      .select("id, status, season_id")
      .eq("brand_id", id);

    const rawStyles = toCamelCase(stylesData);
    const styles: any[] = Array.isArray(rawStyles) ? rawStyles : [];

    // 按状态统计
    const stageStats: Record<string, number> = {};
    for (const s of styles) {
      const st = s.status || "planning";
      stageStats[st] = (stageStats[st] || 0) + 1;
    }

    // 按季节统计
    const seasonStyles: Record<string, number> = {};
    for (const s of styles) {
      if (s.seasonId) {
        seasonStyles[s.seasonId] = (seasonStyles[s.seasonId] || 0) + 1;
      }
    }

    return NextResponse.json({
      brand: toCamelCase(brandData),
      dna: dnaData ? toCamelCase(dnaData) : null,
      seasons: Array.isArray(toCamelCase(seasonsData)) ? toCamelCase(seasonsData) : [],
      stats: {
        totalStyles: styles.length,
        stageStats,
        seasonStyles,
      },
    });
  } catch {
    return NextResponse.json({ error: "获取品牌详情失败" }, { status: 500 });
  }
}

// 更新品牌（仅老板/管理员）
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level, company_id")
      .eq("user_id", session.user.id)
      .single();

    if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();
    const { name, logo_url } = body;

    // 校验该品牌是否属于当前公司
    const { data: brand } = await supabase
      .from("brands")
      .select("company_id")
      .eq("id", id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: "品牌不存在" }, { status: 404 });
    }

    if (brand.company_id !== profile.company_id) {
      return NextResponse.json({ error: "无权修改其他公司的品牌" }, { status: 403 });
    }

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (name !== undefined) updatePayload.name = name.trim();
    if (logo_url !== undefined) updatePayload.logo_url = logo_url ? logo_url.trim() : null;

    const { data, error } = await supabase
      .from("brands")
      .update(updatePayload)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ brand: toCamelCase(data) });
  } catch (error) {
    console.error("Failed to update brand:", error);
    return NextResponse.json(
      { error: "Failed to update brand", detail: (error as Error).message },
      { status: 500 }
    );
  }
}

// 删除品牌（仅老板/管理员）
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level, company_id")
      .eq("user_id", session.user.id)
      .single();

    if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id } = await params;

    // 先校验该品牌是否属于当前公司
    const { data: brand } = await supabase
      .from("brands")
      .select("company_id")
      .eq("id", id)
      .single();

    if (!brand) {
      return NextResponse.json({ error: "品牌不存在" }, { status: 404 });
    }

    if (brand.company_id !== profile.company_id) {
      return NextResponse.json({ error: "无权删除其他公司的品牌" }, { status: 403 });
    }

    // 删除品牌（关联表大多配置了 ON DELETE CASCADE）
    const { error } = await supabase.from("brands").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete brand:", error);
    return NextResponse.json(
      { error: "Failed to delete brand", detail: (error as Error).message },
      { status: 500 }
    );
  }
}
