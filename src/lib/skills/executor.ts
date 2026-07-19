// Skill 执行器
// Pipeline 和 API 路通过此模块调用 Skill，提供日志、限流、错误处理

import { getSkill } from "./registry";
import { SkillResult } from "./types";

// ─── 执行 Skill ───
export async function executeSkill(
  skillId: string,
  params: Record<string, unknown>
): Promise<SkillResult> {
  const skill = getSkill(skillId);
  if (!skill) {
    return {
      success: false,
      error: `Skill "${skillId}" 未注册`,
    };
  }

  // 参数校验：检查 required 字段
  for (const p of skill.params) {
    if (p.required && params[p.name] === undefined) {
      return {
        success: false,
        error: `缺少必填参数: ${p.name} (${p.label})`,
      };
    }
  }

  const startTime = Date.now();

  try {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[skill] EXECUTE ${skillId}`, Object.keys(params));
    }

    const result = await skill.execute(params);

    const duration = Date.now() - startTime;
    if (process.env.NODE_ENV !== "production") {
      console.log(
        `[skill] DONE ${skillId} → ${result.success ? "OK" : "FAIL"} (${duration}ms)`
      );
    }

    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    console.error(
      `[skill] ERROR ${skillId} (${duration}ms):`,
      err instanceof Error ? err.message : err
    );
    return {
      success: false,
      error: `Skill 执行异常: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ─── 批量执行 Skill（并行，各自独立） ───
export async function executeSkills(
  calls: Array<{ skillId: string; params: Record<string, unknown> }>
): Promise<Array<{ skillId: string; result: SkillResult }>> {
  return Promise.all(
    calls.map(async ({ skillId, params }) => ({
      skillId,
      result: await executeSkill(skillId, params),
    }))
  );
}
