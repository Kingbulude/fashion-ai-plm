import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { resolveStyleTenant, withTenant } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("sampling_records")
      .select("*")
      .eq("style_id", id)
      .order("round", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "获取打样记录失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch {
    return NextResponse.json({ error: "获取打样记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { round, factoryId, status, sentDate, receivedDate, feedback, revisionNotes, qcResult } = body;

    // 自动从款式继承租户字段（多品牌隔离）
    const { tenant, error: tenantError } = await resolveStyleTenant(id);
    if (tenantError) {
      return NextResponse.json({ error: tenantError }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("sampling_records")
      .insert(
        withTenant(
          {
            style_id: id,
            round: round ?? 1,
            factory_id: factoryId ?? null,
            status: status || "pending",
            sent_date: sentDate ?? null,
            received_date: receivedDate ?? null,
            feedback: feedback ?? null,
            revision_notes: revisionNotes ?? null,
            qc_result: qcResult ?? null,
          },
          tenant
        )
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建打样记录失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建打样记录失败" }, { status: 500 });
  }
}
