import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

function getAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%";
  let pwd = "";
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    const adminClient = getAdminClient();
    if (!adminClient) {
      return NextResponse.json(
        { error: "邀请功能未配置：缺少 SUPABASE_SERVICE_ROLE_KEY" },
        { status: 500 }
      );
    }

    // 检查当前用户权限
    const { data: currentProfile } = await adminClient
      .from("profiles")
      .select("role_level, company_id, name")
      .eq("user_id", session.user.id)
      .single();

    const roleLevel = currentProfile?.role_level;
    const companyId = currentProfile?.company_id;
    const inviterName = currentProfile?.name || "管理员";

    if (roleLevel !== RoleLevel.BOSS && roleLevel !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!companyId) {
      return NextResponse.json({ error: "当前用户未绑定公司" }, { status: 400 });
    }

    const body = await request.json();
    const { email, name, roleLevel: newRoleLevel, brandIds, processRoleIds, processOwnerScopeId } = body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "请输入有效的邮箱地址" }, { status: 400 });
    }
    if (!newRoleLevel) {
      return NextResponse.json({ error: "请选择角色层级" }, { status: 400 });
    }

    // 1. 检查用户是否已存在
    const { data: existingUser } = await adminClient.auth.admin.getUserById(
      // 先用邮箱查
      "00000000-0000-0000-0000-000000000000"
    ).catch(() => ({ data: null, error: null }));

    // 通过 Supabase Admin API 按邮箱查询用户
    const { data: listData } = await adminClient.auth.admin.listUsers();
    const users = listData?.users || [];
    let targetUser = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    let isNewUser = false;
    let tempPassword = "";

    // 2. 用户不存在则创建
    if (!targetUser) {
      tempPassword = generateTempPassword();
      const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
        email: email.toLowerCase(),
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          name: name || email.split("@")[0],
          invited_by: inviterName,
          invited_at: new Date().toISOString(),
        },
      });

      if (createError || !createData.user) {
        return NextResponse.json(
          { error: createError?.message || "创建用户失败" },
          { status: 500 }
        );
      }
      targetUser = createData.user;
      isNewUser = true;

      // 发送密码重置邮件，让用户设置自己的密码
      try {
        await adminClient.auth.resetPasswordForEmail(email.toLowerCase(), {
          redirectTo: process.env.NEXT_PUBLIC_SITE_URL
            ? `${process.env.NEXT_PUBLIC_SITE_URL}/login`
            : undefined,
        });
      } catch (resetErr) {
        console.warn("发送重置密码邮件失败，用户将使用临时密码登录:", resetErr);
      }
    }

    const userId = targetUser.id;

    // 3. 检查用户是否已在当前公司
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("company_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfile?.company_id && existingProfile.company_id !== companyId) {
      return NextResponse.json(
        { error: "该用户已属于其他公司，请联系对方公司管理员移除后再邀请" },
        { status: 400 }
      );
    }

    if (existingProfile?.company_id === companyId) {
      return NextResponse.json(
        { error: "该用户已是公司成员，无需重复邀请" },
        { status: 400 }
      );
    }

    // 4. 创建/更新 profile
    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        user_id: userId,
        name: name || targetUser.user_metadata?.name || email.split("@")[0],
        email: email.toLowerCase(),
        role_level: newRoleLevel,
        company_id: companyId,
        role: newRoleLevel,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (profileError) throw profileError;

    // 5. 分配品牌权限
    if (brandIds && Array.isArray(brandIds) && brandIds.length > 0) {
      const insertBrands = brandIds.map((brandId: string) => ({
        user_id: userId,
        brand_id: brandId,
        role_level: newRoleLevel,
      }));
      const { error: brandError } = await adminClient
        .from("user_brands")
        .upsert(insertBrands, { onConflict: "user_id,brand_id" });
      if (brandError) throw brandError;
    }

    // 6. 分配工序角色
    if (processRoleIds && Array.isArray(processRoleIds) && processRoleIds.length > 0) {
      const insertRoles = processRoleIds.map((processRoleId: string) => ({
        user_id: userId,
        process_role_id: processRoleId,
        company_id: companyId,
        assigned_by: session.user.id,
      }));
      const { error: roleError } = await adminClient
        .from("user_process_roles")
        .upsert(insertRoles, { onConflict: "user_id,process_role_id,company_id" });
      if (roleError) throw roleError;
    }

    // 7. 分配主管类型
    if (processOwnerScopeId) {
      const { error: scopeError } = await adminClient
        .from("user_process_owner_scopes")
        .upsert(
          {
            user_id: userId,
            scope_id: processOwnerScopeId,
            company_id: companyId,
            assigned_by: session.user.id,
          },
          { onConflict: "user_id,company_id" }
        );
      if (scopeError) throw scopeError;
    }

    return NextResponse.json({
      success: true,
      isNewUser,
      userId,
      email: email.toLowerCase(),
      tempPassword: isNewUser ? tempPassword : undefined,
      message: isNewUser ? "用户已创建并加入公司，已发送设置密码邮件" : "用户已加入公司",
    });
  } catch (error: any) {
    console.error("邀请用户失败:", error);
    return NextResponse.json(
      { error: error?.message || "邀请失败，请重试" },
      { status: 500 }
    );
  }
}
