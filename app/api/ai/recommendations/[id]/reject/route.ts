// 拒绝 AI 建议
// 记录拒绝原因，更新 skill metrics

import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;

    const { supabase, tenant } = ctx;
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    const { data: rec, error: recError } = await supabase
      .from("ai_recommendations")
      .select("*")
      .eq("id", id)
      .single();

    if (recError || !rec) {
      return NextResponse.json({ error: "建议不存在" }, { status: 404 });
    }

    const { data: updatedRec, error } = await supabase
      .from("ai_recommendations")
      .update({
        status: "rejected",
        reject_reason: reason || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[reject] 更新建议状态失败:", error);
      return NextResponse.json({ error: "拒绝失败" }, { status: 500 });
    }

    await incrementSkillMetrics(supabase, rec.skill_id, tenant, "rejected");

    return NextResponse.json(toCamelCase(updatedRec));
  } catch (error: any) {
    console.error("[reject] error:", error);
    return NextResponse.json({ error: error?.message || "拒绝失败" }, { status: 500 });
  }
}

async function incrementSkillMetrics(
  supabase: any,
  skillId: string | null,
  tenant: { company_id: string; brand_id: string; season_id: string | null },
  action: "adopted" | "rejected" | "modified"
) {
  if (!skillId || !tenant.company_id || !tenant.brand_id) return;

  const { data: existing } = await supabase
    .from("ai_skill_metrics")
    .select("id, total_recommendations, adopted_count, rejected_count, modified_count")
    .eq("skill_id", skillId)
    .eq("company_id", tenant.company_id)
    .eq("brand_id", tenant.brand_id)
    .is("season_id", tenant.season_id || null)
    .maybeSingle();

  if (existing) {
    const updates: any = {
      total_recommendations: (existing.total_recommendations || 0) + 1,
    };
    if (action === "adopted") updates.adopted_count = (existing.adopted_count || 0) + 1;
    if (action === "rejected") updates.rejected_count = (existing.rejected_count || 0) + 1;
    if (action === "modified") updates.modified_count = (existing.modified_count || 0) + 1;

    await supabase.from("ai_skill_metrics").update(updates).eq("id", existing.id);
  } else {
    await supabase.from("ai_skill_metrics").insert({
      skill_id: skillId,
      company_id: tenant.company_id,
      brand_id: tenant.brand_id,
      season_id: tenant.season_id,
      total_recommendations: 1,
      adopted_count: action === "adopted" ? 1 : 0,
      rejected_count: action === "rejected" ? 1 : 0,
      modified_count: action === "modified" ? 1 : 0,
    });
  }
}
