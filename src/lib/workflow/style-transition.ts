// 状态机工作流服务
// 1. 验证转换合法性
// 2. 执行状态转换
// 3. 自动生成待办

import { supabase } from "@/lib/db/client";
import {
  StyleStatus,
  isValidTransition,
  STYLE_TRANSITIONS,
  STATUS_CONFIG,
  getTransitionResponsibleNode,
} from "./style-state-machine";
import { resolveResponsibleUserByNode } from "./responsible-user";

interface TransitionInput {
  styleId: string;
  fromStatus: StyleStatus;
  toStatus: StyleStatus;
  event: string;
  userId?: string;
  comment?: string;
  brandId?: string;
}

interface TransitionResult {
  success: boolean;
  newStatus?: StyleStatus;
  error?: string;
  createdTodoId?: string;
}

export async function transitionStyle(input: TransitionInput): Promise<TransitionResult> {
  const { styleId, fromStatus, toStatus, event, userId, comment } = input;

  // 1. 验证转换合法性
  if (!isValidTransition(fromStatus, toStatus, event)) {
    return {
      success: false,
      error: `非法状态转换: ${fromStatus} → ${toStatus} (event: ${event})`,
    };
  }

  // 2. 检查必填字段
  const transition = STYLE_TRANSITIONS.find(
    (t) => t.from === fromStatus && t.to === toStatus && t.event === event
  );

  if (transition?.requiredFields) {
    const check = await checkRequiredFields(styleId, transition.requiredFields);
    if (!check.ok) {
      return { success: false, error: check.reason };
    }
  }

  // 3. 执行状态更新
  const { error: updateError } = await supabase
    .from("styles")
    .update({
      status: toStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", styleId);

  if (updateError) {
    return { success: false, error: `更新状态失败: ${updateError.message}` };
  }

  // 4. 记录操作日志
  await supabase.from("operation_logs").insert({
    action: "style_status_change",
    target_table: "styles",
    target_id: styleId,
    after_data: { from: fromStatus, to: toStatus, event, comment },
  });

  // 5. 自动创建待办并指派给对应负责人
  let createdTodoId: string | undefined;
  if (transition?.autoCreateTodo) {
    const styleTenant = await getStyleCompany(styleId);
    const responsibleNode = getTransitionResponsibleNode(transition);
    let assignedTo = userId;
    let assignmentSource = "trigger_user";

    if (responsibleNode) {
      const responsible = await resolveResponsibleUserByNode(
        responsibleNode,
        input.brandId || styleTenant?.brand_id,
        styleTenant?.company_id
      );
      if (responsible) {
        assignedTo = responsible.userId;
        assignmentSource = responsible.source;
      }
    }

    const { data: todo } = await supabase
      .from("todos")
      .insert({
        company_id: styleTenant?.company_id,
        brand_id: styleTenant?.brand_id,
        type: "task",
        title: transition.autoCreateTodo,
        description: `款式状态变更为「${STATUS_CONFIG[toStatus].label}」，自动生成的待办（来源：${assignmentSource}）`,
        target_table: "styles",
        target_id: styleId,
        priority: "high",
        status: "pending",
        assigned_to: assignedTo,
        created_by: userId,
      })
      .select("id")
      .single();
    createdTodoId = todo?.id;
  }

  return { success: true, newStatus: toStatus, createdTodoId };
}

async function checkRequiredFields(
  styleId: string,
  fields: string[]
): Promise<{ ok: boolean; reason?: string }> {
  for (const field of fields) {
    if (field === "design_assets") {
      const { count } = await supabase
        .from("design_assets")
        .select("id", { count: "exact", head: true })
        .eq("style_id", styleId);
      if (!count || count === 0) {
        return { ok: false, reason: "请先上传设计资产" };
      }
    } else if (field === "tech_packs") {
      const { count } = await supabase
        .from("tech_packs")
        .select("id", { count: "exact", head: true })
        .eq("style_id", styleId);
      if (!count || count === 0) {
        return { ok: false, reason: "请先创建工艺包" };
      }
    } else if (field === "bom_items") {
      const { count } = await supabase
        .from("bom_items")
        .select("id", { count: "exact", head: true })
        .eq("style_id", styleId);
      if (!count || count === 0) {
        return { ok: false, reason: "请先填写BOM清单" };
      }
    } else if (field === "production_orders") {
      const { count } = await supabase
        .from("production_orders")
        .select("id", { count: "exact", head: true })
        .eq("style_id", styleId);
      if (!count || count === 0) {
        return { ok: false, reason: "请先创建生产订单" };
      }
    } else if (field === "procurement_complete") {
      // 检查所有采购单都已完成
      const { data: procurements } = await supabase
        .from("material_procurement")
        .select("status")
        .eq("style_id", styleId);
      const incomplete = procurements?.filter((p) => p.status !== "fully_received");
      if (procurements && procurements.length > 0 && incomplete && incomplete.length > 0) {
        return { ok: false, reason: `还有 ${incomplete.length} 项采购未完成` };
      }
    } else if (field === "inventory_records") {
      const { count } = await supabase
        .from("inventory_records")
        .select("id", { count: "exact", head: true })
        .eq("style_id", styleId);
      if (!count || count === 0) {
        return { ok: false, reason: "请先入库登记" };
      }
    }
  }
  return { ok: true };
}

async function getStyleCompany(styleId: string) {
  const { data } = await supabase
    .from("styles")
    .select("company_id, brand_id")
    .eq("id", styleId)
    .single();
  return data;
}
