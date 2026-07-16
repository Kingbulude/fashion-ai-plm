import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();
    if (error || !data) {
      return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取供应商失败" }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, type, contact, phone, email, capabilities, qualityScore, deliveryScore, priceLevel } = body;

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (contact !== undefined) updateData.contact = contact;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (capabilities !== undefined) updateData.capabilities = capabilities;
    if (qualityScore !== undefined) updateData.quality_score = Number(qualityScore);
    if (deliveryScore !== undefined) updateData.delivery_score = Number(deliveryScore);
    if (priceLevel !== undefined) updateData.price_level = priceLevel;

    const { data, error } = await supabase.from("suppliers").update(updateData).eq("id", id).select().single();
    if (error || !data) {
      return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
    }
    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新供应商失败" }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "删除供应商失败" }, { status: 500 });
    }
    return NextResponse.json({ message: "删除成功" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "删除供应商失败" }, { status: 500 });
  }
}
