import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { logOperation, recordVersion } from "@/lib/auth/audit";

export const runtime = "edge";

const defaultLinks = [
  { id: "1", from_node: "planning", to_node: "design", link_type: "critical", duration_hours: 40, deadline: "2026-08-01", work_content: "完成商品企划、设计方向确认、面料色彩企划", deliverables: "企划方案文档、主题板、色彩方案、面料方案", sort_order: 1 },
  { id: "2", from_node: "design", to_node: "sampling", link_type: "critical", duration_hours: 60, deadline: "2026-08-15", work_content: "完成款式设计、BOM表、工艺单、尺寸表", deliverables: "款式设计图、BOM清单、工艺单、尺寸规格表", sort_order: 2 },
  { id: "3", from_node: "sampling", to_node: "testing", link_type: "critical", duration_hours: 30, deadline: "2026-08-25", work_content: "制作首样、试穿修改、确认版型", deliverables: "确认样衣、版型报告、修改意见", sort_order: 3 },
  { id: "4", from_node: "sampling", to_node: "procurement", link_type: "critical", duration_hours: 20, deadline: "2026-08-20", work_content: "确认面料供应商、下达采购订单", deliverables: "面料采购单、供应商确认函、交期确认", sort_order: 4 },
  { id: "5", from_node: "testing", to_node: "procurement", link_type: "parallel", duration_hours: 10, deadline: "2026-08-28", work_content: "根据测款结果调整采购计划、确认面料风险", deliverables: "测款反馈、采购调整建议、面料备选方案", sort_order: 5 },
  { id: "6", from_node: "procurement", to_node: "stocking", link_type: "critical", duration_hours: 80, deadline: "2026-09-20", work_content: "物料采购到货、大货生产、制程质检、成品入库", deliverables: "采购到货单、生产订单、质检报告、入库单", sort_order: 6 },
  { id: "7", from_node: "testing", to_node: "sales", link_type: "critical", duration_hours: 15, deadline: "2026-09-05", work_content: "AI测款验证、市场测试、接受度评估、下单决策", deliverables: "测款报告、接受度评估、下单建议", sort_order: 7 },
  { id: "8", from_node: "stocking", to_node: "sales", link_type: "critical", duration_hours: 10, deadline: "2026-09-25", work_content: "备货完成、库存就位、发货准备", deliverables: "库存确认单、发货清单、物流安排", sort_order: 8 },
  { id: "9", from_node: "sales", to_node: "aftersales", link_type: "critical", duration_hours: 0, deadline: null, work_content: "销售运营、订单处理、物流配送", deliverables: "销售订单、发货单、物流信息", sort_order: 9 },
  { id: "10", from_node: "aftersales", to_node: "planning", link_type: "feedback", duration_hours: 10, deadline: null, work_content: "售后复盘、客户反馈收集、数据沉淀", deliverables: "售后报告、客户反馈汇总、复盘分析报告", sort_order: 10 },
];

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("process_links")
      .select("*")
      .order("sort_order", { ascending: true });

    if (error) throw error;
    if (data && data.length > 0) {
      return NextResponse.json(data);
    }
    return NextResponse.json(defaultLinks);
  } catch (err) {
    return NextResponse.json(defaultLinks);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession(request as any);
    const userId = session?.user?.id || "anonymous";

    const body = await request.json();
    const { id, duration_hours, deadline, work_content, deliverables, from_node, to_node, link_type } = body;

    if (!id && !(from_node && to_node)) {
      return NextResponse.json({ error: "缺少ID或from_node/to_node参数" }, { status: 400 });
    }

    const updateData: any = {};
    if (duration_hours !== undefined) updateData.duration_hours = duration_hours;
    if (deadline !== undefined) updateData.deadline = deadline;
    if (work_content !== undefined) updateData.work_content = work_content;
    if (deliverables !== undefined) updateData.deliverables = deliverables;

    let recordId = id;
    let beforeData: any = null;
    let resultData: any = null;

    // 1. 优先按 id 查找并更新（排除前端生成的 default- 占位 id）
    const isPlaceholderId = typeof id === "string" && id.startsWith("default-");
    if (id && !isPlaceholderId) {
      const { data: existing } = await supabase
        .from("process_links")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (existing) {
        beforeData = existing;
        const { data, error } = await supabase
          .from("process_links")
          .update(updateData)
          .eq("id", id)
          .select()
          .single();
        if (error) throw error;
        resultData = data;
      }
    }

    // 2. 按 from_node + to_node 查找并更新/插入
    if (!resultData && from_node && to_node) {
      const { data: existing } = await supabase
        .from("process_links")
        .select("*")
        .eq("from_node", from_node)
        .eq("to_node", to_node)
        .maybeSingle();

      if (existing) {
        beforeData = existing;
        recordId = existing.id;
        const { data, error } = await supabase
          .from("process_links")
          .update(updateData)
          .eq("id", existing.id)
          .select()
          .single();
        if (error) throw error;
        resultData = data;
      } else {
        // 新建记录
        const insertPayload: any = {
          from_node,
          to_node,
          link_type: link_type || "critical",
          duration_hours: duration_hours ?? 0,
          deadline: deadline ?? null,
          work_content: work_content ?? "",
          deliverables: deliverables ?? "",
        };
        const { data, error } = await supabase
          .from("process_links")
          .insert(insertPayload)
          .select()
          .single();
        if (error) throw error;
        resultData = data;
        recordId = data?.id ?? id;
      }
    }

    if (!resultData) {
      return NextResponse.json({ error: "未找到可更新的工序链接" }, { status: 404 });
    }

    // 记录操作日志和数据版本（失败不影响主流程）
    try {
      await Promise.all([
        logOperation({
          userId,
          action: beforeData ? "update" : "create",
          targetTable: "process_links",
          targetId: recordId,
          beforeData,
          afterData: resultData,
          request,
        }),
        recordVersion({
          tableName: "process_links",
          recordId: recordId,
          data: resultData,
          changedBy: userId,
          changeReason: beforeData ? "更新工序链接" : "新建工序链接",
        }),
      ]);
    } catch (logError) {
      console.error("Failed to log operation:", logError);
    }

    return NextResponse.json(resultData);
  } catch (err) {
    console.error("PUT /api/process-links error:", err);
    const errorMessage = err instanceof Error ? err.message : typeof err === "object" && err !== null ? JSON.stringify(err) : "更新失败";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}