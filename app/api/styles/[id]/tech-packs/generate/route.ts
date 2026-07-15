import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { generateTechPack } from "@/lib/ai/cloudflare-ai";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

// AI 生成工艺包草稿（基于款式名称和描述）
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    // 获取款式信息
    const { data: style, error: styleError } = await supabase
      .from("styles")
      .select("name, description")
      .eq("id", id)
      .single();

    if (styleError || !style) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    const aiResult = await generateTechPack(style.name, style.description || "");

    // 解析 AI 返回的 JSON
    const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
    let parsed: Record<string, unknown> = {};
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        // 解析失败则保留空对象
      }
    }

    // 获取当前最大版本号
    const { data: existing } = await supabase
      .from("tech_packs")
      .select("version")
      .eq("style_id", id);

    const maxVersion =
      existing && existing.length > 0
        ? Math.max(...existing.map((t: { version: number }) => t.version))
        : 0;

    // 创建新的 AI 生成工艺包
    const { data, error } = await supabase
      .from("tech_packs")
      .insert({
        style_id: id,
        version: maxVersion + 1,
        size_chart: parsed.sizeChart ?? null,
        process_notes: parsed.processNotes ?? null,
        sewing_standard: parsed.sewingStandard ?? null,
        print_embroidery: parsed.printEmbroidery ?? null,
        ai_generated: true,
        approved: false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "保存 AI 工艺包失败" }, { status: 500 });
    }

    return NextResponse.json({
      techPack: toCamelCase(data),
      bomSuggestion: parsed.bomSuggestion || [],
      raw: aiResult,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 生成工艺包失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
