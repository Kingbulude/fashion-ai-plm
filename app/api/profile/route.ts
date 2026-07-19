import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { logOperation } from "@/lib/auth/audit";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const session = await getSession(request as any);
    
    let userId: string | null = null;
    if (session?.user) {
      userId = session.user.id;
    }

    let profile: any = null;
    if (userId) {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, avatar_url, role, brand_id")
        .eq("user_id", userId)
        .single();
      if (!error && data) {
        profile = data;
      }
    }

    let brandName = "TEPNIX步戌";
    if (profile?.brand_id) {
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("name")
        .eq("id", profile.brand_id)
        .single();
      if (!brandError && brand?.name) {
        brandName = brand.name;
      }
    }

    return NextResponse.json({
      name: profile?.name || "小芳",
      avatarUrl: profile?.avatar_url || null,
      role: profile?.role || "设计师",
      brandName,
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return NextResponse.json({
      name: "小芳",
      avatarUrl: null,
      role: "设计师",
      brandName: "TEPNIX步戌",
    });
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession(request as any);
    const userId = session?.user?.id;

    const body = await request.json();
    const { name, avatarUrl } = body;

    const userName = name || "小芳";
    const userAvatarUrl = avatarUrl || null;

    // 如果没有获取到用户会话，尝试用请求中的 user_id（降级处理）
    if (!userId) {
      // 返回详细错误，方便排查
      return NextResponse.json(
        { 
          error: "Unauthorized", 
          detail: "无法获取用户会话。请尝试：1) 清除浏览器cookie后重新登录 2) 刷新页面后再保存",
          hasCookie: !!request.headers.get("cookie")
        },
        { status: 401 }
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
          avatar_url: userAvatarUrl,
          role: "设计师",
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

    return NextResponse.json({ success: true, data: resultData });
  } catch (error) {
    console.error("Failed to update profile:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Failed to update profile", detail: errorMessage },
      { status: 500 }
    );
  }
}
