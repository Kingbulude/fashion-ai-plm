// 企划页面统一 AI 对话 API
// 底层走 Orchestrator + Cloudflare/DeepSeek，不再使用写死规则

import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { runOrchestrator } from "@/lib/ai/orchestrator";
import { validateBody, planningChatSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) {
      return ctx.error;
    }

    const { user, supabase, tenant } = ctx;
    const body = await request.json().catch(() => ({}));
    const validation = validateBody(planningChatSchema, body);
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

    // 转换历史记录格式
    const chatHistory = (history || [])
      .filter((m) => m.sender === "user" || m.sender === "ai")
      .map((m) => ({
        role: m.sender as "user" | "assistant",
        content: m.content,
      }));

    const result = await runOrchestrator({
      userMessage: userMessage.trim(),
      skillKey,
      userId: user.id,
      companyId,
      brandIds,
      seasonId: tenant.season_id || undefined,
      supabase,
      history: chatHistory,
    });

    const messages: ChatMessage[] = [
      {
        id: crypto.randomUUID(),
        content: userMessage.trim(),
        sender: "user",
        timestamp: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        content: result.output.summary || "（AI 未返回内容）",
        sender: "ai",
        timestamp: new Date().toISOString(),
      },
    ];

    return NextResponse.json({
      conversationId: crypto.randomUUID(),
      messages,
      isCompleted: false,
      skillKey: result.skillKey,
      skillName: result.skillName,
    });
  } catch (error: any) {
    console.error("[planning/ai/chat] error:", error);
    const detail = error?.message || "AI 对话失败";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
