// Pipeline 注册中心
// 应用启动时调用 registerAll()，注册所有 Pipeline 并接入事件系统

import { on } from "../events/emitter";
import { EventType } from "../events/types";
import { registerPipeline, triggerFromEvent } from "./runner";
import { testingDecisionOrderingPipeline } from "./pipelines/testing-decision-ordering";
import { procurementAutomationPipeline } from "./pipelines/procurement-automation";
import { dailyCheckinPipeline } from "./pipelines/daily-checkin";

let initialized = false;

export function registerAll(): void {
  if (initialized) {
    console.log("[pipeline] already initialized, skipping");
    return;
  }
  initialized = true;

  // 注册 Pipeline
  registerPipeline(testingDecisionOrderingPipeline);
  registerPipeline(procurementAutomationPipeline);
  registerPipeline(dailyCheckinPipeline);

  // 把 Pipeline runner 注册为事件处理器
  // 每个 Pipeline 的触发事件都路由到 triggerFromEvent
  const triggerTypes = new Set<EventType>([
    testingDecisionOrderingPipeline.trigger,
    procurementAutomationPipeline.trigger,
    dailyCheckinPipeline.trigger,
  ]);

  for (const type of triggerTypes) {
    on(type, triggerFromEvent, { id: "pipeline-dispatcher", priority: 10 });
  }

  console.log(
    `[pipeline] initialized: ${triggerTypes.size} event types → pipelines`
  );
}

// 在模块加载时自动注册（Edge Runtime 每个请求都会重新加载）
// 使用全局变量避免重复注册
declare global {
  // eslint-disable-next-line no-var
  var __pipelineInitialized: boolean | undefined;
}

if (!globalThis.__pipelineInitialized) {
  globalThis.__pipelineInitialized = true;
  registerAll();
}
