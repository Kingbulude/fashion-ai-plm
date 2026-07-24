// 通用 AI Skill 对话 API
// 为没有独立 entry_route 的 skill 提供即时对话能力

import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/supabase";
import { generateText } from "@/lib/ai/cloudflare-ai";

export const runtime = "edge";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequest {
  skillKey: string;
  skillName: string;
  description?: string;
  processNode?: string;
  userMessage: string;
  history?: ChatMessage[];
}

function buildSystemPrompt(skill: Omit<ChatRequest, "userMessage" | "history">): string {
  const parts = [
    `你是服装品牌 AI 全链路管理系统中的「${skill.skillName}」智能助手。`,
    skill.description ? `技能定位：${skill.description}` : "",
    skill.processNode ? `你专注的工序环节：${skill.processNode}。` : "",
    "",
    "请遵循以下原则：",
    "1. 回答简洁专业，使用中文；",
    "2. 结合服装行业场景给出可执行建议；",
    "3. 需要具体数据时，明确告知用户补充哪些信息；",
    "4. 不编造不确定的品牌内部数据。",
  ];
  return parts.filter(Boolean).join("\n");
}

export async function POST(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: ChatRequest = await request.json().catch(() => ({} as ChatRequest));
    const { skillKey, skillName, description, processNode, userMessage, history } = body;

    if (!skillKey || !skillName || !userMessage?.trim()) {
      return NextResponse.json(
        { error: "缺少 skillKey、skillName 或 userMessage" },
        { status: 400 }
      );
    }

    const systemPrompt = buildSystemPrompt({ skillKey, skillName, description, processNode });

    // 将历史记录拼接到 prompt 中（简化版，利用大模型上下文能力）
    const historyText = (history || [])
      .map((m) => `${m.role === "user" ? "用户" : "助手"}：${m.content}`)
      .join("\n");

    const fullPrompt = historyText
      ? `${historyText}\n用户：${userMessage.trim()}\n助手：`
      : `用户：${userMessage.trim()}\n助手：`;

    const reply = await generateText(fullPrompt, systemPrompt);

    return NextResponse.json({
      reply: reply.trim(),
      skillKey,
      skillName,
    });
  } catch (error: any) {
    console.error("[ai/chat] error:", error);
    const message = error?.message || "AI 对话失败";
    // 配置缺失时返回 503，便于前端给出友好提示
    const status = message.includes("配置缺失") ? 503 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
