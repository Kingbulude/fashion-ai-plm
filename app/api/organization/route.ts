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
    let { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, name, avatar_url, role, role_level, company_id, brand_id")
      .eq("company_id", companyId);

    // 兜底：如果当前用户不在查询结果中（常见于 seed 数据未同步时），把自己加入列表
    const profileList = profiles || [];
    if (currentProfile && !profileList.some((p) => p.user_id === session.user.id)) {
      profileList.push({
        user_id: session.user.id,
        name: session.user.user_metadata?.name || session.user.email || "当前用户",
        avatar_url: session.user.user_metadata?.avatar_url || null,
        role: currentProfile.role_level || "",
        role_level: currentProfile.role_level || "",
        company_id: companyId,
        brand_id: null,
      });
    }

    // 获取用户-品牌关联
    const { data: userBrands } = await supabase
      .from("user_brands")
      .select("user_id, brand_id, role_level");

    // 获取用户-工序角色关联
    const { data: userProcessRoles } = await supabase
      .from("user_process_roles")
      .select("user_id, process_role_id");

    // 获取工序主管类型
    const { data: processOwnerScopes } = await supabase
      .from("process_owner_scopes")
      .select("id, key, name, description, process_nodes")
      .eq("is_active", true);

    // 获取用户-主管类型关联
    const { data: userProcessOwnerScopes } = await supabase
      .from("user_process_owner_scopes")
      .select("user_id, scope_id");

    return NextResponse.json({
      company,
      brands: brands || [],
      profiles: profileList,
      userBrands: userBrands || [],
      userProcessRoles: userProcessRoles || [],
      processOwnerScopes: processOwnerScopes || [],
      userProcessOwnerScopes: userProcessOwnerScopes || [],
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
    const { userId, roleLevel: newRoleLevel, brandIds, name, processRoleIds, processOwnerScopeId } = body;

    if (!userId) {
      return NextResponse.json({ error: "缺少用户ID" }, { status: 400 });
    }

    // 校验不能修改 BOSS 账号（除 BOSS 自己外）
    if (userId !== session.user.id) {
      const { data: targetProfile } = await supabase
        .from("profiles")
        .select("role_level")
        .eq("user_id", userId)
        .single();

      if (targetProfile?.role_level === RoleLevel.BOSS && roleLevel !== RoleLevel.BOSS) {
        return NextResponse.json({ error: "无权修改老板账号" }, { status: 403 });
      }
    }

    // 更新用户角色和姓名
    if (newRoleLevel !== undefined || name !== undefined) {
      const updatePayload: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };
      if (newRoleLevel !== undefined) updatePayload.role_level = newRoleLevel;
      if (name !== undefined) updatePayload.name = name;

      const { error: profileError } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("user_id", userId);

      if (profileError) throw profileError;
    }

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

    // 更新用户-工序角色关联
    if (processRoleIds && Array.isArray(processRoleIds)) {
      await supabase
        .from("user_process_roles")
        .delete()
        .eq("user_id", userId);

      if (processRoleIds.length > 0) {
        const insertData = processRoleIds.map((processRoleId: string) => ({
          user_id: userId,
          process_role_id: processRoleId,
          assigned_by: session.user.id,
        }));

        const { error: insertError } = await supabase
          .from("user_process_roles")
          .insert(insertData);

        if (insertError) throw insertError;
      }
    }

    // 更新用户-主管类型关联
    if (processOwnerScopeId !== undefined) {
      await supabase
        .from("user_process_owner_scopes")
        .delete()
        .eq("user_id", userId);

      if (processOwnerScopeId) {
        const { error: scopeError } = await supabase
          .from("user_process_owner_scopes")
          .insert({
            user_id: userId,
            scope_id: processOwnerScopeId,
            assigned_by: session.user.id,
          });

        if (scopeError) throw scopeError;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to assign role:", error);
    return NextResponse.json({ error: "Failed to assign role" }, { status: 500 });
  }
}
