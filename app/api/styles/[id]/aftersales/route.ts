// 款式售后明细 API

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("aftersales_records")
      .select("*")
      .eq("style_id", id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ records: [] });
    }

    const rawRecords = toCamelCase(data);
    const records: any[] = Array.isArray(rawRecords) ? rawRecords : [];
    const summary = {
      total: records.length,
      return: records.filter((r: any) => r.type === "return").length,
      exchange: records.filter((r: any) => r.type === "exchange").length,
      complaint: records.filter((r: any) => r.type === "complaint").length,
      totalAmount: records.reduce((s: number, r: any) => s + (r.amount || 0), 0),
    };

    return NextResponse.json({ records, summary });
  } catch {
    return NextResponse.json({ records: [] });
  }
}
