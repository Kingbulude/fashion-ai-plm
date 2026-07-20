import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const companyId = url.searchParams.get("companyId");

    let query = supabase.from("companies").select("id, name, logo_url").order("name");

    if (companyId) {
      query = query.eq("id", companyId);
    }

    const { data, error } = await query;

    if (error) {
      console.error("获取公司列表失败:", error);
      // 即使失败也返回默认公司
      return NextResponse.json({
        data: [
          {
            id: "00000000-0000-0000-0000-000000000010",
            name: "默认公司",
            logo_url: null,
          },
        ],
      });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("获取公司列表失败:", error);
    return NextResponse.json({ data: [] }, { status: 500 });
  }
}
