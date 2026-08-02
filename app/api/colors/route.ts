import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/client";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient(request);
    const { data, error } = await supabase
      .from("colors")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: "获取颜色数据失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase, tenant } = ctx;

    const body = await request.json();
    const { name, hex, usage, season } = body;

    const { data, error } = await supabase
      .from("colors")
      .insert([{
        name,
        hex: hex || null,
        usage: usage || null,
        season: season || null,
        company_id: tenant.company_id || null,
        brand_id: tenant.brand_id || null,
      }])
      .select();

    if (error) throw error;
    return NextResponse.json(data?.[0] || {}, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "保存颜色失败" }, { status: 500 });
  }
}
