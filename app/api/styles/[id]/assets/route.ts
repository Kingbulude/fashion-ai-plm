import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { uploadFile } from "@/lib/storage/supabase-storage";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    const { data, error } = await supabase
      .from("design_assets")
      .select("*")
      .eq("style_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取设计资产失败" }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch {
    return NextResponse.json({ error: "获取设计资产失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const formData = await request.formData();

    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;
    const aiTags = formData.get("aiTags") as string | null;
    const aiAnalysis = formData.get("aiAnalysis") as string | null;

    if (!file || !type) {
      return NextResponse.json({ error: "缺少文件或类型参数" }, { status: 400 });
    }

    // 上传文件到 Supabase Storage
    const { url: fileUrl, path: filePath } = await uploadFile(file, `styles/${id}`);

    // 获取当前最大版本号
    const { data: existingAssets } = await supabase
      .from("design_assets")
      .select("version")
      .eq("style_id", id);

    const maxVersion =
      existingAssets && existingAssets.length > 0
        ? Math.max(...existingAssets.map((a: { version: number }) => a.version))
        : 0;

    // 将旧版本设为非活跃
    await supabase
      .from("design_assets")
      .update({ is_active: false })
      .eq("style_id", id);

    // 插入新资产记录
    const { data, error } = await supabase
      .from("design_assets")
      .insert({
        style_id: id,
        type,
        file_name: file.name,
        file_url: fileUrl,
        file_path: filePath,
        thumbnail_url: fileUrl,
        version: maxVersion + 1,
        ai_tags: aiTags,
        ai_analysis: aiAnalysis,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "保存设计资产记录失败" }, { status: 500 });
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "上传设计资产失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
