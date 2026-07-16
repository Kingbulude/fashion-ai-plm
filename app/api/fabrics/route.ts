import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("fabrics")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: "获取面料数据失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, supplier, composition, price, usage, status } = body;
    
    const { data, error } = await supabase
      .from("fabrics")
      .insert([{
        name,
        supplier: supplier || null,
        composition: composition || null,
        price: price ? Number(price) : null,
        usage: usage || null,
        status: status || "pending",
      }])
      .select();
    
    if (error) throw error;
    return NextResponse.json(data?.[0] || {}, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "保存面料失败" }, { status: 500 });
  }
}