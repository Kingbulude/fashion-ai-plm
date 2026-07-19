// Skill 统一注册入口
// 导入所有 Skill 模块（每个模块内部会调用 registerSkill）
// 应用启动时导入此文件即可注册全部 Skill

// 通信 Skill
import "./skills/send-lark-message";
import "./skills/send-wechat-message";

// 文档生成 Skill
import "./skills/generate-tech-pack";
import "./skills/generate-procurement-order";

import { getAllSkills } from "./registry";
import { executeSkill } from "./executor";

// 导出供外部使用
export { getAllSkills, executeSkill };

// 自动注册（模块加载时触发）
declare global {
  // eslint-disable-next-line no-var
  var __skillsInitialized: boolean | undefined;
}

if (!globalThis.__skillsInitialized) {
  globalThis.__skillsInitialized = true;
  const skills = getAllSkills();
  console.log(`[skills] initialized: ${skills.length} skills registered`);
  skills.forEach((s) => `  - ${s.id}: ${s.name}`);
}
