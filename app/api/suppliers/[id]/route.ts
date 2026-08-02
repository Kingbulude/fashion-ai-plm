// 供应商详情 API
// 获取供应商信息 / 合作历史

import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { validateBody, supplierUpdateSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

// GET: 获取供应商详情
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const { data, error } = await supabase.from("suppliers").select("*").eq("id", id).single();

    if (error) {
      return NextResponse.json({ error: "获取供应商失败" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "供应商不存在" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取供应商失败" }, { status: 500 });
  }
}

// PUT: 更新供应商
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const body = await request.json();
    const validation = validateBody(supplierUpdateSchema, body);
    if (!validation.ok) return validation.response;
    const { name, type, contact, phone, email, capabilities, qualityScore, deliveryScore, priceLevel } = validation.data;

    const { data, error } = await supabase
      .from("suppliers")
      .update({
        name,
        type,
        contact: contact ?? null,
        phone: phone ?? null,
        email: email ?? null,
        capabilities: capabilities ?? null,
        quality_score: qualityScore ? Number(qualityScore) : null,
        delivery_score: deliveryScore ? Number(deliveryScore) : null,
        price_level: priceLevel ?? null,
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "更新供应商失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新供应商失败" }, { status: 500 });
  }
}

// DELETE: 删除供应商
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const { error } = await supabase.from("suppliers").delete().eq("id", id);

    if (error) {
      return NextResponse.json({ error: "删除供应商失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除供应商失败" }, { status: 500 });
  }
}
