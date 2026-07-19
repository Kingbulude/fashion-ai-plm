// Skill 注册表
// 所有 Skill 在此注册，Pipeline 和 AI 通过 ID 调用

import { SkillDefinition, SkillCategory } from "./types";

// ─── Skill 存储表 ───
const skillRegistry = new Map<string, SkillDefinition>();
const skillByCategory = new Map<SkillCategory, string[]>();

// ─── 注册 Skill ───
export function registerSkill(skill: SkillDefinition): void {
  if (skillRegistry.has(skill.id)) {
    console.warn(`[skill] overwriting existing skill: ${skill.id}`);
  }
  skillRegistry.set(skill.id, skill);
  console.log(`[skill] registered: ${skill.id} (${skill.name})`);
}

// ─── 获取 Skill ───
export function getSkill(id: string): SkillDefinition | undefined {
  return skillRegistry.get(id);
}

// ─── 获取所有 Skill ───
export function getAllSkills(): SkillDefinition[] {
  return Array.from(skillRegistry.values());
}

// ─── 按分类获取 ───
export function getSkillsByCategory(category: SkillCategory): SkillDefinition[] {
  return getAllSkills().filter((s) => getCategory(s.id) === category);
}

function getCategory(id: string): SkillCategory | undefined {
  for (const [cat, ids] of skillByCategory) {
    if (ids.includes(id)) return cat;
  }
  return undefined;
}
