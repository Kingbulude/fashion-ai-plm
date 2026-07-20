// 款式 API - 列表（多品牌隔离 + 多维度筛选）/ 创建
// 集团多品牌架构下，所有款式都自动归属当前选中品牌

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { getTenantFromHeaders, withTenant } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

const DEFAULT_COMPANY = "00000000-0000-0000-0000-000000000010";
const DEFAULT_BRAND = "00000000-0000-0000-0000-000000000001";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { styleNo, name, season, category, description, targetCost, status, seasonId } = body;

    if (!styleNo || !name) {
      return NextResponse.json({ error: "款号和款式名称不能为空" }, { status: 400 });
    }

    // 多品牌：从请求头获取租户（TenantSwitcher 设置）
    const headerTenant = getTenantFromHeaders(request);
    const tenant = headerTenant || { company_id: DEFAULT_COMPANY, brand_id: DEFAULT_BRAND, season_id: seasonId || null };

    // 款号唯一性检查（仅在当前品牌内）
    const { data: existing } = await supabase
      .from("styles")
      .select("id")
      .eq("brand_id", tenant.brand_id)
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
          tenant
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
    const url = new URL(request.url);
    const headerTenant = getTenantFromHeaders(request);
    const brandId = url.searchParams.get("brandId") || headerTenant?.brand_id;
    const seasonId = url.searchParams.get("seasonId") || headerTenant?.season_id;
    const statusFilter = url.searchParams.get("status");
    const categoryFilter = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const sortBy = url.searchParams.get("sortBy") || "updated_at";
    const order = url.searchParams.get("order") || "desc";
    const includeStats = url.searchParams.get("includeStats") === "true";

    let query = supabase
      .from("styles")
      .select("*")
      .order(sortBy, { ascending: order === "asc" });

    if (brandId) {
      query = query.eq("brand_id", brandId);
    }
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
