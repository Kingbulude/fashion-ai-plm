import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

export async function GET() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("name, avatar_url, role, brand_id")
      .eq("user_id", user.id)
      .single();

    let brandName = "TEPNIX步戌";
    if (profile?.brand_id) {
      const { data: brand, error: brandError } = await supabase
        .from("brands")
        .select("name")
        .eq("id", profile.brand_id)
        .single();
      if (brand?.name) {
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
    return NextResponse.json(
      { error: "Failed to fetch profile", name: "小芳", role: "设计师", brandName: "TEPNIX步戌" },
      { status: 200 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
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
      .eq("user_id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update profile:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
