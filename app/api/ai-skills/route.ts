import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

const skillTypeOptions = [
  "personal_assistant",
  "process_master",
  "execution",
];

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
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data } = await supabase
      .from("ai_skills")
      .select("*")
      .eq("is_active", true)
      .order("name");

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch ai skills:", error);
    return NextResponse.json({ error: "Failed to fetch ai skills" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const { id, key, name, description, skill_type, process_node, config_schema, entry_route } = body;

    if (!key || !name || !skillTypeOptions.includes(skill_type)) {
      return NextResponse.json({ error: "缺少必填字段或 skill_type 不合法" }, { status: 400 });
    }

    if (process_node && !processNodeOptions.includes(process_node)) {
      return NextResponse.json({ error: "process_node 不合法" }, { status: 400 });
    }

    const payload = {
      key,
      name,
      description: description || null,
      skill_type,
      process_node: process_node || null,
      config_schema: config_schema || null,
      entry_route: entry_route || null,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabase
        .from("ai_skills")
        .update(payload)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    } else {
      const { data, error } = await supabase
        .from("ai_skills")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return NextResponse.json(data);
    }
  } catch (error) {
    console.error("Failed to save ai skill:", error);
    return NextResponse.json({ error: "Failed to save ai skill" }, { status: 500 });
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
      return NextResponse.json({ error: "缺少 AI Skill ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("ai_skills")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete ai skill:", error);
    return NextResponse.json({ error: "Failed to delete ai skill" }, { status: 500 });
  }
}
