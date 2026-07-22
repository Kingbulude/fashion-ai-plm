import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel, getAllowedBrandIds } from "@/lib/auth/rbac";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id, name, email, avatar_url, company_id, role_level")
      .eq("user_id", session.user.id)
      .single();

    if (!profile?.company_id) {
      return NextResponse.json({
        profile: { ...profile, role_level: null },
        roleLevel: null,
        allowedBrandIds: [],
      });
    }

    const roleLevel = profile.role_level;

    let allowedBrandIds: string[] = [];
    if (roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN) {
      const { data: brands } = await supabase
        .from("brands")
        .select("id")
        .eq("company_id", profile.company_id);
      allowedBrandIds = (brands || []).map((b: any) => b.id);
    } else {
      const { data: ub } = await supabase
        .from("user_brands")
        .select("brand_id")
        .eq("user_id", session.user.id);
      allowedBrandIds = (ub || []).map((x: any) => x.brand_id);
    }

    return NextResponse.json({
      profile,
      roleLevel,
      allowedBrandIds,
    });
  } catch (error) {
    console.error("Failed to fetch auth me:", error);
    return NextResponse.json(
      { error: "Failed to fetch auth me" },
      { status: 500 }
    );
  }
}
