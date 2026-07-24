import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId");
    const brandId = url.searchParams.get("brandId");

    let query = supabase
      .from("brands")
      .select("id, name, logo_url, company_id")
      .order("name");

    if (companyId) {
      query = query.eq("company_id", companyId);
    }
    if (brandId) {
      query = query.eq("id", brandId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取品牌列表失败:", error);
      // 即使失败也返回默认品牌
      return NextResponse.json({
        data: [
          {
            id: "00000000-0000-0000-0000-000000000001",
            name: "TEPNIX步戌",
            logo_url: null,
            company_id: "00000000-0000-0000-0000-000000000010",
          },
        ],
      });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("获取品牌列表失败:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
