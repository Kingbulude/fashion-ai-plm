import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

// 获取款式的所有工艺包（按版本倒序）
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const { data, error } = await supabase
      .from("tech_packs")
      .select("*")
      .eq("style_id", id)
      .order("version", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取工艺包失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch {
    return NextResponse.json({ error: "获取工艺包失败" }, { status: 500 });
  }
}

// 新建工艺包（支持指定版本，或自动 +1）
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();

    const { sizeChart, processNotes, sewingStandard, printEmbroidery, aiGenerated, approved } = body;

    // 获取当前最大版本号
    const { data: existing } = await supabase
      .from("tech_packs")
      .select("version")
      .eq("style_id", id);

    const maxVersion =
      existing && existing.length > 0
        ? Math.max(...existing.map((t: { version: number }) => t.version))
        : 0;

    const { data, error } = await supabase
      .from("tech_packs")
      .insert({
        style_id: id,
        version: maxVersion + 1,
        size_chart: sizeChart ?? null,
        process_notes: processNotes ?? null,
        sewing_standard: sewingStandard ?? null,
        print_embroidery: printEmbroidery ?? null,
        ai_generated: aiGenerated ?? false,
        approved: approved ?? false,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建工艺包失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建工艺包失败" }, { status: 500 });
  }
}
