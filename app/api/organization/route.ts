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

    // 兼容 email 列未迁移的旧环境
    const selectProfiles = async (filter: { company_id?: string; company_id_is_null?: boolean }) => {
      const baseSelect =
        "user_id, name, avatar_url, role, role_level, company_id, brand_id";
      let query = supabase.from("profiles").select(baseSelect);
      if (filter.company_id_is_null) {
        query = query.is("company_id", null);
      } else if (filter.company_id) {
        query = query.eq("company_id", filter.company_id);
      }
      const baseResult = await query;

      if (baseResult.error) {
        console.error("selectProfiles base query error:", baseResult.error);
        return { data: null, error: baseResult.error };
      }

      let data = baseResult.data || [];

      if (data.length > 0) {
        try {
          const emailResult = await supabase
            .from("profiles")
            .select("user_id, email")
            .in(
              "user_id",
              data.map((p) => p.user_id)
            );

          if (emailResult.error) {
            console.error("selectProfiles email query error:", emailResult.error);
          } else if (emailResult.data) {
            const emailMap = new Map(emailResult.data.map((e) => [e.user_id, e.email]));
            data = data.map((p: any) => ({
              ...p,
              email: emailMap.get(p.user_id) || null,
            }));
          }
        } catch (err) {
          console.error("selectProfiles email fetch failed:", err);
        }
      }

      return { data, error: null };
    };

    // 获取公司所有用户资料
    const profilesResult = await selectProfiles({ company_id: companyId });
    if (profilesResult.error) {
      return NextResponse.json(
        { error: "查询公司成员失败", detail: profilesResult.error.message, code: profilesResult.error.code },
        { status: 500 }
      );
    }
    const profiles = profilesResult.data || [];

    // 获取已注册但尚未分配到公司的待选用户
    const pendingResult = await selectProfiles({ company_id_is_null: true });
    if (pendingResult.error) {
      return NextResponse.json(
        { error: "查询待分配用户失败", detail: pendingResult.error.message, code: pendingResult.error.code },
        { status: 500 }
      );
    }
    const pendingProfiles = pendingResult.data || [];

    // 兜底：如果当前用户不在查询结果中（常见于 seed 数据未同步时），把自己加入列表
    const profileList = profiles || [];
    if (currentProfile && !profileList.some((p) => p.user_id === session.user.id)) {
      profileList.push({
        user_id: session.user.id,
        name: session.user.user_metadata?.name || session.user.email || "当前用户",
        email: session.user.email || null,
        avatar_url: session.user.user_metadata?.avatar_url || null,
        role: currentProfile.role_level || "",
        role_level: currentProfile.role_level || "",
        company_id: companyId,
        brand_id: null,
      } as any);
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
      pendingProfiles: pendingProfiles || [],
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
      .select("role_level, company_id")
      .eq("user_id", session.user.id)
      .single();

    const roleLevel = currentProfile?.role_level;
    const companyId = currentProfile?.company_id;
    if (roleLevel !== RoleLevel.BOSS && roleLevel !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "当前用户未绑定公司" }, { status: 400 });
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

    // 更新用户角色、姓名和公司（用于分配待选用户）
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

    // 分配待选用户到公司（company_id 为 null 时）
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .single();

    if (!targetProfile?.company_id) {
      const { error: assignCompanyError } = await supabase
        .from("profiles")
        .update({ company_id: companyId, updated_at: new Date().toISOString() })
        .eq("user_id", userId);

      if (assignCompanyError) throw assignCompanyError;
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
