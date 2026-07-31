// 统一 AI Skill 调度 API
// 接收自然语言输入，经 Orchestrator 识别意图、调用 Skill、返回结构化结果

import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { runOrchestrator } from "@/lib/ai/orchestrator";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) {
      return ctx.error;
    }

    const { user, supabase, tenant } = ctx;
    const body = await request.json().catch(() => ({}));
    const { message, skillKey, seasonId, history } = body;

    if (!message?.trim()) {
      return NextResponse.json({ error: "缺少 message" }, { status: 400 });
    }

    const companyId = tenant.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "当前用户未绑定公司" }, { status: 400 });
    }

    // 获取用户可访问的品牌列表
    const { data: userBrands } = await supabase
      .from("user_brands")
      .select("brand_id")
      .eq("user_id", user.id);
    const brandIds = (userBrands || []).map((b) => b.brand_id);

    const result = await runOrchestrator({
      userMessage: message.trim(),
      skillKey,
      userId: user.id,
      companyId,
      brandIds,
      seasonId: seasonId || tenant.season_id || undefined,
      supabase,
      history,
    });

    // 记录执行日志
    const { data: skillRow } = await supabase
      .from("ai_skills")
      .select("id")
      .eq("key", result.skillKey)
      .eq("company_id", companyId)
      .single();

    await supabase.from("ai_executions").insert({
      skill_id: skillRow?.id || null,
      skill_key: result.skillKey,
      user_id: user.id,
      company_id: companyId,
      brand_id: brandIds[0] || tenant.brand_id || null,
      season_id: seasonId || tenant.season_id || null,
      input: message.trim(),
      output: result.output.data,
      raw_response: result.rawResponse,
      model: result.model,
      status: "success",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[ai/orchestrate] error:", error);
    return NextResponse.json(
      { error: error?.message || "AI 执行失败" },
      { status: 500 }
    );
  }
}
