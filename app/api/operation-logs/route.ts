import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

// 获取操作日志
export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

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
