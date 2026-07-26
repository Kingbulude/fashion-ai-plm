import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requirePermission } from "@/lib/auth/permission";
import { Permission } from "@/lib/auth/rbac";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    // 查询：本公司供应商 + 全局共享供应商（company_id IS NULL）
    let query = supabase
      .from("suppliers")
      .select("*")
      .order("created_at", { ascending: false });

    if (tenant.company_id) {
      query = query.or(`company_id.eq.${tenant.company_id},company_id.is.null`);
    } else {
      query = query.is("company_id", null);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[GET /api/suppliers]", error);
      return NextResponse.json({ error: "获取供应商失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch (err) {
    console.error("[GET /api/suppliers]", err);
    return NextResponse.json({ error: "获取供应商失败" }, { status: 500 });
  }
}

// 创建供应商需要 APPROVE 权限（PROCESS_OWNER 及以上）
export async function POST(request: Request) {
  return requirePermission(Permission.APPROVE)(request, async (permCtx) => {
    try {
      const tenantCtx = await requireApiAuth(request);
      if ("error" in tenantCtx) return tenantCtx.error;
      const { tenant } = tenantCtx;

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

      if (!tenant.company_id) {
        return NextResponse.json(
          { error: "当前用户未归属公司，无法创建供应商" },
          { status: 403 }
        );
      }

      const { data, error } = await permCtx.supabase
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
          company_id: tenant.company_id,
        })
        .select()
        .single();

      if (error) {
        console.error("[POST /api/suppliers]", error);
        return NextResponse.json({ error: "创建供应商失败" }, { status: 500 });
      }

      return NextResponse.json(toCamelCase(data), { status: 201 });
    } catch (err) {
      console.error("[POST /api/suppliers]", err);
      return NextResponse.json({ error: "创建供应商失败" }, { status: 500 });
    }
  });
}
