import { NextResponse } from "next/server";
import { SupabaseClient } from "@supabase/supabase-js";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const { id: supplierId } = await params;
    const companyId = tenant.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { data: ratings, error } = await supabase
      .from("supplier_ratings")
      .select("*, styles:style_id(style_no, style_name), ratedBy:rated_by(full_name)")
      .eq("supplier_id", supplierId)
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    const ratingList = (toCamelCase(ratings) || []) as any[];

    let deliveryAvg = 0, qualityAvg = 0, priceAvg = 0, serviceAvg = 0, overallAvg = 0;
    if (ratingList.length > 0) {
      const validRatings = ratingList.filter((r) => r.overallScore);
      const count = validRatings.length || 1;
      deliveryAvg = validRatings.reduce((sum: number, r: any) => sum + (r.deliveryScore || 0), 0) / count;
      qualityAvg = validRatings.reduce((sum: number, r: any) => sum + (r.qualityScore || 0), 0) / count;
      priceAvg = validRatings.reduce((sum: number, r: any) => sum + (r.priceScore || 0), 0) / count;
      serviceAvg = validRatings.reduce((sum: number, r: any) => sum + (r.serviceScore || 0), 0) / count;
      overallAvg = validRatings.reduce((sum: number, r: any) => sum + (r.overallScore || 0), 0) / count;
    }

    return NextResponse.json({
      ratings: ratingList,
      summary: {
        totalCount: ratingList.length,
        deliveryAvg: Math.round(deliveryAvg * 10) / 10,
        qualityAvg: Math.round(qualityAvg * 10) / 10,
        priceAvg: Math.round(priceAvg * 10) / 10,
        serviceAvg: Math.round(serviceAvg * 10) / 10,
        overallAvg: Math.round(overallAvg * 10) / 10,
      },
    });
  } catch {
    return NextResponse.json({ error: "获取供应商评分失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const { id: supplierId } = await params;
    const companyId = tenant.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { deliveryScore, qualityScore, priceScore, serviceScore, comment, styleId } = body;

    if (deliveryScore === undefined && qualityScore === undefined && priceScore === undefined && serviceScore === undefined) {
      return NextResponse.json({ error: "请至少评价一项" }, { status: 400 });
    }

    const scores = [deliveryScore, qualityScore, priceScore, serviceScore].filter(
      (s) => s !== undefined && s !== null
    ) as number[];
    const overallScore = scores.length > 0
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : 0;

    const { data, error } = await supabase
      .from("supplier_ratings")
      .insert({
        company_id: companyId,
        supplier_id: supplierId,
        style_id: styleId || null,
        delivery_score: deliveryScore || null,
        quality_score: qualityScore || null,
        price_score: priceScore || null,
        service_score: serviceScore || null,
        overall_score: overallScore,
        comment: comment || null,
      })
      .select()
      .single();

    if (error) throw error;

    await updateSupplierStats(supplierId, companyId, supabase);

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "评价失败" }, { status: 500 });
  }
}

async function updateSupplierStats(supplierId: string, companyId: string, supabase: SupabaseClient) {
  try {
    const { data: ratings } = await supabase
      .from("supplier_ratings")
      .select("overall_score, delivery_score, quality_score, price_score, service_score")
      .eq("supplier_id", supplierId)
      .eq("company_id", companyId);

    if (!ratings || ratings.length === 0) return;

    const validRatings = ratings.filter((r) => r.overall_score);
    const count = validRatings.length;
    if (count === 0) return;

    const overallAvg = validRatings.reduce((sum, r) => sum + (r.overall_score || 0), 0) / count;

    await supabase
      .from("suppliers")
      .update({
        overall_rating: Math.round(overallAvg * 10) / 10,
        rating_count: count,
      })
      .eq("id", supplierId);
  } catch {
    // 静默处理
  }
}
