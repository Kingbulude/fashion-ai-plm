import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { getTenantFromHeaders } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

const DEFAULT_COMPANY = "00000000-0000-0000-0000-000000000010";

export async function GET(request: Request) {
  try {
    const tenant = getTenantFromHeaders(request);
    const companyId = tenant?.company_id || DEFAULT_COMPANY;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { data: bomItems } = await supabase
      .from("bom_items")
      .select("id, style_id, material_name, material_type, status")
      .eq("company_id", companyId)
      .neq("status", "obsolete");

    const bomList = (toCamelCase(bomItems) || []) as any[];

    const styleIds = [...new Set(bomList.map((b: any) => b.styleId))];

    const { data: procurements } = await supabase
      .from("material_procurement")
      .select("*, styles:style_id(style_no, style_name, brand_id)")
      .in("style_id", styleIds)
      .neq("status", "fully_received");

    const procs = (toCamelCase(procurements) || []) as any[];

    const { data: productionOrders } = await supabase
      .from("production_orders")
      .select("style_id, status")
      .eq("company_id", companyId)
      .in("status", ["pending", "cutting", "sewing", "finishing"]);

    const prodOrders = (toCamelCase(productionOrders) || []) as any[];
    const activeStyleIds = [...new Set(prodOrders.map((p: any) => p.styleId))];

    const alerts: any[] = [];

    for (const styleId of styleIds) {
      const styleBoms = bomList.filter((b: any) => b.styleId === styleId);
      const styleProcs = procs.filter((p: any) => p.styleId === styleId);
      const hasActiveProduction = activeStyleIds.includes(styleId);

      const totalItems = styleBoms.length;
      const receivedItems = styleBoms.filter((b: any) => {
        const p = styleProcs.find((pp: any) => pp.bomItemId === b.id);
        return !p;
      }).length;
      const missingItems = totalItems - styleBoms.filter((b: any) => {
        const p = styleProcs.find((pp: any) => pp.bomItemId === b.id);
        return p ? false : true;
      }).length;

      const missingBoms = styleBoms.filter((b: any) => {
        const p = styleProcs.find((pp: any) => pp.bomItemId === b.id);
        return !p || p.status !== "fully_received";
      });

      const delayedItems = styleProcs.filter((p: any) => p.isDelayed).length;

      if (missingBoms.length > 0) {
        const firstProc = styleProcs[0];
        alerts.push({
          styleId,
          styleNo: firstProc?.styles?.styleNo || "",
          styleName: firstProc?.styles?.styleName || "",
          brandId: firstProc?.styles?.brandId || null,
          totalItems,
          missingItems: missingBoms.length,
          delayedItems,
          hasActiveProduction,
          missingMaterials: missingBoms.slice(0, 3).map((b: any) => b.materialName),
          alertLevel: hasActiveProduction
            ? delayedItems > 0
              ? "urgent"
              : "high"
            : delayedItems > 0
            ? "high"
            : "normal",
        });
      }
    }

    alerts.sort((a, b) => {
      const levelOrder: Record<string, number> = { urgent: 0, high: 1, normal: 2 };
      if (levelOrder[a.alertLevel] !== levelOrder[b.alertLevel]) {
        return levelOrder[a.alertLevel] - levelOrder[b.alertLevel];
      }
      return b.delayedItems - a.delayedItems;
    });

    const summary = {
      totalAlerts: alerts.length,
      urgentAlerts: alerts.filter((a) => a.alertLevel === "urgent").length,
      highAlerts: alerts.filter((a) => a.alertLevel === "high").length,
      activeProductionAffected: alerts.filter((a) => a.hasActiveProduction).length,
    };

    return NextResponse.json({ alerts, summary });
  } catch {
    return NextResponse.json({ error: "获取物料预警失败" }, { status: 500 });
  }
}
