import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth, resolveStyleTenant } from "@/lib/auth/tenant-helpers";
import { resolveResponsibleUserByNode } from "@/lib/workflow/responsible-user";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const body = await request.json();
    const { action, reason: _reason, userId } = body;

    if (action === "check_and_alert") {
      const result = await checkMaterialFulfillmentAndAlert(id, userId, supabase);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "操作失败" }, { status: 500 });
  }
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const result = await getMaterialFulfillmentStatus(id, supabase);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "获取失败" }, { status: 500 });
  }
}

async function getMaterialFulfillmentStatus(styleId: string, supabase: SupabaseClient) {
  const { data: bomItems } = await supabase
    .from("bom_items")
    .select("id, material_name, material_type, unit_consumption, status")
    .eq("style_id", styleId)
    .neq("status", "obsolete");

  const items = (toCamelCase(bomItems) || []) as any[];

  const { data: procurements } = await supabase
    .from("material_procurement")
    .select("*, bom_items:bom_item_id(material_name)")
    .eq("style_id", styleId);

  const procs = (toCamelCase(procurements) || []) as any[];

  const fulfillment = items.map((bom: any) => {
    const proc = procs.find((p: any) => p.bomItemId === bom.id);
    const isDelayed = proc?.isDelayed || false;
    const delayDays = proc?.delayDays || 0;
    let fulfillmentStatus = "no_order";
    if (proc) {
      if (proc.status === "fully_received") fulfillmentStatus = "received";
      else if (proc.status === "partial_received") fulfillmentStatus = "partial";
      else if (proc.status === "ordered") fulfillmentStatus = "ordered";
      else fulfillmentStatus = "pending";
    }
    return {
      bomId: bom.id,
      materialName: bom.materialName,
      materialType: bom.materialType,
      requiredQuantity: bom.unitConsumption,
      status: fulfillmentStatus,
      receivedQuantity: proc?.receivedQuantity || 0,
      orderQuantity: proc?.orderQuantity || 0,
      expectedDate: proc?.expectedDate || null,
      actualDate: proc?.actualDate || null,
      isDelayed,
      delayDays,
      supplierName: proc?.suppliers?.name || null,
    };
  });

  const totalItems = fulfillment.length;
  const receivedItems = fulfillment.filter((f) => f.status === "received").length;
  const missingItems = totalItems - receivedItems;
  const delayedItems = fulfillment.filter((f) => f.isDelayed).length;
  const allFulfilled = totalItems > 0 && missingItems === 0;

  return {
    allFulfilled,
    totalItems,
    receivedItems,
    missingItems,
    delayedItems,
    fulfillment,
  };
}

async function checkMaterialFulfillmentAndAlert(styleId: string, userId: string, supabase: SupabaseClient) {
  const status = await getMaterialFulfillmentStatus(styleId, supabase);

  if (status.allFulfilled) {
    // 物料齐套，关闭所有缺料预警待办
    await supabase
      .from("todos")
      .update({ status: "completed" })
      .eq("target_table", "styles")
      .eq("target_id", styleId)
      .eq("alert_type", "material_shortage")
      .eq("status", "pending");

    return { ...status, alertCreated: false, message: "物料齐套，无缺料预警" };
  }

  // 检查是否已有未完成的缺料预警
  const { data: existingAlerts } = await supabase
    .from("todos")
    .select("id")
    .eq("target_table", "styles")
    .eq("target_id", styleId)
    .eq("alert_type", "material_shortage")
    .eq("status", "pending")
    .limit(1);

  if (existingAlerts && existingAlerts.length > 0) {
    return { ...status, alertCreated: false, message: "已有未处理的缺料预警" };
  }

  // 创建缺料预警待办
  const { tenant } = await resolveStyleTenant(styleId, supabase);

  let assignedTo = userId;
  let assignmentSource = "trigger_user";

  try {
    const responsible = await resolveResponsibleUserByNode(
      "procurement",
      tenant?.brand_id,
      tenant?.company_id
    );
    if (responsible) {
      assignedTo = responsible.userId;
      assignmentSource = responsible.source;
    }
  } catch {
    // 指派失败则使用触发用户
  }

  const delayedText = status.delayedItems > 0 ? `，其中 ${status.delayedItems} 种已延迟` : "";
  const alertLevel = status.delayedItems > 0 ? "urgent" : "high";

  const { data: todo } = await supabase
    .from("todos")
    .insert({
      company_id: tenant?.company_id,
      brand_id: tenant?.brand_id,
      type: "alert",
      title: `缺料预警：${status.missingItems} 种物料未到货${delayedText}`,
      description: `款式共有 ${status.totalItems} 种物料，已到货 ${status.receivedItems} 种，还差 ${status.missingItems} 种未到货。请尽快跟进采购进度。`,
      target_table: "styles",
      target_id: styleId,
      priority: alertLevel,
      status: "pending",
      assigned_to: assignedTo,
      created_by: userId,
      alert_type: "material_shortage",
      alert_level: alertLevel,
    })
    .select("id")
    .single();

  return {
    ...status,
    alertCreated: true,
    alertId: todo?.id,
    assignedTo,
    assignmentSource,
    message: `已创建缺料预警待办，指派给：${assignmentSource}`,
  };
}
