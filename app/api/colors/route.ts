import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export async function GET() {
  try {
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
    const body = await request.json();
    const { name, hex, usage, season } = body;
    
    const { data, error } = await supabase
      .from("colors")
      .insert([{
        name,
        hex: hex || null,
        usage: usage || null,
        season: season || null,
      }])
      .select();
    
    if (error) throw error;
    return NextResponse.json(data?.[0] || {}, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "保存颜色失败" }, { status: 500 });
  }
}