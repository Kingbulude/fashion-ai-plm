import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { requirePermission } from "@/lib/auth/permission";
import { Permission } from "@/lib/auth/rbac";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { data, error } = await dbAdmin
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取供应商失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch {
    return NextResponse.json({ error: "获取供应商失败" }, { status: 500 });
  }
}

// 创建供应商需要 APPROVE 权限（PROCESS_OWNER 及以上）
export async function POST(request: Request) {
  return requirePermission(Permission.APPROVE)(request, async () => {
    try {
      const ctx = await requireApiAuth(request);
      if ("error" in ctx) return ctx.error;
      const { supabase } = ctx;

      const body = await request.json();
      const {
        name,
        type,
        contact,
        phone,
        email,
        capabilities,
        qualityScore,
        deliveryScore,
        priceLevel,
      } = body;

      if (!name || !type) {
        return NextResponse.json(
          { error: "供应商名称和类型不能为空" },
          { status: 400 }
        );
      }

      const { data, error } = await dbAdmin
        .from("suppliers")
        .insert({
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
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: "创建供应商失败" }, { status: 500 });
      }

      return NextResponse.json(toCamelCase(data), { status: 201 });
    } catch {
      return NextResponse.json({ error: "创建供应商失败" }, { status: 500 });
    }
  });
}
