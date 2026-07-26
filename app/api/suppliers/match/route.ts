import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { materialType, minRating = 0, location } = body;

    let query = supabase
      .from("suppliers")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .gte("overall_rating", minRating);

    if (materialType) {
      query = query.eq("type", materialType);
    }

    const { data: suppliers, error } = await query.order("overall_rating", { ascending: false });
    if (error) throw error;

    const supplierList = (toCamelCase(suppliers) || []) as any[];

    const scored = supplierList.map((s: any) => {
      const score = calculateSupplierScore(s, { materialType, location });
      return { ...s, matchScore: score, matchReason: generateMatchReason(s, score) };
    });

    scored.sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({
      suppliers: scored,
      total: scored.length,
    });
  } catch {
    return NextResponse.json({ error: "匹配失败" }, { status: 500 });
  }
}

function calculateSupplierScore(supplier: any, _filters: { materialType?: string; location?: string }) {
  let score = 0;

  const rating = supplier.overallRating || supplier.overall_rating || 0;
  score += rating * 15;

  if (supplier.ratingCount || supplier.rating_count) {
    const count = supplier.ratingCount || supplier.rating_count;
    score += Math.min(count * 2, 20);
  }

  if (supplier.materialTypes || supplier.material_types) {
    score += 10;
  }

  if (supplier.minOrderQty || supplier.min_order_qty) {
    score += 5;
  }

  if (supplier.leadTimeDays || supplier.lead_time_days) {
    const leadTime = supplier.leadTimeDays || supplier.lead_time_days;
    if (leadTime <= 7) score += 15;
    else if (leadTime <= 15) score += 10;
    else if (leadTime <= 30) score += 5;
  }

  return Math.round(Math.min(score, 100));
}

function generateMatchReason(supplier: any, _score: number) {
  const reasons: string[] = [];
  const rating = supplier.overallRating || supplier.overall_rating || 0;

  if (rating >= 4.5) reasons.push("评分优秀");
  else if (rating >= 3.5) reasons.push("评分良好");
  else if (rating >= 2.5) reasons.push("评分一般");

  const count = supplier.ratingCount || supplier.rating_count || 0;
  if (count >= 10) reasons.push("合作经验丰富");
  else if (count >= 3) reasons.push("有合作记录");

  const leadTime = supplier.leadTimeDays || supplier.lead_time_days;
  if (leadTime && leadTime <= 15) reasons.push(`交期快(${leadTime}天)`);

  if (reasons.length === 0) reasons.push("基础匹配");

  return reasons.join("、");
}
