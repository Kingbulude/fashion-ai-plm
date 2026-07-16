import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("ai_images")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: "获取图片失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { styleName, styleId, description, styleType, colors } = body;
    
    const mockUrl = "https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=fashion%20product%20photo%20" + encodeURIComponent(styleName || "clothing") + "&image_size=square";
    
    const { data, error } = await supabase
      .from("ai_images")
      .insert([{
        style_id: styleId || null,
        style_name: styleName || "未命名",
        description: description || null,
        style_type: styleType || "realistic",
        colors: colors || null,
        image_url: mockUrl,
      }])
      .select();
    
    if (error) throw error;
    return NextResponse.json(data?.[0] || {}, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "生成图片失败" }, { status: 500 });
  }
}