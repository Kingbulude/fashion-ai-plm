import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || "";
    const { id: orderId } = await params;

    const body = await request.json();
    const { status, notes } = body;

    if (!status) {
      return NextResponse.json({ error: "请提供状态" }, { status: 400 });
    }

    const validStatuses = ["pending", "cutting", "sewing", "finishing", "completed"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "无效的状态值" }, { status: 400 });
    }

    const updateData: Record<string, any> = { status };
    if (notes) updateData.notes = notes;

    const { error } = await supabase
      .from("production_orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("company_id", companyId);

    if (error) {
      console.error("更新生产订单状态失败:", error);
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("生产订单状态更新错误:", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
