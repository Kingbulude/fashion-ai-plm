// 事件发射器
// 进程内事件总线，支持多处理器、错误隔离、日志追踪

import { AppEvent, EventHandler, EventType, EventPayload } from "./types";

// ─── 生成事件 ID ───
function generateEventId(): string {
  return `evt_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── 处理器注册表 ───
type HandlerEntry = {
  id: string;
  handler: EventHandler;
  priority: number; // 数值越大越先执行
};

const handlerRegistry = new Map<EventType, HandlerEntry[]>();

// ─── 事件日志（最近 N 条，供调试） ───
const MAX_LOG_SIZE = 100;
const eventLog: AppEvent[] = [];

// ─── 指标统计 ───
const metrics = {
  emitted: 0,
  processed: 0,
  failed: 0,
};

// ─── 注册事件处理器 ───
export function on(
  type: EventType,
  handler: EventHandler,
  options: { id?: string; priority?: number } = {}
): string {
  const id = options.id || `handler_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const priority = options.priority ?? 0;

  if (!handlerRegistry.has(type)) {
    handlerRegistry.set(type, []);
  }

  handlerRegistry.get(type)!.push({ id, handler, priority });

  // 按 priority 降序排序
  handlerRegistry.get(type)!.sort((a, b) => b.priority - a.priority);

  return id;
}

// ─── 注销事件处理器 ───
export function off(type: EventType, handlerId: string): void {
  const handlers = handlerRegistry.get(type);
  if (!handlers) return;
  handlerRegistry.set(
    type,
    handlers.filter((h) => h.id !== handlerId)
  );
}

// ─── 发射事件 ───
export async function emit(
  type: EventType,
  payload: EventPayload
): Promise<string> {
  const event: AppEvent = {
    id: generateEventId(),
    type,
    payload: {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
      source: payload.source || "system",
    },
  };

  metrics.emitted++;

  // 记录到日志
  eventLog.push(event);
  if (eventLog.length > MAX_LOG_SIZE) {
    eventLog.shift();
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[event] ${type} (${event.id})`);
  }

  // 异步触发所有处理器（不阻塞调用方）
  // 使用 setImmediate 风格的微任务，保证 emit 快速返回
  void processEvent(event).catch((err) => {
    console.error(`[event] uncaught error processing ${type}:`, err);
    metrics.failed++;
  });

  return event.id;
}

// ─── 同步发射（等待所有处理器完成） ───
// 用于需要确认处理器完成的场景（如 Pipeline 内部链式触发）
export async function emitAndWait(
  type: EventType,
  payload: EventPayload
): Promise<string> {
  const event: AppEvent = {
    id: generateEventId(),
    type,
    payload: {
      ...payload,
      timestamp: payload.timestamp || new Date().toISOString(),
      source: payload.source || "system",
    },
  };

  metrics.emitted++;

  eventLog.push(event);
  if (eventLog.length > MAX_LOG_SIZE) {
    eventLog.shift();
  }

  if (process.env.NODE_ENV !== "production") {
    console.log(`[event] ${type} (${event.id}) [sync]`);
  }

  await processEvent(event);

  return event.id;
}

// ─── 处理单个事件 ───
async function processEvent(event: AppEvent): Promise<void> {
  const handlers = handlerRegistry.get(event.type) || [];

  if (handlers.length === 0) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[event] no handlers for ${event.type}`);
    }
    return;
  }

  // 串行执行处理器（避免并发问题），单个失败不影响其他
  for (const entry of handlers) {
    try {
      await entry.handler(event);
      metrics.processed++;
    } catch (err) {
      console.error(
        `[event] handler ${entry.id} failed for ${event.type}:`,
        err
      );
      metrics.failed++;
      // 不中断后续处理器
    }
  }
}

// ─── 工具函数 ───
export function getEventLog(): AppEvent[] {
  return [...eventLog];
}

export function getMetrics() {
  return { ...metrics };
}

export function clearLog(): void {
  eventLog.length = 0;
}
