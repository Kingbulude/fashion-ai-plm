// AI Skill Handler 注册表
// 所有 AI Skill Handler 在此注册，供 Orchestrator 按 key 调用

import { AISkillHandler } from "./types";
import { themePlannerHandler } from "./theme-planner";
import { inventoryActivationHandler } from "./inventory-activation";

const registry = new Map<string, AISkillHandler>();

export function registerSkillHandler(handler: AISkillHandler) {
  registry.set(handler.key, handler);
}

export function getSkillHandler(key: string): AISkillHandler | undefined {
  return registry.get(key);
}

export function getAllSkillHandlers(): AISkillHandler[] {
  return Array.from(registry.values());
}

// 注册 Demo Skill
registerSkillHandler(themePlannerHandler);
registerSkillHandler(inventoryActivationHandler);
