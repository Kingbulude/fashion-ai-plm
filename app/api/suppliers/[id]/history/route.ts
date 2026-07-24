// 供应商合作历史 API
// 获取与该供应商相关的采购、生产记录

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    const [procurements, productions] = await Promise.all([
      supabase
        .from("material_procurement")
        .select("*, styles:style_id(name, style_no)")
        .eq("supplier_id", id),
      supabase
        .from("production_orders")
        .select("*, styles:style_id(name, style_no)")
        .eq("supplier_id", id),
    ]);

    const rawProcurements = toCamelCase(procurements.data);
    const rawProductions = toCamelCase(productions.data);
    const procurementsData: any[] = Array.isArray(rawProcurements) ? rawProcurements : [];
    const productionsData: any[] = Array.isArray(rawProductions) ? rawProductions : [];

    const history: any[] = [];

    // 采购记录
    for (const p of procurementsData) {
      history.push({
        type: p.status === "fully_received" ? "success" : p.status === "pending" ? "warning" : "info",
        title: "采购订单",
        description: `${p.materialName || p.material_name} x ${p.quantity}`,
        styleName: p.styles?.name || p.styles?.style_no,
        amount: p.totalAmount || p.total_amount,
        date: p.createdAt || p.created_at,
      });
    }

    // 生产记录
    for (const p of productionsData) {
      history.push({
        type: p.status === "completed" ? "success" : p.status === "in_production" ? "info" : "warning",
        title: "生产订单",
        description: `${p.styles?.name || p.styles?.style_no} x ${p.quantity}`,
        styleName: p.styles?.name || p.styles?.style_no,
        amount: p.totalCost || p.total_cost,
        date: p.createdAt || p.created_at,
      });
    }

    // 按时间排序
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return NextResponse.json(history);
  } catch {
    return NextResponse.json([]);
  }
}
