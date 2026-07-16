import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("sampling_records")
      .select("*, suppliers:factory_id(name)")
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

    const { data, error } = await supabase
      .from("sampling_records")
      .insert({
        style_id: id,
        round: round ?? 1,
        factory_id: factoryId ?? null,
        status: status || "pending",
        sent_date: sentDate ?? null,
        received_date: receivedDate ?? null,
        feedback: feedback ?? null,
        revision_notes: revisionNotes ?? null,
        qc_result: qcResult ?? null,
      })
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
