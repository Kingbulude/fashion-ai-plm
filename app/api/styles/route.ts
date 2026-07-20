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

    let query = supabase.from("styles").select("*").order("created_at", { ascending: false });
    if (brandId) {
      query = query.eq("brand_id", brandId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: "获取款式列表失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch (error) {
    return NextResponse.json({ error: "获取款式列表失败" }, { status: 500 });
  }
}
