// 通用 AI Skill 对话 API（兼容层）
// 为没有独立 entry_route 的 skill 提供即时对话能力，底层走 Orchestrator

import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { runOrchestrator } from "@/lib/ai/orchestrator";
import { validateBody, aiChatSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) {
      return ctx.error;
    }

    const { user, supabase, tenant } = ctx;
    const body = await request.json().catch(() => ({}));
    const validation = validateBody(aiChatSchema, body);
    if (!validation.ok) return validation.response;
    const { skillKey, userMessage, history } = validation.data;

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
      userMessage: userMessage.trim(),
      skillKey,
      userId: user.id,
      companyId,
      brandIds,
      seasonId: tenant.season_id || undefined,
      supabase,
      history,
    });

    return NextResponse.json({
      reply: result.output.summary,
      skillKey: result.skillKey,
      skillName: result.skillName,
      structured: result.output,
    });
  } catch (error: any) {
    console.error("[ai/chat] error:", error);
    const message = error?.message || "AI 对话失败";
    const status = message.includes("配置缺失") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
