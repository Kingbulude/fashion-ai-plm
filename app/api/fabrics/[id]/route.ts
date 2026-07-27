// 面料详情 API
// 获取 / 更新 / 删除单条面料记录

import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

// GET: 获取面料详情
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const { data, error } = await supabase
      .from("fabrics")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      console.error("[GET /api/fabrics/[id]]", error);
      return NextResponse.json({ error: "获取面料失败" }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: "面料不存在" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch (err) {
    console.error("[GET /api/fabrics/[id]]", err);
    return NextResponse.json({ error: "获取面料失败" }, { status: 500 });
  }
}

// PATCH: 更新面料
export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const body = await request.json();
    const {
      name,
      supplier,
      supplierId,
      composition,
      price,
      usage,
      status,
      color,
      width,
      weight,
      moq,
      leadTime,
      remark,
    } = body;

    if (!name) {
      return NextResponse.json({ error: "面料名称不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("fabrics")
      .update({
        name,
        supplier: supplier ?? null,
        supplier_id: supplierId ?? null,
        composition: composition ?? null,
        price: price ? Number(price) : null,
        usage: usage ?? null,
        status: status ?? "active",
        color: color ?? null,
        width: width ?? null,
        weight: weight ?? null,
        moq: moq ? Number(moq) : null,
        lead_time: leadTime ? Number(leadTime) : null,
        remark: remark ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[PATCH /api/fabrics/[id]]", error);
      return NextResponse.json({ error: "更新面料失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch (err) {
    console.error("[PATCH /api/fabrics/[id]]", err);
    return NextResponse.json({ error: "更新面料失败" }, { status: 500 });
  }
}

// DELETE: 删除面料
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const { error } = await supabase.from("fabrics").delete().eq("id", id);

    if (error) {
      console.error("[DELETE /api/fabrics/[id]]", error);
      return NextResponse.json({ error: "删除面料失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/fabrics/[id]]", err);
    return NextResponse.json({ error: "删除面料失败" }, { status: 500 });
  }
}
