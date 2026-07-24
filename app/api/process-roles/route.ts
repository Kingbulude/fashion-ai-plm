import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

// 校验当前用户是否为 BOSS/ADMIN，并返回 company_id
async function requireAdmin(request: Request) {
  const session = await getSession(request as any);
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_level, company_id")
    .eq("user_id", session.user.id)
    .single();

  if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
    return { error: "Forbidden", status: 403 };
  }

  if (!profile?.company_id) {
    return { error: "当前用户未绑定公司", status: 400 };
  }

  return { session, companyId: profile.company_id };
}

// 获取工序角色列表（仅 BOSS/ADMIN）
export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { companyId } = adminCheck;

    const { data } = await supabase
      .from("process_roles")
      .select("*")
      .eq("is_active", true)
      .eq("company_id", companyId)
      .order("name");

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch process roles:", error);
    return NextResponse.json({ error: "Failed to fetch process roles" }, { status: 500 });
  }
}

// 创建/更新工序角色（仅 BOSS/ADMIN）
export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { companyId } = adminCheck;

    const body = await request.json();
    const { id, key, name, description, process_node, route_permissions } = body;

    if (!key || !name || !process_node) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const payload = {
      key,
      name,
      description: description || null,
      process_node,
      route_permissions: route_permissions || {},
      company_id: companyId,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabase
        .from("process_roles")
        .update(payload)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      const { data, error } = await supabase
        .from("process_roles")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Failed to save process role:", error);
    return NextResponse.json({ error: "Failed to save process role" }, { status: 500 });
  }
}

// 删除（软删除）工序角色
export async function DELETE(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { companyId } = adminCheck;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少角色ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("process_roles")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete process role:", error);
    return NextResponse.json({ error: "Failed to delete process role" }, { status: 500 });
  }
}
