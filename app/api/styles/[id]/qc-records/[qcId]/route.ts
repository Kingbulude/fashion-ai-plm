import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { validateBody, qcRecordUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string; qcId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { qcId } = await params;
    const { data, error } = await supabase.from("qc_records").select("*").eq("id", qcId).single();
    if (error || !data) {
      return NextResponse.json({ error: "质检记录不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取质检记录失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { qcId } = await params;
    const body = await request.json();
    const validation = validateBody(qcRecordUpdateSchema, body);
    if (!validation.ok) return validation.response;
    const { type, refId, result, defects, photos, inspector } = validation.data;

    const updateData: Record<string, unknown> = {};
    if (type !== undefined) updateData.type = type;
    if (refId !== undefined) updateData.ref_id = refId;
    if (result !== undefined) updateData.result = result;
    if (defects !== undefined) updateData.defects = defects;
    if (photos !== undefined) updateData.photos = photos;
    if (inspector !== undefined) updateData.inspector = inspector;

    const { data, error } = await supabase.from("qc_records").update(updateData).eq("id", qcId).select().single();
    if (error || !data) {
      return NextResponse.json({ error: "质检记录不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新质检记录失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { qcId } = await params;
    const { error } = await supabase.from("qc_records").delete().eq("id", qcId);
    if (error) {
      return NextResponse.json({ error: "删除质检记录失败" }, { status: 500 });
    }
    return NextResponse.json({ message: "删除成功" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "删除质检记录失败" }, { status: 500 });
  }
}
