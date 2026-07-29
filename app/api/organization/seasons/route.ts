// 组织架构 API 转发路由
// 为 tenant-context 提供统一的 /api/organization/* 入口
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase, tenant } = ctx;

    const url = new URL(request.url);
    const brandId = url.searchParams.get("brandId");
    const companyId = url.searchParams.get("companyId") || tenant.company_id;

    let brandIds: string[] = [];

    if (brandId) {
      brandIds = [brandId];
    } else if (companyId) {
      // 先查询该公司下可见的品牌列表（RLS 会自动过滤权限）
      const { data: brands } = await supabase
        .from("brands")
        .select("id")
        .eq("company_id", companyId);
      brandIds = (brands || []).map((b) => b.id);
    }

    let query = supabase
      .from("seasons")
      .select("*")
      .order("year", { ascending: false })
      .order("season_type", { ascending: false });

    if (brandIds.length > 0) {
      query = query.in("brand_id", brandIds);
    } else {
      // 没有任何可访问品牌时，返回空结果
      return NextResponse.json({ data: [] });
    }

    const { data: seasons, error } = await query;

    if (error) {
      console.error("获取季节列表失败:", error);
      return NextResponse.json({ data: [] });
    }

    return NextResponse.json({ data: seasons || [] });
  } catch (error) {
    console.error("获取季节列表失败:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
