import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("qc_records")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: "获取质检记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { styleId, process, result, defects, batch } = body;
    
    const { data: styleData } = await supabase
      .from("styles")
      .select("name")
      .eq("id", styleId)
      .single();
    
    const { data, error } = await supabase
      .from("qc_records")
      .insert([{
        style_id: styleId || null,
        style_name: styleData?.name || "未知款式",
        process: process || null,
        result: result || "pending",
        defects: defects || null,
        batch: batch || null,
      }])
      .select();
    
    if (error) throw error;
    return NextResponse.json(data?.[0] || {}, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "保存质检记录失败" }, { status: 500 });
  }
}