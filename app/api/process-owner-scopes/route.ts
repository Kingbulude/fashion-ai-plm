import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

const processNodeOptions = [
  "planning",
  "design",
  "sampling",
  "testing",
  "procurement",
  "stocking",
  "sales",
  "aftersales",
];

async function requireAdmin(request: Request) {
  const session = await getSession(request as any);
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_level")
    .eq("user_id", session.user.id)
    .single();

  if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
    return { error: "Forbidden", status: 403 };
  }

  return { session };
}

export async function GET(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { data } = await supabase
      .from("process_owner_scopes")
      .select("*")
      .eq("is_active", true)
      .order("name");

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch process owner scopes:", error);
    return NextResponse.json({ error: "Failed to fetch process owner scopes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const { id, key, name, description, process_nodes } = body;

    if (!key || !name || !Array.isArray(process_nodes)) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const validNodes = process_nodes.filter((n: string) => processNodeOptions.includes(n));

    const payload = {
      key,
      name,
      description: description || null,
      process_nodes: validNodes,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabase
        .from("process_owner_scopes")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      const { data, error } = await supabase
        .from("process_owner_scopes")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Failed to save process owner scope:", error);
    return NextResponse.json({ error: "Failed to save process owner scope" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少主管类型ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("process_owner_scopes")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete process owner scope:", error);
    return NextResponse.json({ error: "Failed to delete process owner scope" }, { status: 500 });
  }
}
