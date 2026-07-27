import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { transitionStyle } from "@/lib/workflow/style-transition";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string; samplingId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

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
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

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

    const { data: record, error: recordError } = await supabase
      .from("sampling_records")
      .select("id, style_id")
      .eq("id", samplingId)
      .single();

    if (recordError || !record) {
      return NextResponse.json({ error: "打样记录不存在" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("sampling_records")
      .update(updateData)
      .eq("id", samplingId)
      .select()
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "更新打样记录失败" }, { status: 500 });
    }

    // 打样审批通过时，自动推进款式状态到封样完成
    if (approved === true && record.style_id) {
      try {
        const { data: style } = await supabase
          .from("styles")
          .select("status, brand_id")
          .eq("id", record.style_id)
          .single();

        if (style && style.status === "sampling") {
          await transitionStyle({
            styleId: record.style_id,
            fromStatus: "sampling",
            toStatus: "sampled",
            event: "sample_approved",
            userId: ctx.user.id,
            brandId: style.brand_id,
            supabase,
          });
        }
      } catch (err) {
        console.error("自动推进款式状态失败:", err);
      }
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新打样记录失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

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
