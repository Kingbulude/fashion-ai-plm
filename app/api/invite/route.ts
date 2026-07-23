import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

// 邀请/添加新成员（仅老板/管理员）
export async function POST(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 校验操作人权限
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role_level, company_id")
      .eq("user_id", session.user.id)
      .single();

    if (
      currentProfile?.role_level !== RoleLevel.BOSS &&
      currentProfile?.role_level !== RoleLevel.ADMIN
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { email, name, roleLevel, brandIds, processRoleIds, processOwnerScopeId } =
      await request.json();

    if (!email || !roleLevel) {
      return NextResponse.json({ error: "邮箱和角色层级必填" }, { status: 400 });
    }

    if (!currentProfile.company_id) {
      return NextResponse.json({ error: "当前用户未绑定公司" }, { status: 400 });
    }

    // 生成临时密码
    const tempPassword = `${Math.random().toString(36).slice(-8)}${Math.random().toString(36).slice(-4).toUpperCase()}!`;

    // 创建 auth 用户（需要 SUPABASE_SERVICE_ROLE_KEY）
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { name: name || email.split("@")[0] },
    });

    if (authError || !authData.user) {
      console.error("Create user failed:", authError);
      return NextResponse.json(
        { error: authError?.message || "创建用户失败" },
        { status: 500 }
      );
    }

    const newUserId = authData.user.id;

    // 创建 profile
    const { error: profileError } = await supabase.from("profiles").insert({
      user_id: newUserId,
      company_id: currentProfile.company_id,
      name: name || email.split("@")[0],
      role: name || email.split("@")[0],
      role_level: roleLevel,
    });

    if (profileError) {
      console.error("Create profile failed:", profileError);
      return NextResponse.json({ error: profileError.message }, { status: 500 });
    }

    // 绑定品牌
    if (brandIds && Array.isArray(brandIds) && brandIds.length > 0) {
      const userBrandRows = brandIds.map((brandId: string) => ({
        user_id: newUserId,
        brand_id: brandId,
        role_level: roleLevel,
      }));
      const { error: ubError } = await supabase.from("user_brands").insert(userBrandRows);
      if (ubError) {
        console.error("Create user_brands failed:", ubError);
      }
    }

    // 绑定工序角色
    if (processRoleIds && Array.isArray(processRoleIds) && processRoleIds.length > 0) {
      const roleRows = processRoleIds.map((processRoleId: string) => ({
        user_id: newUserId,
        process_role_id: processRoleId,
        assigned_by: session.user.id,
      }));
      const { error: uprError } = await supabase.from("user_process_roles").insert(roleRows);
      if (uprError) {
        console.error("Create user_process_roles failed:", uprError);
      }
    }

    // 绑定主管类型
    if (processOwnerScopeId) {
      const { error: upsError } = await supabase.from("user_process_owner_scopes").insert({
        user_id: newUserId,
        scope_id: processOwnerScopeId,
        assigned_by: session.user.id,
      });
      if (upsError) {
        console.error("Create user_process_owner_scopes failed:", upsError);
      }
    }

    return NextResponse.json({
      success: true,
      userId: newUserId,
      tempPassword,
      message: "成员已添加，请把初始密码发给他/她",
    });
  } catch (error) {
    console.error("Failed to invite user:", error);
    return NextResponse.json({ error: "邀请成员失败" }, { status: 500 });
  }
}
