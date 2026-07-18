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
    
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, avatarUrl } = body;

    const { data, error } = await supabase
      .from("profiles")
      .upsert(
        {
          user_id: session.user.id,
          name: name || "小芳",
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      )
      .select();

    if (error) {
      console.error("Supabase upsert error:", error);
      throw error;
    }

    await logOperation({
      userId: session.user.id,
      action: "update",
      targetTable: "profiles",
      targetId: session.user.id,
      afterData: data,
      request,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
