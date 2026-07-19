// Pipeline Runner（编排器）
// 负责执行 Pipeline：事件 → 串行执行 steps → 持久化 → 派发后续事件

import { emit } from "../events/emitter";
import { EventType } from "../events/types";
import { dbAdmin } from "@/lib/db/client";
import {
  Pipeline,
  PipelineContext,
  PipelineRun,
  PipelineStep,
  StepResult,
  createInitialContext,
} from "./types";

// ─── Pipeline 注册表 ───
const pipelineRegistry = new Map<string, Pipeline>();
const eventToPipelines = new Map<EventType, string[]>();

// ─── 注册 Pipeline ───
export function registerPipeline(pipeline: Pipeline): void {
  pipelineRegistry.set(pipeline.id, pipeline);

  if (!eventToPipelines.has(pipeline.trigger)) {
    eventToPipelines.set(pipeline.trigger, []);
  }
  eventToPipelines.get(pipeline.trigger)!.push(pipeline.id);

  console.log(
    `[pipeline] registered: ${pipeline.id} (trigger: ${pipeline.trigger})`
  );
}

// ─── 获取所有 Pipeline ───
export function getPipelines(): Pipeline[] {
  return Array.from(pipelineRegistry.values());
}

export function getPipeline(id: string): Pipeline | undefined {
  return pipelineRegistry.get(id);
}

// ─── 触发 Pipeline（从事件） ───
// 供 events emitter 注册为事件处理器
export async function triggerFromEvent(event: {
  type: EventType;
  payload: any;
  id: string;
}): Promise<void> {
  const pipelineIds = eventToPipelines.get(event.type) || [];

  for (const pipelineId of pipelineIds) {
    const pipeline = pipelineRegistry.get(pipelineId);
    if (!pipeline) continue;

    // 每个 Pipeline 独立运行，互不影响
    runPipeline(pipeline, event).catch((err) => {
      console.error(
        `[pipeline] uncaught error in ${pipeline.id}:`,
        err
      );
    });
  }
}

// ─── 运行 Pipeline ───
export async function runPipeline(
  pipeline: Pipeline,
  triggerEvent: { type: EventType; payload: any; id: string }
): Promise<string> {
  const ctx = createInitialContext({
    type: triggerEvent.type,
    payload: triggerEvent.payload,
    id: triggerEvent.id,
  } as any);

  const runId = `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const run: PipelineRun = {
    id: runId,
    pipelineId: pipeline.id,
    triggerEventId: triggerEvent.id,
    triggerEventType: triggerEvent.type,
    status: "running",
    context: ctx,
    startedAt: new Date().toISOString(),
  };

  console.log(
    `[pipeline] START ${pipeline.id} (${runId}) triggered by ${triggerEvent.type}`
  );

  // 持久化运行记录
  await persistRun(run).catch(() => {});

  try {
    // 串行执行所有步骤
    for (let i = 0; i < pipeline.steps.length; i++) {
      const step = pipeline.steps[i];
      ctx.currentStep = i;

      // 前置条件检查
      if (step.guard) {
        const passed = await step.guard(ctx);
        if (!passed) {
          logStep(ctx, i, step, "info", `步骤跳过：条件不满足`);
          continue;
        }
      }

      logStep(ctx, i, step, "info", `步骤开始执行`);

      const result: StepResult = await step.run(ctx);

      // 处理结果
      const shouldStop = handleStepResult(ctx, i, step, result);
      if (shouldStop) {
        break;
      }
    }

    // 如果所有步骤执行完仍为 running，则标记 completed
    if (ctx.status === "running") {
      ctx.status = "completed";
    }
  } catch (err) {
    ctx.status = "failed";
    ctx.logs.push({
      stepIndex: ctx.currentStep,
      stepName: pipeline.steps[ctx.currentStep]?.name || "unknown",
      level: "error",
      message: `Pipeline 异常: ${
        err instanceof Error ? err.message : String(err)
      }`,
      timestamp: new Date().toISOString(),
    });
    console.error(`[pipeline] FAILED ${pipeline.id}:`, err);
  }

  run.status = ctx.status;
  run.completedAt = new Date().toISOString();

  // 持久化最终状态
  await persistRun(run).catch(() => {});

  console.log(
    `[pipeline] END ${pipeline.id} (${runId}) status=${ctx.status}`
  );

  return runId;
}

// ─── 处理步骤结果 ───
// 返回 true 表示应该停止 Pipeline
function handleStepResult(
  ctx: PipelineContext,
  stepIndex: number,
  step: PipelineStep,
  result: StepResult
): boolean {
  switch (result.type) {
    case "continue":
      if (result.data) {
        Object.assign(ctx.data, result.data);
      }
      logStep(ctx, stepIndex, step, "info", `步骤完成`);
      return false;

    case "skip":
      logStep(ctx, stepIndex, step, "warn", `步骤跳过：${result.reason}`);
      return false;

    case "pause_confirm":
      ctx.status = "paused_confirm";
      logStep(
        ctx,
        stepIndex,
        step,
        "warn",
        `暂停等待确认：${result.reason}`
      );
      return true;

    case "pause_approve":
      ctx.status = "paused_approve";
      logStep(
        ctx,
        stepIndex,
        step,
        "warn",
        `暂停等待审批：${result.reason}`
      );
      return true;

    case "fail":
      ctx.status = "failed";
      logStep(
        ctx,
        stepIndex,
        step,
        "error",
        `步骤失败：${result.reason}`
      );
      return true;

    default:
      return false;
  }
}

// ─── 日志辅助 ───
function logStep(
  ctx: PipelineContext,
  stepIndex: number,
  step: PipelineStep,
  level: "info" | "warn" | "error",
  message: string,
  data?: unknown
): void {
  ctx.logs.push({
    stepIndex,
    stepName: step.name,
    level,
    message,
    timestamp: new Date().toISOString(),
    data,
  });

  if (process.env.NODE_ENV !== "production") {
    const tag = level === "error" ? "❌" : level === "warn" ? "⚠️" : "✓";
    console.log(`  ${tag} [${step.name}] ${message}`);
  }
}

// ─── 持久化运行记录到数据库 ───
// pipeline_runs 表用于审计和调试（在后续迁移中创建）
async function persistRun(run: PipelineRun): Promise<void> {
  try {
    await dbAdmin.from("pipeline_runs").upsert({
      id: run.id,
      pipeline_id: run.pipelineId,
      trigger_event_id: run.triggerEventId,
      trigger_event_type: run.triggerEventType,
      status: run.status,
      context: run.context,
      started_at: run.startedAt,
      completed_at: run.completedAt || null,
      error_message: run.errorMessage || null,
    });
  } catch (err) {
    // 表可能还不存在，静默失败（后续迁移会创建）
    if (process.env.NODE_ENV !== "production") {
      console.warn("[pipeline] persistRun failed (table may not exist yet):", (err as Error).message);
    }
  }
}

// ─── 恢复暂停的 Pipeline（人工确认/审批后调用） ───
export async function resumePipeline(
  runId: string,
  approved: boolean
): Promise<void> {
  const { data: runRecord } = await dbAdmin
    .from("pipeline_runs")
    .select("*")
    .eq("id", runId)
    .single();

  if (!runRecord) {
    throw new Error(`Pipeline run ${runId} 不存在`);
  }

  const pipeline = pipelineRegistry.get(runRecord.pipeline_id);
  if (!pipeline) {
    throw new Error(`Pipeline ${runRecord.pipeline_id} 未注册`);
  }

  if (!approved) {
    // 驳回：发射拒绝事件
    await emit(EventType.ORDER_SUGGESTION_REJECTED, {
      source: "user",
      userId: runRecord.context.userId,
      brandId: runRecord.context.brandId,
      styleId: runRecord.context.styleId,
      suggestionId: runRecord.context.data.suggestionId,
    } as any);
    return;
  }

  // 批准：从暂停后的下一步继续执行
  const ctx = runRecord.context as PipelineContext;
  ctx.status = "running";

  for (let i = ctx.currentStep + 1; i < pipeline.steps.length; i++) {
    const step = pipeline.steps[i];
    ctx.currentStep = i;

    if (step.guard) {
      const passed = await step.guard(ctx);
      if (!passed) continue;
    }

    const result = await step.run(ctx);
    const shouldStop = handleStepResult(ctx, i, step, result);
    if (shouldStop) break;
  }

  if (ctx.status === "running") {
    ctx.status = "completed";
  }

  await persistRun({
    ...runRecord,
    context: ctx,
    status: ctx.status,
    completedAt: new Date().toISOString(),
  }).catch(() => {});
}
