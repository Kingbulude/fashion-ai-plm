import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string; techPackId: string }> };

// 获取单个工艺包
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { techPackId } = await params;

    const { data, error } = await supabase
      .from("tech_packs")
      .select("*")
      .eq("id", techPackId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "工艺包不存在" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取工艺包失败" }, { status: 500 });
  }
}

// 更新工艺包
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { techPackId } = await params;
    const body = await request.json();

    const { sizeChart, processNotes, sewingStandard, printEmbroidery, approved } = body;

    const updateData: Record<string, unknown> = {};
    if (sizeChart !== undefined) updateData.size_chart = sizeChart;
    if (processNotes !== undefined) updateData.process_notes = processNotes;
    if (sewingStandard !== undefined) updateData.sewing_standard = sewingStandard;
    if (printEmbroidery !== undefined) updateData.print_embroidery = printEmbroidery;
    if (approved !== undefined) updateData.approved = approved;

    const { data, error } = await supabase
      .from("tech_packs")
      .update(updateData)
      .eq("id", techPackId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "工艺包不存在" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新工艺包失败" }, { status: 500 });
  }
}

// 删除工艺包
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { techPackId } = await params;

    const { error } = await supabase
      .from("tech_packs")
      .delete()
      .eq("id", techPackId);

    if (error) {
      return NextResponse.json({ error: "删除工艺包失败" }, { status: 500 });
    }

    return NextResponse.json({ message: "删除成功" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "删除工艺包失败" }, { status: 500 });
  }
}
