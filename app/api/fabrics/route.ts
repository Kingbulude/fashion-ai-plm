import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

// 面料物料库 API
// - GET: 按租户分页/筛选面料
// - POST: 新增面料

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const url = new URL(request.url);
    const search = url.searchParams.get("search") || "";
    const status = url.searchParams.get("status") || "";
    const sortBy = url.searchParams.get("sortBy") || "created_at";
    const sortOrder = url.searchParams.get("sortOrder") || "desc";

    let query = supabase
      .from("fabrics")
      .select("*", { count: "exact" })
      .order(sortBy, { ascending: sortOrder === "asc" });

    if (tenant.company_id) {
      query = query.eq("company_id", tenant.company_id);
    }
    if (tenant.brand_id) {
      query = query.eq("brand_id", tenant.brand_id);
    }
    if (status) {
      query = query.eq("status", status);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,composition.ilike.%${search}%,supplier.ilike.%${search}%`);
    }

    const { data, error, count } = await query;
    if (error) {
      console.error("查询面料失败:", error);
      return NextResponse.json({ error: "查询面料失败" }, { status: 500 });
    }

    return NextResponse.json({
      items: toCamelCase(data) || [],
      count: count || 0,
    });
  } catch (err) {
    console.error("面料 API 错误:", err);
    return NextResponse.json({ error: "获取面料数据失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

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
      .insert([{
        name,
        supplier: supplier || null,
        supplier_id: supplierId || null,
        composition: composition || null,
        price: price ? Number(price) : null,
        usage: usage || null,
        status: status || "active",
        color: color || null,
        width: width || null,
        weight: weight || null,
        moq: moq ? Number(moq) : null,
        lead_time: leadTime ? Number(leadTime) : null,
        remark: remark || null,
        company_id: tenant.company_id || null,
        brand_id: tenant.brand_id || null,
      }])
      .select()
      .single();

    if (error) {
      console.error("保存面料失败:", error);
      return NextResponse.json({ error: "保存面料失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch (err) {
    console.error("面料 API 错误:", err);
    return NextResponse.json({ error: "保存面料失败" }, { status: 500 });
  }
}
