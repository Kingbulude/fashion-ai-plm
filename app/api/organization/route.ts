import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel, RoleLevelLabels } from "@/lib/auth/rbac";

export const runtime = "edge";

// 获取公司架构（公司→品牌→用户）
export async function GET(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 获取用户的公司
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("company_id, role_level")
      .eq("user_id", session.user.id)
      .single();

    const companyId = currentProfile?.company_id;

    if (!companyId) {
      return NextResponse.json({ companies: [], brands: [], users: [] });
    }

    // 获取公司信息
    const { data: company } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    // 获取品牌列表
    const { data: brands } = await supabase
      .from("brands")
      .select("*")
      .eq("company_id", companyId);

    // 获取公司所有用户资料
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url, role, role_level, company_id, brand_id")
      .eq("company_id", companyId);

    // 获取用户-品牌关联
    const { data: userBrands } = await supabase
      .from("user_brands")
      .select("user_id, brand_id, role_level");

    return NextResponse.json({
      company,
      brands: brands || [],
      profiles: profiles || [],
      userBrands: userBrands || [],
      roleLabels: RoleLevelLabels,
    });
  } catch (error) {
    console.error("Failed to fetch organization:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization" },
      { status: 500 }
    );
  }
}

// 分配用户角色和品牌
export async function POST(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 检查是否有权限分配（仅老板/管理员）
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role_level")
      .eq("user_id", session.user.id)
      .single();

    const roleLevel = currentProfile?.role_level;
    if (roleLevel !== RoleLevel.BOSS && roleLevel !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, roleLevel: newRoleLevel, brandIds, name } = body;

    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    // 更新用户角色
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        role_level: newRoleLevel || RoleLevel.EXECUTOR,
        name: name,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (profileError) throw profileError;

    // 更新用户-品牌关联（先删除旧的，再插入新的）
    if (brandIds && Array.isArray(brandIds)) {
      await supabase
        .from("user_brands")
        .delete()
        .eq("user_id", userId);

      if (brandIds.length > 0) {
        const insertData = brandIds.map((brandId: string) => ({
          user_id: userId,
          brand_id: brandId,
          role_level: newRoleLevel || RoleLevel.EXECUTOR,
        }));

        const { error: insertError } = await supabase
          .from("user_brands")
          .insert(insertData);

        if (insertError) throw insertError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to assign role:", error);
    return NextResponse.json({ error: "Failed to assign role" }, { status: 500 });
  }
}
