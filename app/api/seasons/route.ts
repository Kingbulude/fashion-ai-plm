import { NextResponse } from "next/server";
import { RoleLevel } from "@/lib/auth/rbac";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

// 获取季次列表
export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const url = new URL(request.url);
    const brandId = url.searchParams.get("brand_id");

    if (!brandId) {
      return NextResponse.json({ data: [] });
    }

    const { data: seasons } = await supabase
      .from("seasons")
      .select("*")
      .eq("brand_id", brandId)
      .order("year", { ascending: false })
      .order("season_type", { ascending: false });

    return NextResponse.json({ data: seasons || [] });
  } catch (error) {
    console.error("Failed to fetch seasons:", error);
    return NextResponse.json([]);
  }
}

// 创建季次（仅老板/管理员/品牌负责人）
export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level")
      .eq("user_id", ctx.user.id)
      .single();

    const allowedRoles = [RoleLevel.BOSS, RoleLevel.ADMIN, RoleLevel.BRAND_MANAGER];
    if (!allowedRoles.includes(profile?.role_level as RoleLevel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { brandId, name, seasonType, year, startDate, endDate } = body;

    if (!brandId || !name || !seasonType || !year || !startDate || !endDate) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    // 创建新季次时，将同品牌其他季次设为非active
    await supabase
      .from("seasons")
      .update({ status: "locked" })
      .eq("brand_id", brandId)
      .eq("status", "active");

    const { data, error } = await supabase
      .from("seasons")
      .insert({
        brand_id: brandId,
        name,
        season_type: seasonType,
        year,
        start_date: startDate,
        end_date: endDate,
        status: "active",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to create season:", error);
    return NextResponse.json({ error: "Failed to create season" }, { status: 500 });
  }
}

// 更新季次（仅老板/管理员/品牌负责人）
export async function PUT(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level")
      .eq("user_id", ctx.user.id)
      .single();

    const allowedRoles = [RoleLevel.BOSS, RoleLevel.ADMIN, RoleLevel.BRAND_MANAGER];
    if (!allowedRoles.includes(profile?.role_level as RoleLevel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, seasonType, year, startDate, endDate, status } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少季次 ID" }, { status: 400 });
    }

    const updateData: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updateData.name = name;
    if (seasonType !== undefined) updateData.season_type = seasonType;
    if (year !== undefined) updateData.year = year;
    if (startDate !== undefined) updateData.start_date = startDate;
    if (endDate !== undefined) updateData.end_date = endDate;
    if (status !== undefined) updateData.status = status;

    // 如果要将某个季次设为 active，先把同品牌其他 active 季次锁定
    if (status === "active") {
      const { data: targetSeason } = await supabase
        .from("seasons")
        .select("brand_id")
        .eq("id", id)
        .single();
      if (targetSeason?.brand_id) {
        await supabase
          .from("seasons")
          .update({ status: "locked" })
          .eq("brand_id", targetSeason.brand_id)
          .eq("status", "active");
      }
    }

    const { data, error } = await supabase
      .from("seasons")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to update season:", error);
    return NextResponse.json({ error: "Failed to update season" }, { status: 500 });
  }
}

// 删除季次（仅老板/管理员/品牌负责人）
export async function DELETE(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level")
      .eq("user_id", ctx.user.id)
      .single();

    const allowedRoles = [RoleLevel.BOSS, RoleLevel.ADMIN, RoleLevel.BRAND_MANAGER];
    if (!allowedRoles.includes(profile?.role_level as RoleLevel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少季次 ID" }, { status: 400 });
    }

    const { error } = await supabase.from("seasons").delete().eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete season:", error);
    return NextResponse.json({ error: "Failed to delete season" }, { status: 500 });
  }
}
