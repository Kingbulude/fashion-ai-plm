import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

// 获取季次列表
export async function GET(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const brandId = url.searchParams.get("brand_id");

    if (!brandId) {
      return NextResponse.json([]);
    }

    const { data: seasons } = await supabase
      .from("seasons")
      .select("*")
      .eq("brand_id", brandId)
      .order("year", { ascending: false })
      .order("season_type", { ascending: false });

    return NextResponse.json(seasons || []);
  } catch (error) {
    console.error("Failed to fetch seasons:", error);
    return NextResponse.json([]);
  }
}

// 创建季次（仅老板/管理员/品牌负责人）
export async function POST(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level")
      .eq("user_id", session.user.id)
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

// 锁定季次（仅老板/管理员/品牌负责人）
export async function PUT(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level")
      .eq("user_id", session.user.id)
      .single();

    const allowedRoles = [RoleLevel.BOSS, RoleLevel.ADMIN, RoleLevel.BRAND_MANAGER];
    if (!allowedRoles.includes(profile?.role_level as RoleLevel)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("seasons")
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
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
