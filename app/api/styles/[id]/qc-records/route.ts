import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("qc_records")
      .select("*")
      .eq("style_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取质检记录失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch {
    return NextResponse.json({ error: "获取质检记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { type, refId, result, defects, photos, inspector } = body;

    if (!type) {
      return NextResponse.json({ error: "质检类型不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("qc_records")
      .insert({
        style_id: id,
        type,
        ref_id: refId ?? null,
        result: result ?? null,
        defects: defects ?? null,
        photos: photos ?? null,
        inspector: inspector ?? null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建质检记录失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建质检记录失败" }, { status: 500 });
  }
}
