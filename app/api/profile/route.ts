import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { logOperation } from "@/lib/auth/audit";
import { isSupabaseConfigured } from "@/lib/db/client";
import { RoleLevelLabels } from "@/lib/auth/rbac";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
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

    const session = await getSession(request as any);

    let userId: string | null = null;
    let userEmail: string | null = null;
    if (session?.user) {
      userId = session.user.id;
      userEmail = session.user.email || null;
    }

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized", detail: "无法获取用户会话，请重新登录" },
        { status: 401 }
      );
    }

    let { data, error } = await supabase
      .from("profiles")
      .select("name, email, avatar_url, role, role_level, brand_id, company_id")
      .eq("user_id", userId)
      .single();

    // 首次登录时自动创建 profile（company_id 为 null，便于后台分配）
    if ((error?.code === "PGRST116" || !data) && session) {
      const baseProfile = {
        user_id: userId,
        name: session.user.user_metadata?.name || userEmail?.split("@")[0] || "用户",
        avatar_url: session.user.user_metadata?.avatar_url || null,
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

    return NextResponse.json({
      name: data?.name || "用户",
      email: userEmail || "",
      avatarUrl: data?.avatar_url || null,
      role: (data?.role_level && RoleLevelLabels[data.role_level]) || data?.role || "未设置",
      roleLevel: data?.role_level || null,
      brandName,
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
    if (!isSupabaseConfigured) {
      return NextResponse.json(
        {
          error: "Supabase 未配置",
          detail: "请在环境变量中配置 NEXT_PUBLIC_SUPABASE_URL、NEXT_PUBLIC_SUPABASE_ANON_KEY 和 SUPABASE_SERVICE_ROLE_KEY，否则资料无法持久化保存",
        },
        { status: 503 }
      );
    }

    const session = await getSession(request as any);
    const userId = session?.user?.id;

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
    const userEmail = session.user.email || null;

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
