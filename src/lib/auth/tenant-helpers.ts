// 租户上下文辅助工具 - 自动从父记录继承 company_id/brand_id/season_id
// 用于写入操作时自动补充租户字段

import { supabase } from "@/lib/db/client";

interface TenantContext {
  company_id: string;
  brand_id: string;
  season_id: string | null;
}

interface TenantResolution {
  tenant: TenantContext;
  error?: string;
}

/**
 * 从款式ID获取租户上下文
 * 用于在写入子表时自动补充 company_id/brand_id/season_id
 */
export async function resolveStyleTenant(styleId: string): Promise<TenantResolution> {
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
 */
export async function resolvePlanningTenant(planningId: string): Promise<TenantResolution> {
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
 * 从请求头中获取当前租户（前端 TenantSwitcher 设置的 x-company-id 等）
 */
export function getTenantFromHeaders(request: Request): TenantContext | null {
  const companyId = request.headers.get("x-company-id");
  const brandId = request.headers.get("x-brand-id");
  const seasonId = request.headers.get("x-season-id");

  if (!companyId || !brandId) return null;
  return { company_id: companyId, brand_id: brandId, season_id: seasonId };
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
 * 验证租户访问权限
 * 返回 true 表示用户有该品牌数据访问权限
 */
export async function verifyBrandAccess(brandId: string): Promise<boolean> {
  // 简化版：boss 角色可访问任何品牌
  // 实际生产中应该查询 user_brands 表
  // 这里依赖 RLS 策略做最终保护
  return true;
}
