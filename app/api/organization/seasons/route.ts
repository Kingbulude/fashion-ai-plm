// 组织架构 API 转发路由
// 为 tenant-context 提供统一的 /api/organization/* 入口
import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const url = new URL(request.url);
    const brandId = url.searchParams.get("brandId");

    let query = supabase
      .from("seasons")
      .select("*")
      .order("year", { ascending: false })
      .order("season_type", { ascending: false });

    if (brandId) {
      query = query.eq("brand_id", brandId);
    } else {
      // 未传 brandId 时，返回当前用户所在公司的所有季节
      query = query.filter(
        "brand_id",
        "in",
        `(SELECT id FROM brands WHERE company_id IN (SELECT company_id FROM profiles WHERE user_id = auth.uid()))`
      );
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
