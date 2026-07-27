import { NextResponse } from "next/server";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { transitionStyle } from "@/lib/workflow/style-transition";

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
    if (status === "completed") {
      updateData.completed_at = new Date().toISOString();
    } else {
      updateData.completed_at = null;
    }

    const { data: order, error: orderError } = await supabase
      .from("production_orders")
      .select("style_id, company_id")
      .eq("id", orderId)
      .single();

    if (orderError) {
      console.error("查询生产订单失败:", orderError);
      return NextResponse.json({ error: "订单不存在" }, { status: 404 });
    }

    // 租户隔离二次确认
    if (order.company_id !== companyId) {
      return NextResponse.json({ error: "无权操作" }, { status: 403 });
    }

    const { error } = await supabase
      .from("production_orders")
      .update(updateData)
      .eq("id", orderId)
      .eq("company_id", companyId);

    if (error) {
      console.error("更新生产订单状态失败:", error);
      return NextResponse.json({ error: "更新失败" }, { status: 500 });
    }

    // 生产订单完成时，自动推进款式状态到大货完成
    if (status === "completed" && order?.style_id) {
      try {
        const { data: style } = await supabase
          .from("styles")
          .select("status, brand_id")
          .eq("id", order.style_id)
          .single();

        if (style && style.status === "producing") {
          await transitionStyle({
            styleId: order.style_id,
            fromStatus: "producing",
            toStatus: "produced",
            event: "production_complete",
            userId: ctx.user.id,
            brandId: style.brand_id,
            supabase,
          });
        }
      } catch (err) {
        console.error("自动推进款式状态失败:", err);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("生产订单状态更新错误:", err);
    return NextResponse.json({ error: "更新失败" }, { status: 500 });
  }
}
