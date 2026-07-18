import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";
import { logOperation } from "@/lib/auth/audit";

export const runtime = "edge";

// 获取审批列表
export async function GET(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending";
    const brandId = url.searchParams.get("brand_id");

    let query = supabase
      .from("approval_flows")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (brandId) {
      query = query.eq("brand_id", brandId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch approvals:", error);
    return NextResponse.json([]);
  }
}

// 提交审批申请（执行者发起）
export async function POST(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { brandId, tableName, recordId, action, proposedData } = body;

    if (!tableName || !recordId || !action || !proposedData) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("approval_flows")
      .insert({
        brand_id: brandId || null,
        table_name: tableName,
        record_id: recordId,
        action,
        proposed_data: proposedData,
        submitted_by: session.user.id,
        status: "pending",
      })
      .select()
      .single();

    if (error) throw error;

    await logOperation({
      userId: session.user.id,
      brandId,
      action: "create",
      targetTable: "approval_flows",
      targetId: data.id,
      afterData: data,
      request,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to submit approval:", error);
    return NextResponse.json({ error: "Failed to submit approval" }, { status: 500 });
  }
}

// 审批处理（工序负责人/品牌负责人/老板）
export async function PUT(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level")
      .eq("user_id", session.user.id)
      .single();

    // 只有负责人级别以上才能审批
    const allowedRoles = [RoleLevel.BOSS, RoleLevel.ADMIN, RoleLevel.BRAND_MANAGER, RoleLevel.PROCESS_OWNER];
    if (!allowedRoles.includes(profile?.role_level as RoleLevel)) {
      return NextResponse.json({ error: "Forbidden - 无审批权限" }, { status: 403 });
    }

    const body = await request.json();
    const { id, status, reviewComment } = body;

    if (!id || !status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    // 获取审批申请
    const { data: approval, error: fetchError } = await supabase
      .from("approval_flows")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !approval) {
      return NextResponse.json({ error: "审批记录不存在" }, { status: 404 });
    }

    // 更新审批状态
    const { data, error } = await supabase
      .from("approval_flows")
      .update({
        status,
        review_comment: reviewComment || null,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 如果审批通过，将数据写入目标表
    if (status === "approved") {
      const targetTable = approval.table_name;
      const recordId = approval.record_id;
      const proposedData = approval.proposed_data;

      if (approval.action === "create") {
        await supabase.from(targetTable).insert(proposedData);
      } else if (approval.action === "update") {
        await supabase.from(targetTable).update(proposedData).eq("id", recordId);
      } else if (approval.action === "delete") {
        await supabase.from(targetTable).delete().eq("id", recordId);
      }
    }

    await logOperation({
      userId: session.user.id,
      brandId: approval.brand_id,
      action: `approval_${status}`,
      targetTable: "approval_flows",
      targetId: id,
      afterData: data,
      request,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to process approval:", error);
    return NextResponse.json({ error: "Failed to process approval" }, { status: 500 });
  }
}
