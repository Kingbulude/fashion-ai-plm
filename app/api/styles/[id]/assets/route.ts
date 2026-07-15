import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    
    const { data, error } = await supabase.from("design_assets").select("*").eq("style_id", id).order("created_at", { ascending: false });
    
    if (error) {
      return NextResponse.json({ error: "获取设计资产失败" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    return NextResponse.json({ error: "获取设计资产失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    
    const { type, fileName, fileUrl, thumbnailUrl, aiTags, aiAnalysis } = body;
    
    if (!type || !fileName || !fileUrl) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const { data: existingAssets } = await supabase.from("design_assets").select("version").eq("style_id", id);
    const maxVersion = existingAssets && existingAssets.length > 0 
      ? Math.max(...existingAssets.map((a: { version: number }) => a.version)) 
      : 0;

    await supabase.from("design_assets").update({ is_active: false }).eq("style_id", id);

    const { data, error } = await supabase.from("design_assets").insert({
      style_id: id,
      type,
      file_name: fileName,
      file_url: fileUrl,
      thumbnail_url: thumbnailUrl,
      version: maxVersion + 1,
      ai_tags: aiTags,
      ai_analysis: aiAnalysis,
      is_active: true,
    }).select().single();

    if (error) {
      return NextResponse.json({ error: "上传设计资产失败" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "上传设计资产失败" }, { status: 500 });
  }
}
