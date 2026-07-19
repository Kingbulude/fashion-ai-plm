// Skill 系统类型定义
// Skill = AI 可调用的工具，封装具体执行动作

// ─── 决策分级（与 Pipeline 的 RiskLevel 对应） ───
export enum SkillRiskLevel {
  AUTO = "auto", // 🟢 AI 自主执行
  CONFIRM = "confirm", // 🟡 一键确认
  APPROVE = "approve", // 🔴 人工审批
}

// ─── Skill 执行结果 ───
export interface SkillResult {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
  // 如果需要人工操作，返回外部链接（如飞书卡片跳转链接）
  actionUrl?: string;
}

// ─── Skill 定义 ───
export interface SkillDefinition {
  // 唯一标识（如 "send-lark-message"）
  id: string;
  // 中文名
  name: string;
  // 描述（AI 选择 Skill 时参考）
  description: string;
  // 风险等级
  riskLevel: SkillRiskLevel;
  // 输入参数 schema（简单的 key-value 描述，非 JSON Schema）
  params: SkillParam[];
  // 执行函数
  execute: (params: Record<string, unknown>) => Promise<SkillResult>;
}

// ─── Skill 参数定义 ───
export interface SkillParam {
  name: string;
  label: string;
  type: "string" | "number" | "boolean" | "object" | "array";
  required: boolean;
  description?: string;
  defaultValue?: unknown;
}

// ─── Skill 分类 ───
export enum SkillCategory {
  COMMUNICATION = "communication", // 沟通协作
  DOCUMENT = "document", // 文档生成
  DATA = "data", // 数据采集/分析
  NOTIFICATION = "notification", // 通知提醒
  WORKFLOW = "workflow", // 工作流操作
}

export const SkillCategoryLabels: Record<SkillCategory, string> = {
  [SkillCategory.COMMUNICATION]: "沟通协作",
  [SkillCategory.DOCUMENT]: "文档生成",
  [SkillCategory.DATA]: "数据采集",
  [SkillCategory.NOTIFICATION]: "通知提醒",
  [SkillCategory.WORKFLOW]: "工作流操作",
};
