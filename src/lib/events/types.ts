// 事件系统类型定义
// 所有业务关键节点都通过事件触发 AI Pipeline

// ─── 事件类型 ───
export enum EventType {
  // 款式生命周期
  STYLE_CREATED = "style.created",
  STYLE_UPDATED = "style.updated",
  STYLE_STATUS_CHANGED = "style.status_changed",

  // 设计阶段
  DESIGN_ASSET_UPLOADED = "design.asset_uploaded",

  // 打样阶段
  SAMPLING_REQUESTED = "sampling.requested",
  SAMPLING_RECEIVED = "sampling.received",
  SAMPLING_APPROVED = "sampling.approved",

  // 测款阶段（核心流程）
  TEST_STARTED = "test.started",
  TEST_DATA_ACCUMULATED = "test.data_accumulated",
  TEST_SCORE_READY = "test.score_ready",

  // 决策与下单（核心流程）
  ORDER_SUGGESTION_READY = "order.suggestion_ready",
  ORDER_SUGGESTION_APPROVED = "order.suggestion_approved",
  ORDER_SUGGESTION_REJECTED = "order.suggestion_rejected",
  PRODUCTION_ORDER_CREATED = "production.created",
  PRODUCTION_STATUS_CHANGED = "production.status_changed",

  // 采购阶段
  PROCUREMENT_CREATED = "procurement.created",
  PROCUREMENT_RECEIVED = "procurement.received",
  MATERIAL_DELAYED = "procurement.delayed",

  // 质检
  QC_FAILED = "qc.failed",

  // 库存与销售
  INVENTORY_LOW = "inventory.low",
  SALES_DATA_UPDATED = "sales.updated",
  SALES_TREND_DETECTED = "sales.trend_detected",

  // 售后
  AFTERSALES_REPORTED = "aftersales.reported",

  // 趋势（外部数据）
  TREND_DATA_UPDATED = "trend.updated",

  // 定时触发
  CRON_DAILY = "cron.daily",
  CRON_WEEKLY = "cron.weekly",
  CRON_HOURLY = "cron.hourly",

  // AI 建议
  AI_SUGGESTION_CREATED = "ai.suggestion_created",
  AI_SUGGESTION_EXECUTED = "ai.suggestion_executed",
}

// ─── 事件载荷接口 ───
export interface BaseEventPayload {
  // 事件触发时间（可选，emitter 会自动填充）
  timestamp?: string;
  // 触发来源：user | ai-system | cron | webhook
  source: "user" | "ai-system" | "cron" | "webhook" | "system";
  // 触发者用户 ID（如果是用户触发）
  userId?: string;
  // 品牌 ID（用于多租户隔离）
  brandId?: string;
}

// ─── 具体事件载荷 ───
export interface StyleEventPayload extends BaseEventPayload {
  styleId: string;
  styleNo?: string;
  name?: string;
  data?: Record<string, unknown>;
}

export interface StatusChangedPayload extends BaseEventPayload {
  styleId: string;
  fromStatus: string;
  toStatus: string;
}

export interface TestScorePayload extends BaseEventPayload {
  styleId: string;
  score: number; // 0-100
  positiveRate: number; // 0-1
  feedbackCount: number;
}

export interface OrderSuggestionPayload extends BaseEventPayload {
  styleId: string;
  suggestionId: string;
  suggestedQuantity: number;
  safetyStock: number;
  reasoning?: string;
}

export interface ProductionOrderPayload extends BaseEventPayload {
  styleId: string;
  orderId: string;
  quantity: number;
  factoryId?: string;
}

export interface ProcurementPayload extends BaseEventPayload {
  styleId: string;
  procurementId: string;
  bomItemId: string;
  supplierId?: string;
  expectedDate?: string;
}

export interface SalesDataPayload extends BaseEventPayload {
  styleId?: string;
  brandId: string;
  channel?: string;
}

export interface TrendDataPayload extends BaseEventPayload {
  brandId: string;
  trendType: "color" | "fabric" | "style" | "market";
  dataHash?: string; // 用于去重
}

export interface CronPayload extends BaseEventPayload {
  firedAt: string;
}

export interface AISuggestionPayload extends BaseEventPayload {
  suggestionId: string;
  suggestionType: string;
  targetTable?: string;
  targetId?: string;
}

// ─── 事件联合类型 ───
export type EventPayload = Record<string, unknown> & BaseEventPayload;

// ─── 事件接口 ───
export interface AppEvent {
  type: EventType;
  payload: EventPayload;
  id: string; // 事件唯一 ID（用于去重/日志）
}

// ─── 事件处理器接口 ───
export type EventHandler = (event: AppEvent) => Promise<void>;

// ─── 事件标签（中文显示名，供日志和 UI 使用） ───
export const EventTypeLabels: Record<EventType, string> = {
  [EventType.STYLE_CREATED]: "款式创建",
  [EventType.STYLE_UPDATED]: "款式更新",
  [EventType.STYLE_STATUS_CHANGED]: "款式状态变更",
  [EventType.DESIGN_ASSET_UPLOADED]: "设计资产上传",
  [EventType.SAMPLING_REQUESTED]: "打样请求",
  [EventType.SAMPLING_RECEIVED]: "样衣收到",
  [EventType.SAMPLING_APPROVED]: "样衣通过",
  [EventType.TEST_STARTED]: "测款开始",
  [EventType.TEST_DATA_ACCUMULATED]: "测款数据累积",
  [EventType.TEST_SCORE_READY]: "测款分数就绪",
  [EventType.ORDER_SUGGESTION_READY]: "下单建议就绪",
  [EventType.ORDER_SUGGESTION_APPROVED]: "下单建议通过",
  [EventType.ORDER_SUGGESTION_REJECTED]: "下单建议驳回",
  [EventType.PRODUCTION_ORDER_CREATED]: "生产订单创建",
  [EventType.PRODUCTION_STATUS_CHANGED]: "生产状态变更",
  [EventType.PROCUREMENT_CREATED]: "采购创建",
  [EventType.PROCUREMENT_RECEIVED]: "采购到货",
  [EventType.MATERIAL_DELAYED]: "物料延误",
  [EventType.QC_FAILED]: "质检不合格",
  [EventType.INVENTORY_LOW]: "库存不足",
  [EventType.SALES_DATA_UPDATED]: "销售数据更新",
  [EventType.SALES_TREND_DETECTED]: "销售趋势检测",
  [EventType.AFTERSALES_REPORTED]: "售后上报",
  [EventType.TREND_DATA_UPDATED]: "趋势数据更新",
  [EventType.CRON_DAILY]: "每日定时",
  [EventType.CRON_WEEKLY]: "每周定时",
  [EventType.CRON_HOURLY]: "每小时定时",
  [EventType.AI_SUGGESTION_CREATED]: "AI建议创建",
  [EventType.AI_SUGGESTION_EXECUTED]: "AI建议执行",
};
