import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";

export const runtime = "edge";

// 获取操作日志
export async function GET(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const brandId = url.searchParams.get("brand_id");
    const limit = parseInt(url.searchParams.get("limit") || "50");

    let query = supabase
      .from("operation_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (brandId) {
      query = query.eq("brand_id", brandId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch logs:", error);
    return NextResponse.json([]);
  }
}
