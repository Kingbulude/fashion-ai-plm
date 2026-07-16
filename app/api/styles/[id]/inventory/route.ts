import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("inventory")
      .select("*")
      .eq("style_id", id)
      .order("color")
      .order("size");

    if (error) {
      return NextResponse.json({ error: "获取库存失败" }, { status: 500 });
    }

    const inventory = (toCamelCase(data) || []) as any[];

    const totalQuantity = inventory.reduce((sum: number, item: any) => sum + Number(item.quantity), 0);

    const colors = [...new Set(inventory.map((item: any) => item.color))];
    const sizes = [...new Set(inventory.map((item: any) => item.size))];

    const summary = colors.map((color) => ({
      color,
      total: inventory.filter((item: any) => item.color === color).reduce((sum: number, item: any) => sum + Number(item.quantity), 0),
      sizes: sizes.map((size) => {
        const item = inventory.find((i: any) => i.color === color && i.size === size);
        return { size, quantity: item ? Number(item.quantity) : 0 };
      }),
    }));

    return NextResponse.json({ inventory, totalQuantity, summary });
  } catch {
    return NextResponse.json({ error: "获取库存失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { color, size, quantity, warehouse } = body;

    if (!color || !size || quantity === undefined) {
      return NextResponse.json({ error: "颜色、尺码和数量不能为空" }, { status: 400 });
    }

    const existing = await supabase.from("inventory").select("id, quantity").eq("style_id", id).eq("color", color).eq("size", size).single();
    
    if (existing.data) {
      const newQuantity = Number(existing.data.quantity) + Number(quantity);
      const { data, error } = await supabase.from("inventory").update({ quantity: newQuantity, warehouse }).eq("id", existing.data.id).select().single();
      if (error) {
        return NextResponse.json({ error: "更新库存失败" }, { status: 500 });
      }
      return NextResponse.json(toCamelCase(data));
    }

    const { data, error } = await supabase
      .from("inventory")
      .insert({
        style_id: id,
        color,
        size,
        quantity: Number(quantity),
        warehouse: warehouse || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建库存记录失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建库存记录失败" }, { status: 500 });
  }
}
