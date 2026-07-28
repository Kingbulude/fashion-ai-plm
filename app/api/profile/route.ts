import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/db/client";
import { logOperation } from "@/lib/auth/audit";
import { RoleLevelLabels } from "@/lib/auth/rbac";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          name: "未登录",
          avatarUrl: null,
          role: "未登录",
          roleLevel: null,
          brandName: "",
          error: "Supabase 未配置：请在环境变量中配置 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY 和 SUPABASE_SERVICE_ROLE_KEY",
        },
        { status: 200 }
      );
    }

    const userId = ctx.user.id;
    const userEmail = ctx.user.email || null;

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", detail: "无法获取用户会话，请重新登录" },
        { status: 401 }
      );
    }

    // 兼容 email 列未迁移的旧环境：先查询不含 email 的字段
    let profileQuery = await supabase
      .from("profiles")
      .select("name, avatar_url, role, role_level, brand_id, company_id")
      .eq("user_id", userId)
      .single();

    // 如果 email 列已存在，再补充查询
    if (!profileQuery.error) {
      try {
        const emailQuery = await supabase
          .from("profiles")
          .select("email")
          .eq("user_id", userId)
          .single();
        if (emailQuery.data) {
          profileQuery.data = { ...profileQuery.data, email: emailQuery.data.email } as any;
        }
      } catch {
        // email 列不存在时忽略
      }
    }

    let { data, error } = profileQuery;

    // 首次登录时自动创建 profile（company_id 为 null，便于后台分配）
    if ((error?.code === "PGRST116" || !data)) {
      const baseProfile = {
        user_id: userId,
        name: ctx.user.user_metadata?.name || userEmail?.split("@")[0] || "用户",
        avatar_url: ctx.user.user_metadata?.avatar_url || null,
        role: "executor",
        role_level: "executor",
      };

      // 尝试写入 email（新 migration 已添加该字段；旧环境会自动失败并回退）
      let insertError: any = null;
      const insertWithEmail = await supabase
        .from("profiles")
        .insert({ ...baseProfile, email: userEmail })
        .select()
        .single();

      if (insertWithEmail.error) {
        const fallback = await supabase.from("profiles").insert(baseProfile).select().single();
        data = fallback.data;
        insertError = fallback.error;
      } else {
        data = insertWithEmail.data;
      }

      if (insertError) {
        console.error("GET profile auto-create error:", insertError);
        return NextResponse.json(
          { error: "Fetch failed", detail: insertError.message, code: insertError.code },
          { status: 500 }
        );
      }
    } else if (error) {
      console.error("GET profile error:", error);
      return NextResponse.json(
        { error: "Fetch failed", detail: error.message, code: error.code },
        { status: 500 }
      );
    }

    let brandName = "TEPNIX步戌";
    if (data?.brand_id) {
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("name")
        .eq("id", data.brand_id)
        .single();
      if (!brandError && brand?.name) {
        brandName = brand.name;
      }
    }

    // 加载横向工序角色（按公司隔离）
    const { data: userProcessRoles } = await supabase
      .from("user_process_roles")
      .select("process_role_id, process_roles(*)")
      .eq("user_id", userId)
      .eq("company_id", data?.company_id || "");

    const processRoles = ((userProcessRoles || [])
      .map((ur: any) => ur.process_roles)
      .filter(Boolean) as any[])
      .filter((r: any) => r.is_active !== false);

    // 加载工序主管类型（按公司隔离）
    const { data: userProcessOwnerScopes } = await supabase
      .from("user_process_owner_scopes")
      .select("process_owner_scopes(*)")
      .eq("user_id", userId)
      .eq("company_id", data?.company_id || "");

    const processOwnerScopes = ((userProcessOwnerScopes || [])
      .map((us: any) => us.process_owner_scopes)
      .filter(Boolean) as any[])
      .filter((s: any) => s.is_active !== false);

    // 构建职位权限展示文本
    const roleTitles: string[] = [];
    if (data?.role_level && RoleLevelLabels[data.role_level]) {
      roleTitles.push(RoleLevelLabels[data.role_level]);
    }
    processOwnerScopes.forEach((scope: any) => {
      if (scope.name && !roleTitles.includes(scope.name)) roleTitles.push(scope.name);
    });
    processRoles.forEach((role: any) => {
      if (role.name && !roleTitles.includes(role.name)) roleTitles.push(role.name);
    });

    const roleDisplay = roleTitles.length > 0 ? roleTitles.join(" / ") : "未设置";

    return NextResponse.json({
      name: data?.name || "用户",
      email: userEmail || "",
      avatarUrl: data?.avatar_url || null,
      role: roleDisplay,
      roleLevel: data?.role_level || null,
      brandName,
      processRoles: processRoles.map((r: any) => ({ id: r.id, name: r.name, processNode: r.process_node })),
      processOwnerScopes: processOwnerScopes.map((s: any) => ({ id: s.id, name: s.name, processNodes: s.process_nodes })),
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile", detail: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          error: "Supabase 未配置",
          detail: "请在环境变量中配置 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY 和 SUPABASE_SERVICE_ROLE_KEY，否则资料无法持久化保存",
        },
        { status: 503 }
      );
    }

    const userId = ctx.user.id;

    if (!userId) {
      return NextResponse.json(
        {
          error: "Unauthorized",
          detail: "无法获取用户会话。请尝试：1) 清除浏览器 cookie 后重新登录 2) 刷新页面后再保存",
          hasCookie: !!request.headers.get("cookie"),
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, avatarUrl } = body;

    const userName = name || "小芳";
    const userAvatarUrl = avatarUrl || null;
    const userEmail = ctx.user.email || null;

    // 头像 base64 长度校验：PostgreSQL text 字段无上限，但建议控制在 1MB 以内
    if (userAvatarUrl && typeof userAvatarUrl === "string" && userAvatarUrl.length > 1024 * 1024) {
      return NextResponse.json(
        { error: "Avatar too large", detail: "头像图片过大，请选择更小的图片" },
        { status: 413 }
      );
    }

    const { data: existingProfile, error: checkError } = await supabase
      .from("profiles")
      .select("id, user_id")
      .eq("user_id", userId)
      .single();

    let resultData: any = null;

    if (checkError || !existingProfile) {
      const { data: insertData, error: insertError } = await supabase
        .from("profiles")
        .insert({
          user_id: userId,
          name: userName,
          email: userEmail,
          avatar_url: userAvatarUrl,
          role: "executor",
          role_level: "executor",
        })
        .select()
        .single();

      if (insertError) {
        console.error("Supabase insert error:", insertError);
        return NextResponse.json(
          { error: "Insert failed", detail: insertError.message, code: insertError.code },
          { status: 500 }
        );
      }
      resultData = insertData;
    } else {
      const { data: updateData, error: updateError } = await supabase
        .from("profiles")
        .update({
          name: userName,
          email: userEmail,
          avatar_url: userAvatarUrl,
        })
        .eq("user_id", userId)
        .select()
        .single();

      if (updateError) {
        console.error("Supabase update error:", updateError);
        return NextResponse.json(
          { error: "Update failed", detail: updateError.message, code: updateError.code },
          { status: 500 }
        );
      }
      resultData = updateData;
    }

    try {
      await logOperation({
        userId: userId,
        action: "update",
        targetTable: "profiles",
        targetId: userId,
        afterData: resultData,
        request,
        supabase,
      });
    } catch (logError) {
      console.error("Failed to log operation:", logError);
    }

    return NextResponse.json({
      success: true,
      data: resultData,
      saved: {
        name: resultData?.name,
        avatarUrl: resultData?.avatar_url,
      },
    });
  } catch (error) {
    console.error("Failed to update profile:", error);
    const errorMessage = error instanceof Error ? error.message : typeof error === "object" && error !== null ? JSON.stringify(error) : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update profile", detail: errorMessage },
      { status: 500 }
    );
  }
}
