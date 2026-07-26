// 租户上下文辅助工具 - 服务端权威来源：从已认证用户的会话反查 profiles 表
// 重要：不信任客户端传入的 x-company-id / x-brand-id / x-season-id 头
// 这些头只能用于前端 UI 状态提示，不能作为权限判定依据

import { type NextRequest, NextResponse } from "next/server";
import { type User } from "@supabase/supabase-js";
import { type SupabaseClient } from "@supabase/supabase-js";
import { getSession } from "@/lib/auth/supabase";
import { createServerSupabaseClient } from "@/lib/db/client";
import { RoleLevel } from "@/lib/auth/rbac";

export interface TenantContext {
  company_id: string;
  brand_id: string;
  season_id: string | null;
}

export interface VerifiedRequestContext {
  user: User;
  supabase: SupabaseClient;
  tenant: TenantContext;
  roleLevel: string;
}

interface TenantResolution {
  tenant: TenantContext;
  error?: string;
}

/**
 * 统一 API 鉴权与租户上下文入口
 * - 校验用户 session（支持 cookie 和 Authorization: Bearer）
 * - 创建绑定用户会话的 RLS Supabase 客户端
 * - 从 profiles 表反查可信的 company_id / brand_id / role_level
 *
 * 返回值：
 * - 成功：{ user, supabase, tenant, roleLevel }
 * - 失败：{ error: NextResponse }（可直接 return 给客户端）
 */
export async function requireApiAuth(
  request: Request | NextRequest
): Promise<VerifiedRequestContext | { error: NextResponse }> {
  const session = await getSession(request);
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }

  const supabase = createServerSupabaseClient(request);
  const userId = session.user.id;

  // 从 profiles 表反查用户所属租户和角色
  // 使用 maybeSingle 避免用户尚未创建 profile 时抛出异常
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("company_id, brand_id, role_level")
    .eq("user_id", userId)
    .maybeSingle();

  if (profileError) {
    console.error("[requireApiAuth] failed to load profile:", profileError);
    return { error: NextResponse.json({ error: "无法加载用户资料" }, { status: 500 }) };
  }

  // season_id 可以从前端头读取，仅作为 UI 提示，不作为权限依据
  const headerSeasonId = request.headers.get("x-season-id");

  const tenant: TenantContext = {
    company_id: profile?.company_id || "",
    brand_id: profile?.brand_id || "",
    season_id: headerSeasonId || null,
  };

  return {
    user: session.user,
    supabase,
    tenant,
    roleLevel: profile?.role_level || RoleLevel.EXECUTOR,
  };
}

/**
 * 兼容旧命名：返回可信租户上下文
 * 等同于 requireApiAuth
 */
export async function requireTenantContext(
  request: Request | NextRequest
): Promise<VerifiedRequestContext | { error: NextResponse }> {
  return requireApiAuth(request);
}

/**
 * 验证当前用户是否有权访问指定品牌
 * - BOSS / ADMIN：可访问任何品牌
 * - 其他角色：必须在 user_brands 表中有关联记录
 */
export async function verifyBrandAccess(
  request: Request | NextRequest,
  brandId: string
): Promise<boolean> {
  const ctx = await requireApiAuth(request);
  if ("error" in ctx) return false;

  const { roleLevel, supabase, user } = ctx;

  if (roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN) {
    return true;
  }

  const { data } = await supabase
    .from("user_brands")
    .select("id")
    .eq("user_id", user.id)
    .eq("brand_id", brandId)
    .maybeSingle();

  return !!data;
}

/**
 * 验证当前用户是否有权访问指定公司
 * - BOSS / ADMIN：可访问任何公司
 * - 其他角色：其 profile.company_id 必须匹配
 */
export async function verifyCompanyAccess(
  request: Request | NextRequest,
  companyId: string
): Promise<boolean> {
  const ctx = await requireApiAuth(request);
  if ("error" in ctx) return false;

  const { roleLevel, tenant } = ctx;

  if (roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN) {
    return true;
  }

  return tenant.company_id === companyId;
}

/**
 * 从款式ID获取租户上下文
 * 用于在写入子表时自动补充 company_id/brand_id/season_id
 *
 * 注意：必须传入绑定用户会话的 supabase client，否则 RLS 可能拒绝读取父记录
 */
export async function resolveStyleTenant(
  styleId: string,
  supabase: SupabaseClient
): Promise<TenantResolution> {
  const { data, error } = await supabase
    .from("styles")
    .select("company_id, brand_id, season_id")
    .eq("id", styleId)
    .single();

  if (error || !data) {
    return { tenant: { company_id: "", brand_id: "", season_id: null }, error: "款式不存在" };
  }

  if (!data.company_id || !data.brand_id) {
    return {
      tenant: { company_id: "", brand_id: "", season_id: null },
      error: "款式缺少租户字段，请联系管理员修复数据",
    };
  }

  return {
    tenant: {
      company_id: data.company_id,
      brand_id: data.brand_id,
      season_id: data.season_id,
    },
  };
}

/**
 * 从规划ID获取租户上下文
 * 必须传入绑定用户会话的 supabase client
 */
export async function resolvePlanningTenant(
  planningId: string,
  supabase: SupabaseClient
): Promise<TenantResolution> {
  const { data, error } = await supabase
    .from("planning")
    .select("company_id, brand_id, season_id")
    .eq("id", planningId)
    .single();

  if (error || !data) {
    return { tenant: { company_id: "", brand_id: "", season_id: null }, error: "企划不存在" };
  }

  return {
    tenant: {
      company_id: data.company_id || "",
      brand_id: data.brand_id || "",
      season_id: data.season_id,
    },
  };
}

/**
 * 强制将租户字段附加到插入数据
 * 如果数据中没有 tenant 字段，会用提供的租户填充
 */
export function withTenant<T extends Record<string, any>>(
  data: T,
  tenant: TenantContext
): T & TenantContext {
  return {
    ...data,
    company_id: data.company_id || tenant.company_id,
    brand_id: data.brand_id || tenant.brand_id,
    season_id: data.season_id || tenant.season_id,
  };
}

/**
 * ⚠️ 已弃用：从请求头中获取租户上下文
 *
 * 该函数仅用于前端 UI 状态同步（例如页面初始化时读取当前选中的品牌/季次），
 * 绝不可用于权限判定或数据库查询过滤。
 *
 * 服务端权威租户上下文必须通过 requireApiAuth / requireTenantContext 从用户会话反查。
 *
 * @deprecated 请使用 requireApiAuth 获取可信租户上下文
 */
export function getTenantFromHeaders(request: Request): TenantContext | null {
  const companyId = request.headers.get("x-company-id");
  const brandId = request.headers.get("x-brand-id");
  const seasonId = request.headers.get("x-season-id");

  if (!companyId || !brandId) return null;
  return { company_id: companyId, brand_id: brandId, season_id: seasonId };
}
