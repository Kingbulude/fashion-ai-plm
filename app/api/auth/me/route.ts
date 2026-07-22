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

    // 加载横向工序角色
    const { data: userProcessRoles } = await supabase
      .from("user_process_roles")
      .select("process_role_id, process_roles(*)")
      .eq("user_id", session.user.id);

    const processRoles = ((userProcessRoles || [])
      .map((ur: any) => ur.process_roles)
      .filter(Boolean) as any[])
      .filter((r: any) => r.is_active !== false);

    // 加载工序主管类型
    const { data: userProcessOwnerScopes } = await supabase
      .from("user_process_owner_scopes")
      .select("process_owner_scopes(*)")
      .eq("user_id", session.user.id);

    const processOwnerScope = ((userProcessOwnerScopes || [])
      .map((us: any) => us.process_owner_scopes)
      .filter(Boolean) as any[])
      .filter((s: any) => s.is_active !== false)[0] || null;

    // 计算可访问路由
    const routeSet = new Set<string>();
    if (roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN) {
      // BOSS/ADMIN 可访问全部路由
      routeSet.add("*");
    } else {
      processRoles.forEach((role: any) => {
        Object.keys(role.route_permissions || {}).forEach((route) => routeSet.add(route));
      });
    }

    // 计算可访问 AI Skills
    let accessibleAISkills: any[] = [];
    if (roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN) {
      const { data: allSkills } = await supabase
        .from("ai_skills")
        .select("*")
        .eq("is_active", true);
      accessibleAISkills = allSkills || [];
    } else {
      const aiSkillIdSet = new Set<string>();

      // 通过横向工序角色关联的 AI Skills
      if (processRoles.length > 0) {
        const processRoleIds = processRoles.map((r: any) => r.id);
        const { data: roleSkillAssignments } = await supabase
          .from("process_role_ai_skills")
          .select("ai_skill_id")
          .in("process_role_id", processRoleIds);

        (roleSkillAssignments || []).forEach((item: any) => {
          if (item.ai_skill_id) aiSkillIdSet.add(item.ai_skill_id);
        });
      }

      // 通过主管类型关联的 AI Skills
      if (processOwnerScope?.id) {
        const { data: scopeSkillAssignments } = await supabase
          .from("process_owner_scope_ai_skills")
          .select("ai_skill_id")
          .eq("scope_id", processOwnerScope.id);

        (scopeSkillAssignments || []).forEach((item: any) => {
          if (item.ai_skill_id) aiSkillIdSet.add(item.ai_skill_id);
        });
      }

      if (aiSkillIdSet.size > 0) {
        const { data: skills } = await supabase
          .from("ai_skills")
          .select("*")
          .in("id", Array.from(aiSkillIdSet))
          .eq("is_active", true);
        accessibleAISkills = skills || [];
      }
    }

    return NextResponse.json({
      profile,
      roleLevel,
      allowedBrandIds,
      processRoles,
      processOwnerScope,
      accessibleRoutes: Array.from(routeSet),
      accessibleAISkills,
    });
  } catch (error) {
    console.error("Failed to fetch auth me:", error);
    return NextResponse.json(
      { error: "Failed to fetch auth me" },
      { status: 500 }
    );
  }
}
