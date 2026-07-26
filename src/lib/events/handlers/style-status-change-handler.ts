// 状态变更事件处理器
// 监听 STYLE_STATUS_CHANGED 事件，做跨工序信息流转补强
// 注：transitionStyle() 已自动创建待办并指派给下一工序负责人
// 此处理器负责：记录跨工序流转日志 + 预留飞书/企微通知扩展点

import { AppEvent, EventHandler } from "../types";
import { supabase as globalSupabase } from "@/lib/db/client";
import { statusToProcessNode, STATUS_CONFIG } from "@/lib/workflow/style-state-machine";

// 状态变更 → 跨工序信息流转
export const styleStatusChangeHandler: EventHandler = async (event: AppEvent) => {
  const payload = event.payload as any;
  const { styleId, fromStatus, toStatus, brandId: _brandId, responsibleNode, userId } = payload;
  const supabase = payload.supabase || globalSupabase;

  if (!styleId || !fromStatus || !toStatus) return;

  try {
    // 查款式基本信息
    const { data: style } = await supabase
      .from("styles")
      .select("name, style_no, company_id")
      .eq("id", styleId)
      .single();

    if (!style) return;

    const fromLabel = (STATUS_CONFIG as any)[fromStatus]?.label || fromStatus;
    const toLabel = (STATUS_CONFIG as any)[toStatus]?.label || toStatus;
    const nextNode = statusToProcessNode(toStatus);

    // 写入跨工序流转日志（operation_logs）
    await supabase.from("operation_logs").insert({
      action: "cross_process_flow",
      target_table: "styles",
      target_id: styleId,
      before_data: { fromStatus, fromLabel, responsibleNode },
      after_data: {
        toStatus,
        toLabel,
        nextNode,
        eventId: event.id,
        styleName: style.name,
        styleNo: style.style_no,
      },
      user_id: userId,
      company_id: style.company_id,
    });

    // 预留扩展点：后续可在此调用飞书/企微 Skill 通知下一工序负责人
    // 示例：
    // if (nextNode && responsibleNode) {
    //   await executeSkill("send-lark-message", {
    //     title: `款式「${style.name}」已进入${toLabel}阶段`,
    //     content: `款号：${style.style_no}\n下一工序：${nextNode}\n请及时处理`,
    //     styleId,
    //   });
    // }

    console.log(
      `[event] 跨工序流转: ${style.style_no} ${fromLabel} → ${toLabel} (下一工序: ${nextNode || "无"})`
    );
  } catch (err) {
    console.error("[event] 状态变更处理失败:", err);
  }
};
