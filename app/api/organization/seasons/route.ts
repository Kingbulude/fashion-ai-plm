// 组织架构 API 转发路由
// 为 tenant-context 提供统一的 /api/organization/* 入口
import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const brandId = url.searchParams.get("brandId");

    if (!brandId) {
      return NextResponse.json({ data: [] });
    }

    const { data: seasons, error } = await supabase
      .from("seasons")
      .select("*")
      .eq("brand_id", brandId)
      .order("year", { ascending: false })
      .order("season_type", { ascending: false });

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
