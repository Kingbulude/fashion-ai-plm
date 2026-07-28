import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

// 更新公司信息（仅本公司 BOSS/ADMIN）
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase, user } = ctx;

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "缺少公司 ID" }, { status: 400 });
    }

    // 校验权限
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level, company_id")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "未找到用户资料" }, { status: 403 });
    }

    if (profile.company_id !== id) {
      return NextResponse.json({ error: "只能修改自己所在公司的信息" }, { status: 403 });
    }

    if (profile.role_level !== RoleLevel.BOSS && profile.role_level !== RoleLevel.ADMIN) {
      return NextResponse.json({ error: "无权限修改公司信息" }, { status: 403 });
    }

    const body = await request.json();
    const { name, logoUrl } = body;

    const updatePayload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };
    if (name !== undefined) updatePayload.name = String(name).trim();
    if (logoUrl !== undefined) updatePayload.logo_url = logoUrl ? String(logoUrl).trim() : null;

    if (Object.keys(updatePayload).length === 1) {
      return NextResponse.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("companies")
      .update(updatePayload)
      .eq("id", id)
      .select("id, name, logo_url")
      .single();

    if (error) {
      console.error("更新公司信息失败:", error);
      return NextResponse.json({ error: "更新公司信息失败", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("更新公司信息异常:", error);
    return NextResponse.json({ error: "更新公司信息失败" }, { status: 500 });
  }
}
