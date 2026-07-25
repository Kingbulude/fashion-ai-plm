// 事件处理器注册中心
// 注册所有业务事件处理器，接入事件总线

import { on } from "../emitter";
import { EventType } from "../types";
import { styleStatusChangeHandler } from "./style-status-change-handler";

let initialized = false;

export function registerEventHandlers(): void {
  if (initialized) return;
  initialized = true;

  // 状态变更 → 跨工序信息流转
  on(EventType.STYLE_STATUS_CHANGED, styleStatusChangeHandler, {
    id: "style-status-change-handler",
    priority: 5,
  });

  console.log("[events] event handlers registered");
}
