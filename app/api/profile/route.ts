import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";

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

    const { error } = await supabase
      .from("profiles")
      .update({
        name: name || "小芳",
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", session.user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
