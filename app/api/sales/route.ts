import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("sales")
      .select("*, styles:style_id(name, category)")
      .order("sale_date", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取销售数据失败" }, { status: 500 });
    }

    const sales = (toCamelCase(data) || []) as any[];

    const totalRevenue = sales.reduce((sum: number, s: any) => sum + (s.amount || 0), 0);
    const totalQuantity = sales.reduce((sum: number, s: any) => sum + (s.quantity || 0), 0);

    return NextResponse.json({ sales, summary: { totalRevenue, totalQuantity } });
  } catch {
    return NextResponse.json({ error: "获取销售数据失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { styleId, saleDate, quantity, amount, channel, customerInfo } = body;

    if (!styleId || !saleDate || !quantity || !amount) {
      return NextResponse.json({ error: "必填字段不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("sales")
      .insert({
        style_id: styleId,
        sale_date: saleDate,
        quantity: Number(quantity),
        amount: Number(amount),
        channel: channel || null,
        customer_info: customerInfo || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建销售记录失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建销售记录失败" }, { status: 500 });
  }
}
