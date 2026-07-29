import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth, withTenant } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase, tenant } = ctx;

    if (!tenant.company_id || !tenant.brand_id) {
      return NextResponse.json([]);
    }

    let query = supabase
      .from("planning")
      .select("*")
      .eq("company_id", tenant.company_id)
      .eq("brand_id", tenant.brand_id)
      .order("created_at", { ascending: false });

    // 如果前端通过 header 传入了具体季次，则按季次过滤
    if (tenant.season_id) {
      query = query.eq("season_id", tenant.season_id);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[planning] GET error:", error);
      return NextResponse.json({ error: "获取企划数据失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch {
    return NextResponse.json({ error: "获取企划数据失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase, tenant } = ctx;

    const body = await request.json();
    const { season, theme, category, targetCost, timeline, aiTrendAnalysis, inspirationTags, seasonId } = body;

    if (!season || !theme) {
      return NextResponse.json({ error: "季节和主题不能为空" }, { status: 400 });
    }

    const payload = withTenant(
      {
        season,
        theme,
        category: category || null,
        target_cost: targetCost ? Number(targetCost) : null,
        timeline: timeline || null,
        ai_trend_analysis: aiTrendAnalysis || null,
        inspiration_tags: inspirationTags || null,
        season_id: seasonId || tenant.season_id || null,
      },
      tenant
    );

    const { data, error } = await supabase.from("planning").insert(payload).select().single();

    if (error) {
      console.error("[planning] POST error:", error);
      return NextResponse.json({ error: "创建企划失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建企划失败" }, { status: 500 });
  }
}
