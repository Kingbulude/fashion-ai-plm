// AI 建议记录 API
// 创建/查询款式衍生等 Skill 生成的建议

import { NextResponse } from "next/server";
import { requireApiAuth, withTenant } from "@/lib/auth/tenant-helpers";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;

    const { user, supabase, tenant } = ctx;
    const body = await request.json().catch(() => ({}));
    const { skillId, processNode, context, result, status } = body;

    if (!result || typeof result !== "object") {
      return NextResponse.json({ error: "缺少 result" }, { status: 400 });
    }

    const insertData = withTenant(
      {
        skill_id: skillId || null,
        user_id: user.id,
        process_node: processNode || "design",
        context: context || {},
        result,
        status: status || "pending",
      },
      tenant
    );

    const { data, error } = await supabase
      .from("ai_recommendations")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("[ai/recommendations] insert error:", error);
      return NextResponse.json({ error: "创建建议失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch (error: any) {
    console.error("[ai/recommendations] POST error:", error);
    return NextResponse.json({ error: error?.message || "创建建议失败" }, { status: 500 });
  }
}

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;

    const { supabase, tenant } = ctx;
    const { searchParams } = new URL(request.url);

    const skillId = searchParams.get("skillId");
    const statusFilter = searchParams.get("status");
    const processNode = searchParams.get("processNode");
    const limit = parseInt(searchParams.get("limit") || "50", 10);

    let query = supabase
      .from("ai_recommendations")
      .select("*")
      .eq("company_id", tenant.company_id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (tenant.brand_id) {
      query = query.eq("brand_id", tenant.brand_id);
    }
    if (skillId) query = query.eq("skill_id", skillId);
    if (statusFilter) query = query.eq("status", statusFilter);
    if (processNode) query = query.eq("process_node", processNode);

    const { data, error } = await query;

    if (error) {
      console.error("[ai/recommendations] query error:", error);
      return NextResponse.json({ error: "查询建议失败" }, { status: 500 });
    }

    const items = (toCamelCase(data) as any[]) || [];
    return NextResponse.json(items);
  } catch (error: any) {
    console.error("[ai/recommendations] GET error:", error);
    return NextResponse.json({ error: error?.message || "查询建议失败" }, { status: 500 });
  }
}
