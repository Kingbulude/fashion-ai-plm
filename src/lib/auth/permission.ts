import { NextResponse } from "next/server";
import { type NextRequest } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel, Permission, hasPermission } from "@/lib/auth/rbac";

export const runtime = "edge";

export interface UserPermissionContext {
  userId: string;
  roleLevel: string;
  companyId: string | null;
  brandId: string | null;
  brands: { brand_id: string; role_level: string }[];
  supabase: SupabaseClient;
}

// 验证 API 请求认证，返回用户上下文或 null
export async function requireApiAuth(
  request: Request | NextRequest
): Promise<UserPermissionContext | null> {
  return getCurrentUserRole(request);
}

// 获取当前用户的完整角色信息
export async function getCurrentUserRole(
  request: Request | NextRequest
): Promise<UserPermissionContext | null> {
  const session = await getSession(request);
  if (!session?.user) {
    return null;
  }

  // 必须使用绑定用户会话的 client，否则 RLS 会拒绝读取 profiles/user_brands
  const supabase = createServerSupabaseClient(request);
  const userId = session.user.id;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_level, company_id, brand_id")
    .eq("user_id", userId)
    .single();

  // 获取用户关联的所有品牌
  const { data: userBrands } = await supabase
    .from("user_brands")
    .select("brand_id, role_level")
    .eq("user_id", userId);

  return {
    userId,
    roleLevel: profile?.role_level || RoleLevel.EXECUTOR,
    companyId: profile?.company_id || null,
    brandId: profile?.brand_id || null,
    brands: userBrands || [],
    supabase,
  };
}

// 权限检查包装器
export function requirePermission(permission: Permission) {
  return async function (
    request: Request | NextRequest,
    handler: (ctx: UserPermissionContext) => Promise<Response>
  ) {
    const userRole = await getCurrentUserRole(request);
    if (!userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(userRole.roleLevel, permission)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler(userRole);
  };
}

// 检查品牌访问权限
export async function canAccessBrand(
  ctx: UserPermissionContext,
  brandId: string
): Promise<boolean> {
  if (
    ctx.roleLevel === RoleLevel.BOSS ||
    ctx.roleLevel === RoleLevel.ADMIN
  ) {
    return true;
  }

  const { data } = await ctx.supabase
    .from("user_brands")
    .select("id")
    .eq("user_id", ctx.userId)
    .eq("brand_id", brandId)
    .maybeSingle();

  return !!data;
}

// 检查工序访问权限
export async function canAccessProcess(
  ctx: UserPermissionContext,
  processNode: string,
  brandId: string
): Promise<boolean> {
  if (
    [RoleLevel.BOSS, RoleLevel.ADMIN, RoleLevel.BRAND_MANAGER].includes(
      ctx.roleLevel as RoleLevel
    )
  ) {
    return true;
  }

  if (!(await canAccessBrand(ctx, brandId))) return false;

  // 工序负责人：检查主管范围是否包含目标工序节点（按公司隔离）
  let ownerScopeQuery = ctx.supabase
    .from("user_process_owner_scopes")
    .select("scope_id, process_owner_scopes!inner(process_nodes)")
    .eq("user_id", ctx.userId);

  if (ctx.companyId) {
    ownerScopeQuery = ownerScopeQuery.eq("company_id", ctx.companyId);
  }

  const { data: ownerScopes } = await ownerScopeQuery;

  if (ownerScopes && ownerScopes.length > 0) {
    const nodes = ownerScopes.flatMap((s: any) => {
      const scope = s.process_owner_scopes;
      return Array.isArray(scope?.process_nodes) ? scope.process_nodes : [];
    });
    if (nodes.includes(processNode)) return true;
  }

  // 横向工序角色：检查角色关联的工序节点（按公司隔离）
  let processRoleQuery = ctx.supabase
    .from("user_process_roles")
    .select("role_id, process_roles!inner(process_node)")
    .eq("user_id", ctx.userId)
    .eq("brand_id", brandId);

  if (ctx.companyId) {
    processRoleQuery = processRoleQuery.eq("company_id", ctx.companyId);
  }

  const { data: processRoleAssignments } = await processRoleQuery;

  if (processRoleAssignments && processRoleAssignments.length > 0) {
    const nodes = processRoleAssignments
      .map((r: any) => r.process_roles?.process_node)
      .filter(Boolean);
    if (nodes.includes(processNode)) return true;
  }

  return false;
}

// 检查季度编辑权限（本季度可编辑，历史只读）
export function canEditSeason(seasonStatus: string): boolean {
  return seasonStatus === "active";
}
