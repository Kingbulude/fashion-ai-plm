import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

// 获取品牌列表（含季次信息）
export async function GET(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_id, role_level")
      .eq("user_id", session.user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json([]);
    }

    // 老板和管理员可以看所有品牌
    if (profile.role_level === RoleLevel.BOSS || profile.role_level === RoleLevel.ADMIN) {
      const { data: brands } = await supabase
        .from("brands")
        .select("*")
        .eq("company_id", profile.company_id);
      return NextResponse.json(brands || []);
    }

    // 其他角色只看关联的品牌
    const { data: userBrands } = await supabase
      .from("user_brands")
      .select("brand_id")
      .eq("user_id", session.user.id);

    if (!userBrands || userBrands.length === 0) {
      return NextResponse.json([]);
    }

    const brandIds = userBrands.map(ub => ub.brand_id);
    const { data: brands } = await supabase
      .from("brands")
      .select("*")
      .in("id", brandIds);

    return NextResponse.json(brands || []);
  } catch (error) {
    console.error("Failed to fetch brands:", error);
    return NextResponse.json([]);
  }
}

// 创建新品牌（仅老板/管理员）
export async function POST(request: Request) {
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

    const body = await request.json();
    const { name, logoUrl } = body;

    if (!name) {
      return NextResponse.json({ error: "品牌名称不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("brands")
      .insert({
        name,
        logo_url: logoUrl || null,
        company_id: profile.company_id,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to create brand:", error);
    return NextResponse.json({ error: "Failed to create brand" }, { status: 500 });
  }
}

// 更新品牌信息
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

    if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { id, name, logoUrl } = body;

    if (!id) {
      return NextResponse.json({ error: "缺少品牌ID" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("brands")
      .update({
        name,
        logo_url: logoUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to update brand:", error);
    return NextResponse.json({ error: "Failed to update brand" }, { status: 500 });
  }
}
