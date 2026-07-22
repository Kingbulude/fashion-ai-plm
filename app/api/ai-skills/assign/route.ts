import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

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

    const url = new URL(request.url);
    const aiSkillId = url.searchParams.get("aiSkillId");
    const processRoleId = url.searchParams.get("processRoleId");
    const scopeId = url.searchParams.get("scopeId");

    let roleQuery = supabase.from("process_role_ai_skills").select("id, process_role_id, ai_skill_id");
    let scopeQuery = supabase.from("process_owner_scope_ai_skills").select("id, scope_id, ai_skill_id");

    if (aiSkillId) {
      roleQuery = roleQuery.eq("ai_skill_id", aiSkillId);
      scopeQuery = scopeQuery.eq("ai_skill_id", aiSkillId);
    }

    if (processRoleId) {
      roleQuery = roleQuery.eq("process_role_id", processRoleId);
    }

    if (scopeId) {
      scopeQuery = scopeQuery.eq("scope_id", scopeId);
    }

    const [{ data: roleAssignments }, { data: scopeAssignments }] = await Promise.all([
      roleQuery,
      scopeQuery,
    ]);

    return NextResponse.json({
      roleAssignments: roleAssignments || [],
      scopeAssignments: scopeAssignments || [],
    });
  } catch (error) {
    console.error("Failed to fetch ai skill assignments:", error);
    return NextResponse.json({ error: "Failed to fetch ai skill assignments" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminCheck = await requireAdmin(request);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const body = await request.json();
    const { aiSkillId, processRoleIds, scopeIds } = body;

    if (!aiSkillId) {
      return NextResponse.json({ error: "缺少 aiSkillId" }, { status: 400 });
    }

    // 校验 aiSkillId 存在
    const { data: skill } = await supabase
      .from("ai_skills")
      .select("id")
      .eq("id", aiSkillId)
      .single();

    if (!skill) {
      return NextResponse.json({ error: "AI Skill 不存在" }, { status: 400 });
    }

    // 更新角色绑定：先删除该 skill 的所有角色绑定，再插入新的
    await supabase.from("process_role_ai_skills").delete().eq("ai_skill_id", aiSkillId);

    if (processRoleIds && Array.isArray(processRoleIds) && processRoleIds.length > 0) {
      const roleInsertData = processRoleIds.map((processRoleId: string) => ({
        ai_skill_id: aiSkillId,
        process_role_id: processRoleId,
      }));

      const { error: roleError } = await supabase
        .from("process_role_ai_skills")
        .insert(roleInsertData);

      if (roleError) throw roleError;
    }

    // 更新主管类型绑定：先删除该 skill 的所有主管类型绑定，再插入新的
    await supabase.from("process_owner_scope_ai_skills").delete().eq("ai_skill_id", aiSkillId);

    if (scopeIds && Array.isArray(scopeIds) && scopeIds.length > 0) {
      const scopeInsertData = scopeIds.map((scopeId: string) => ({
        ai_skill_id: aiSkillId,
        scope_id: scopeId,
      }));

      const { error: scopeError } = await supabase
        .from("process_owner_scope_ai_skills")
        .insert(scopeInsertData);

      if (scopeError) throw scopeError;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to assign ai skill:", error);
    return NextResponse.json({ error: "Failed to assign ai skill" }, { status: 500 });
  }
}
