import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

const DEFAULT_COMPANY = "00000000-0000-0000-0000-000000000010";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const styleId = searchParams.get("styleId");
    const status = searchParams.get("status");

    let query = supabase
      .from("design_feedback_items")
      .select("*, styles:style_id(style_no, style_name)")
      .eq("company_id", companyId);

    if (styleId) query = query.eq("style_id", styleId);
    if (status) query = query.eq("status", status);

    query = query.order("priority", { ascending: false }).order("created_at", { ascending: false });

    const { data, error } = await query;
    if (error) throw error;

    const items = (toCamelCase(data) || []) as any[];

    const stats = {
      total: items.length,
      pending: items.filter((i: any) => i.status === "pending").length,
      inProgress: items.filter((i: any) => i.status === "in_progress").length,
      resolved: items.filter((i: any) => i.status === "resolved").length,
      critical: items.filter((i: any) => i.severity === "critical").length,
    };

    const categoryStats: Record<string, number> = {};
    for (const item of items) {
      if (item.defectCategory) {
        categoryStats[item.defectCategory] = (categoryStats[item.defectCategory] || 0) + 1;
      }
    }

    return NextResponse.json({ items, stats, categoryStats });
  } catch {
    return NextResponse.json({ error: "获取设计反馈失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { styleId, title, description, defectCategory, severity, priority, relatedAftersaleIds } = body;

    if (!styleId || !title?.trim()) {
      return NextResponse.json({ error: "款式和标题不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("design_feedback_items")
      .insert({
        company_id: companyId,
        style_id: styleId,
        feedback_type: "defect",
        defect_category: defectCategory || null,
        title: title.trim(),
        description: description || null,
        severity: severity || "minor",
        priority: priority || "medium",
        related_aftersale_ids: relatedAftersaleIds || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建设计反馈失败" }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, priority, severity, description } = body;

    if (!id) {
      return NextResponse.json({ error: "ID不能为空" }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (status) updateData.status = status;
    if (priority) updateData.priority = priority;
    if (severity) updateData.severity = severity;
    if (description !== undefined) updateData.description = description;

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "请提供更新字段" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("design_feedback_items")
      .update(updateData)
      .eq("id", id)
      .eq("company_id", companyId)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新设计反馈失败" }, { status: 500 });
  }
}
