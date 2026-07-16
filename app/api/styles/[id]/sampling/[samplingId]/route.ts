import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string; samplingId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { samplingId } = await params;
    const { data, error } = await supabase
      .from("sampling_records")
      .select("*")
      .eq("id", samplingId)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "打样记录不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取打样记录失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { samplingId } = await params;
    const body = await request.json();
    const { round, factoryId, status, sentDate, receivedDate, feedback, revisionNotes, qcResult, approved } = body;

    const updateData: Record<string, unknown> = {};
    if (round !== undefined) updateData.round = round;
    if (factoryId !== undefined) updateData.factory_id = factoryId;
    if (status !== undefined) updateData.status = status;
    if (sentDate !== undefined) updateData.sent_date = sentDate;
    if (receivedDate !== undefined) updateData.received_date = receivedDate;
    if (feedback !== undefined) updateData.feedback = feedback;
    if (revisionNotes !== undefined) updateData.revision_notes = revisionNotes;
    if (qcResult !== undefined) updateData.qc_result = qcResult;
    if (approved !== undefined) updateData.approved = approved;

    const { data, error } = await supabase
      .from("sampling_records")
      .update(updateData)
      .eq("id", samplingId)
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "打样记录不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新打样记录失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { samplingId } = await params;
    const { error } = await supabase.from("sampling_records").delete().eq("id", samplingId);
    if (error) {
      return NextResponse.json({ error: "删除打样记录失败" }, { status: 500 });
    }
    return NextResponse.json({ message: "删除成功" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "删除打样记录失败" }, { status: 500 });
  }
}
