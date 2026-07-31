// AI Skill Handler 类型定义
// 用于 AI Orchestrator 调用具体 Skill，封装上下文构建与输出解析

import { SupabaseClient } from "@supabase/supabase-js";

export interface SkillContext {
  userId: string;
  companyId: string;
  brandIds: string[];
  seasonId?: string;
  skillConfig?: Record<string, any> | null;
  supabase: SupabaseClient;
}

export interface SkillAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

export interface SkillOutput {
  summary: string;
  data: Record<string, unknown>;
  actions?: SkillAction[];
}

export interface AISkillHandler {
  key: string;
  name: string;
  description: string;
  processNode?: string | null;
  buildContext: (ctx: SkillContext, userMessage: string) => Promise<string>;
  parseOutput: (raw: string) => SkillOutput;
}
