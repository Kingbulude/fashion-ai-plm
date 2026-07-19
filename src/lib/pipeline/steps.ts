// Pipeline Steps 通用工具
// 封装 AI 调用、建议创建、DB 查询等常见动作，供 Pipeline 复用

import { dbAdmin } from "@/lib/db/client";
import { generateText } from "@/lib/ai/cloudflare-ai";
import {
  AIRoleLevel,
  AISpecialistType,
  AISuggestionPriority,
  AISuggestionStatus,
  AISuggestionType,
} from "@/lib/ai/architecture";
import type { PipelineContext } from "./types";

// ─── 安全解析 JSON（LLM 输出可能不规范） ───
export function safeJsonParse<T = any>(raw: string): T | null {
  if (!raw) return null;

  // 先尝试直接解析
  try {
    return JSON.parse(raw) as T;
  } catch {}

  // 尝试提取 ```json ... ``` 代码块
  const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    try {
      return JSON.parse(codeBlockMatch[1]) as T;
    } catch {}
  }

  // 尝试提取第一个 { ... } 块
  const braceMatch = raw.match(/\{[\s\S]*\}/);
  if (braceMatch) {
    try {
      return JSON.parse(braceMatch[0]) as T;
    } catch {}
  }

  return null;
}

// ─── 调用 LLM 并解析 JSON ───
export async function callLLMJson<T = any>(
  prompt: string,
  systemPrompt?: string
): Promise<T | null> {
  const raw = await generateText(prompt, systemPrompt);
  const parsed = safeJsonParse<T>(raw);
  if (!parsed) {
    console.warn("[pipeline] LLM 输出无法解析为 JSON:", raw.slice(0, 200));
  }
  return parsed;
}

// ─── 获取款式详情 ───
export async function getStyle(styleId: string) {
  const { data, error } = await dbAdmin
    .from("styles")
    .select("*")
    .eq("id", styleId)
    .single();
  if (error || !data) return null;
  return data;
}

// ─── 获取款式 BOM ───
export async function getBomItems(styleId: string) {
  const { data } = await dbAdmin
    .from("bom_items")
    .select("*")
    .eq("style_id", styleId);
  return data || [];
}

// ─── 获取款式历史销售 ───
export async function getSalesHistory(styleId: string, limit = 30) {
  const { data } = await dbAdmin
    .from("sales_data")
    .select("*")
    .eq("style_id", styleId)
    .order("date", { ascending: false })
    .limit(limit);
  return data || [];
}

// ─── 创建 AI 建议（写入 ai_suggestions 表） ───
export async function createSuggestion(params: {
  ctx: PipelineContext;
  type: AISuggestionType;
  priority: AISuggestionPriority;
  title: string;
  content: string;
  specialistType: AISpecialistType;
  proposedData?: Record<string, unknown>;
  targetTable?: string;
  targetId?: string;
}): Promise<string | null> {
  const { ctx, ...suggestionData } = params;

  const { data, error } = await dbAdmin
    .from("ai_suggestions")
    .insert({
      ai_role_level: AIRoleLevel.AI_SPECIALIST,
      specialist_type: suggestionData.specialistType,
      brand_id: ctx.brandId || null,
      process_node: suggestionData.specialistType.replace("_ai", ""),
      type: suggestionData.type,
      priority: suggestionData.priority,
      title: suggestionData.title,
      content: suggestionData.content,
      proposed_data: suggestionData.proposedData || null,
      target_table: suggestionData.targetTable || null,
      target_id: suggestionData.targetId || null,
      status: AISuggestionStatus.PENDING,
      created_by: "ai_system",
    })
    .select()
    .single();

  if (error) {
    console.error("[pipeline] createSuggestion failed:", error.message);
    return null;
  }

  return data?.id || null;
}

// ─── 更新款式 AI 字段 ───
export async function updateStyleAIFields(
  styleId: string,
  fields: Record<string, unknown>
): Promise<void> {
  const { error } = await dbAdmin
    .from("styles")
    .update(fields)
    .eq("id", styleId);
  if (error) {
    console.error("[pipeline] updateStyleAIFields failed:", error.message);
  }
}
