import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel, Permission, hasPermission } from "@/lib/auth/rbac";

export const runtime = "edge";

// 获取当前用户的完整角色信息
export async function getCurrentUserRole(request: Request) {
  const session = await getSession(request as any);
  if (!session?.user) {
    return null;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_level, company_id, brand_id")
    .eq("user_id", session.user.id)
    .single();

  if (!profile) {
    return {
      userId: session.user.id,
      roleLevel: RoleLevel.EXECUTOR,
      companyId: null,
      brandId: null,
      brands: [],
    };
  }

  // 获取用户关联的所有品牌
  const { data: userBrands } = await supabase
    .from("user_brands")
    .select("brand_id, role_level")
    .eq("user_id", session.user.id);

  return {
    userId: session.user.id,
    roleLevel: profile.role_level || RoleLevel.EXECUTOR,
    companyId: profile.company_id,
    brandId: profile.brand_id,
    brands: userBrands || [],
  };
}

// 权限检查包装器
export function requirePermission(permission: Permission) {
  return async function (request: Request, handler: (ctx: any) => Promise<Response>) {
    const userRole = await getCurrentUserRole(request);
    if (!userRole) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!hasPermission(userRole.roleLevel, permission)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return handler({ request, userRole });
  };
}

// 检查品牌访问权限
export async function canAccessBrand(userId: string, brandId: string): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role_level")
    .eq("user_id", userId)
    .single();

  // 老板和管理员可以访问所有品牌
  if (profile?.role_level === RoleLevel.BOSS || profile?.role_level === RoleLevel.ADMIN) {
    return true;
  }

  // 其他角色检查品牌关联
  const { data: userBrand } = await supabase
    .from("user_brands")
    .select("id")
    .eq("user_id", userId)
    .eq("brand_id", brandId)
    .single();

  return !!userBrand;
}

// 检查工序访问权限
export async function canAccessProcess(
  userId: string,
  processNode: string,
  brandId: string
): Promise<boolean> {
  const { data: profile } = await supabase
    .from("profiles")
    .select("role_level")
    .eq("user_id", userId)
    .single();

  if (!profile) return false;

  // 老板、管理员、品牌负责人可以访问所有工序
  if ([RoleLevel.BOSS, RoleLevel.ADMIN, RoleLevel.BRAND_MANAGER].includes(profile.role_level as RoleLevel)) {
    return true;
  }

  // 工序负责人和执行者只能访问关联的工序
  // TODO: 后续通过 user_processes 表关联具体工序
  // MVP阶段先开放所有工序访问
  return true;
}

// 检查季度编辑权限（本季度可编辑，历史只读）
export function canEditSeason(seasonStatus: string): boolean {
  return seasonStatus === "active";
}
