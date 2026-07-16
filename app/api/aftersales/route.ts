import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("aftersales")
      .select("*, styles:style_id(name)")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取售后记录失败" }, { status: 500 });
    }

    const records = (toCamelCase(data) || []) as any[];

    const summary = {
      totalCount: records.length,
      returnCount: records.filter((r: any) => r.type === "return").length,
      exchangeCount: records.filter((r: any) => r.type === "exchange").length,
      complaintCount: records.filter((r: any) => r.type === "complaint").length,
    };

    return NextResponse.json({ records, summary });
  } catch {
    return NextResponse.json({ error: "获取售后记录失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { styleId, type, reason, amount, resolution, customerInfo } = body;

    if (!styleId || !type || !reason) {
      return NextResponse.json({ error: "必填字段不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("aftersales")
      .insert({
        style_id: styleId,
        type,
        reason,
        amount: Number(amount) || null,
        resolution: resolution || null,
        customer_info: customerInfo || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建售后记录失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建售后记录失败" }, { status: 500 });
  }
}
