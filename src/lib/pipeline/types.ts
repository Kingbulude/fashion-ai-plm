// Pipeline 类型定义
// 一个 Pipeline = 触发事件 + 有序步骤序列 + 上下文流转

import { EventType, AppEvent, EventPayload } from "../events/types";

// ─── 决策分级（对应人机协同策略） ───
export enum RiskLevel {
  // 🟢 低风险：AI 自主执行，事后知会（如：数据采集、分析报告）
  AUTO = "auto",
  // 🟡 中风险：AI 建议 + 一键确认（如：下单建议、备货方案）
  CONFIRM = "confirm",
  // 🔴 高风险：人工审批（如：大额采购、新工厂合作）
  APPROVE = "approve",
}

// ─── Pipeline 执行上下文 ───
// 在所有 step 之间流转的共享状态
export interface PipelineContext {
  // 原始触发事件
  triggerEvent: AppEvent;

  // 业务实体 ID（贯穿整个 Pipeline）
  styleId?: string;
  brandId?: string;
  orderId?: string;

  // 累积的中间结果（每个 step 写入，后续 step 读取）
  data: Record<string, unknown>;

  // 执行日志
  logs: PipelineLogEntry[];

  // 执行状态
  status: PipelineStatus;
  currentStep: number;

  // 用户上下文（如果是用户触发的）
  userId?: string;
}

export type PipelineStatus =
  | "running" // 执行中
  | "paused_confirm" // 暂停等待人确认
  | "paused_approve" // 暂停等待人审批
  | "completed" // 完成
  | "failed" // 失败
  | "skipped"; // 跳过（条件不满足）

export interface PipelineLogEntry {
  stepIndex: number;
  stepName: string;
  level: "info" | "warn" | "error";
  message: string;
  timestamp: string;
  data?: unknown;
}

// ─── Pipeline Step（步骤） ───
export interface PipelineStep {
  // 步骤名称（唯一标识）
  name: string;
  // 中文显示名
  label: string;
  // 描述
  description?: string;

  // 执行逻辑
  run: (ctx: PipelineContext) => Promise<StepResult>;

  // 前置条件（返回 false 则跳过本步骤）
  guard?: (ctx: PipelineContext) => Promise<boolean> | boolean;
}

// ─── Step 执行结果 ───
export type StepResult =
  | { type: "continue"; data?: Record<string, unknown> }
  | { type: "pause_confirm"; reason: string; suggestionId?: string }
  | { type: "pause_approve"; reason: string; suggestionId?: string }
  | { type: "skip"; reason: string }
  | { type: "fail"; reason: string; retryable?: boolean };

// ─── Pipeline 定义 ───
export interface Pipeline {
  // 唯一 ID
  id: string;
  // 中文名
  name: string;
  // 描述
  description: string;
  // 触发事件类型
  trigger: EventType;
  // 有序步骤
  steps: PipelineStep[];
}

// ─── Pipeline 运行记录（持久化到 DB） ───
export interface PipelineRun {
  id: string;
  pipelineId: string;
  triggerEventId: string;
  triggerEventType: EventType;
  status: PipelineStatus;
  context: PipelineContext;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

// ─── 创建初始上下文的工厂 ───
export function createInitialContext(event: AppEvent): PipelineContext {
  return {
    triggerEvent: event,
    styleId: (event.payload as EventPayload & { styleId?: string }).styleId,
    brandId: (event.payload as EventPayload & { brandId?: string }).brandId,
    orderId: (event.payload as EventPayload & { orderId?: string }).orderId,
    data: {},
    logs: [],
    status: "running",
    currentStep: 0,
    userId: event.payload.userId,
  };
}
