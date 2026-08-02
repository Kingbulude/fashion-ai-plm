// 款式 API - 列表（多品牌隔离 + 多维度筛选）/ 创建
// 集团多品牌架构下，所有款式都自动归属当前选中品牌

import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth, withTenant } from "@/lib/auth/tenant-helpers";
import { RoleLevel } from "@/lib/auth/rbac";
import { validateBody, styleCreateSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

const DEFAULT_BRAND = "00000000-0000-0000-0000-000000000001";

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase, roleLevel } = ctx;

    if (!tenant.company_id) {
      return NextResponse.json({ error: "未加入公司" }, { status: 400 });
    }

    // 仅 BOSS/ADMIN/品牌负责人可创建款式
    if (
      roleLevel !== RoleLevel.BOSS &&
      roleLevel !== RoleLevel.ADMIN &&
      roleLevel !== RoleLevel.BRAND_MANAGER
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();

    const validation = validateBody(styleCreateSchema, body);
    if (!validation.ok) return validation.response;
    const { styleNo, name, season, category, description, targetCost, status, seasonId } = validation.data;

    // 多品牌：从可信租户上下文获取品牌（TenantSwitcher 设置）
    const effectiveTenant = {
      company_id: tenant.company_id,
      brand_id: tenant.brand_id || DEFAULT_BRAND,
      season_id: tenant.season_id || seasonId || null,
    };

    // 款号唯一性检查（仅在当前品牌内）
    const { data: existing } = await supabase
      .from("styles")
      .select("id")
      .eq("brand_id", effectiveTenant.brand_id)
      .eq("style_no", styleNo);
    if (existing && existing.length > 0) {
      return NextResponse.json({ error: "款号已存在" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("styles")
      .insert(
        withTenant(
          {
            style_no: styleNo,
            name,
            season,
            category,
            description,
            target_cost: targetCost ? Number(targetCost) : null,
            status: status || "planning",
          },
          effectiveTenant
        )
      )
      .select()
      .single();

    if (error) {
      console.error("创建款式失败:", error);
      return NextResponse.json({ error: "创建款式失败", detail: error.message }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "创建款式失败" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase, roleLevel, user } = ctx;

    if (!tenant.company_id) {
      return NextResponse.json([]);
    }

    // 计算当前用户可访问品牌
    let allowedBrandIds: string[] = [];
    if (roleLevel === RoleLevel.BOSS || roleLevel === RoleLevel.ADMIN) {
      const { data: brands } = await supabase
        .from("brands")
        .select("id")
        .eq("company_id", tenant.company_id);
      allowedBrandIds = (brands || []).map((b: any) => b.id);
    } else {
      const { data: ub } = await supabase
        .from("user_brands")
        .select("brand_id")
        .eq("user_id", user.id);
      allowedBrandIds = (ub || []).map((x: any) => x.brand_id);
    }

    if (allowedBrandIds.length === 0) {
      return NextResponse.json([]);
    }

    const url = new URL(request.url);
    const requestedBrandId = url.searchParams.get("brandId") || tenant.brand_id;
    const seasonId = url.searchParams.get("seasonId") || tenant.season_id;
    const statusFilter = url.searchParams.get("status");
    const categoryFilter = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const sortBy = url.searchParams.get("sortBy") || "updated_at";
    const order = url.searchParams.get("order") || "desc";
    const includeStats = url.searchParams.get("includeStats") === "true";

    // 如果请求指定了品牌，校验是否有权限查看
    let brandIds = allowedBrandIds;
    if (requestedBrandId) {
      if (!allowedBrandIds.includes(requestedBrandId)) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      brandIds = [requestedBrandId];
    }

    let query = supabase
      .from("styles")
      .select("*")
      .in("brand_id", brandIds)
      .order(sortBy, { ascending: order === "asc" });

    if (seasonId) {
      query = query.eq("season_id", seasonId);
    }
    if (statusFilter) {
      // 支持逗号分隔的多状态: "planning,designing"
      const statuses = statusFilter.split(",").map((s) => s.trim()).filter(Boolean);
      if (statuses.length === 1) {
        query = query.eq("status", statuses[0]);
      } else if (statuses.length > 1) {
        query = query.in("status", statuses);
      }
    }
    if (categoryFilter) {
      query = query.eq("category", categoryFilter);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,style_no.ilike.%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取款式列表失败:", error);
      return NextResponse.json({ error: "获取款式列表失败" }, { status: 500 });
    }

    const styles = (toCamelCase(data) as any[]) || [];

    // 包含阶段统计
    if (includeStats) {
      const stats: Record<string, number> = {};
      for (const s of styles) {
        stats[s.status] = (stats[s.status] || 0) + 1;
      }
      return NextResponse.json({
        data: styles,
        total: styles.length,
        stats,
      });
    }

    return NextResponse.json(styles);
  } catch (error) {
    console.error("获取款式列表失败:", error);
    return NextResponse.json({ error: "获取款式列表失败" }, { status: 500 });
  }
}
