// AI Orchestrator
// 负责意图识别、Skill 路由、上下文组装、调用 LLM、解析输出并记录日志

import { SupabaseClient } from "@supabase/supabase-js";
import { generateAIResponse } from "./provider";
import { getSkillHandler } from "@/lib/skills/handlers/registry";
import { SkillContext, SkillOutput } from "@/lib/skills/handlers/types";

export interface OrchestratorInput {
  userMessage: string;
  skillKey?: string;
  userId: string;
  companyId: string;
  brandIds: string[];
  seasonId?: string;
  supabase: SupabaseClient;
}

export interface OrchestratorResult {
  skillKey: string;
  skillName: string;
  output: SkillOutput;
  model: string;
  rawResponse: string;
}

async function resolveSkillKey(
  input: OrchestratorInput,
  availableSkills: { key: string; name: string; description: string }[]
): Promise<string | null> {
  if (input.skillKey) return input.skillKey;
  if (availableSkills.length === 0) return null;

  const system = "你是意图识别助手。请根据用户输入，从以下 Skill 中选择最匹配的一个，只返回 key 字段。";
  const skillList = availableSkills.map((s) => `- ${s.key}: ${s.name}。${s.description}`).join("\n");
  const user = `用户输入：${input.userMessage}\n\n可选 Skill：\n${skillList}\n\n请只返回最匹配的 key，不要解释。`;

  const res = await generateAIResponse(
    [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    { temperature: 0.2, max_tokens: 64 }
  );

  const matched = res.content.trim().replace(/['"`]/g, "");
  return availableSkills.find((s) => s.key === matched)?.key || null;
}

export async function runOrchestrator(input: OrchestratorInput): Promise<OrchestratorResult> {
  // 1. 查询公司启用的 AI Skills
  const { data: skillRows } = await input.supabase
    .from("ai_skills")
    .select("id, key, name, description, config_schema, process_node")
    .eq("is_active", true)
    .eq("company_id", input.companyId);

  const availableSkills = (skillRows || []).map((s) => ({
    id: s.id,
    key: s.key,
    name: s.name,
    description: s.description || "",
    configSchema: s.config_schema,
    processNode: s.process_node,
  }));

  // 2. 意图识别
  const resolvedKey = await resolveSkillKey(input, availableSkills);
  if (!resolvedKey) {
    throw new Error("未能识别到合适的 AI Skill，请直接选择左侧 Skill 再试");
  }

  const skillMeta = availableSkills.find((s) => s.key === resolvedKey);
  if (!skillMeta) {
    throw new Error(`Skill ${resolvedKey} 未找到`);
  }

  // 3. 获取 handler
  const handler = getSkillHandler(resolvedKey);
  if (!handler) {
    // 没有专用 handler，走通用系统提示
    const system = (skillMeta.configSchema as any)?.systemPrompt || `你是「${skillMeta.name}」AI 助手。`;
    const res = await generateAIResponse(
      [
        { role: "system", content: system },
        { role: "user", content: input.userMessage },
      ],
      { responseFormat: "text" }
    );
    return {
      skillKey: skillMeta.key,
      skillName: skillMeta.name,
      output: { summary: res.content, data: {} },
      model: res.model,
      rawResponse: res.content,
    };
  }

  // 4. 组装上下文并调用 LLM
  const ctx: SkillContext = {
    userId: input.userId,
    companyId: input.companyId,
    brandIds: input.brandIds,
    seasonId: input.seasonId,
    skillConfig: skillMeta.configSchema,
    supabase: input.supabase,
  };

  const promptText = await handler.buildContext(ctx, input.userMessage);
  const systemPrompt = (skillMeta.configSchema as any)?.systemPrompt || "你是专业的服装行业 AI 助手。";

  const res = await generateAIResponse(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: promptText },
    ],
    { responseFormat: "json_object", temperature: 0.7 }
  );

  // 5. 解析输出
  const output = handler.parseOutput(res.content);

  return {
    skillKey: skillMeta.key,
    skillName: skillMeta.name,
    output,
    model: res.model,
    rawResponse: res.content,
  };
}
