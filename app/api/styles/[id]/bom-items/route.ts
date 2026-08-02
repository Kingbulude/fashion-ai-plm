import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth, resolveStyleTenant, withTenant } from "@/lib/auth/tenant-helpers";
import { validateBody, bomItemCreateSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

// 计算单条 BOM 总成本
function computeTotalCost(unitConsumption: number, lossRate: number, unitPrice: number | null): number | null {
  if (!unitPrice) return null;
  // 总耗量 = 单耗 × (1 + 损耗率)
  const totalConsumption = unitConsumption * (1 + (lossRate || 0));
  return Math.round(totalConsumption * unitPrice * 100) / 100;
}

// 获取款式的 BOM 物料清单
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;

    const { data, error } = await supabase
      .from("bom_items")
      .select("*")
      .eq("style_id", id)
      .order("material_type", { ascending: true });

    if (error) {
      return NextResponse.json({ error: "获取 BOM 清单失败" }, { status: 500 });
    }

    const items = toCamelCase<any[]>(data) || [];

    // 计算合计
    const totalCost = items.reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    const fabricCost = items
      .filter((i) => i.materialType === "fabric")
      .reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    const accessoryCost = items
      .filter((i) => i.materialType === "accessory")
      .reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);
    const packagingCost = items
      .filter((i) => i.materialType === "packaging")
      .reduce((sum, item) => sum + (Number(item.totalCost) || 0), 0);

    return NextResponse.json({
      items,
      summary: {
        totalCost: Math.round(totalCost * 100) / 100,
        fabricCost: Math.round(fabricCost * 100) / 100,
        accessoryCost: Math.round(accessoryCost * 100) / 100,
        packagingCost: Math.round(packagingCost * 100) / 100,
        itemCount: items.length,
      },
    });
  } catch {
    return NextResponse.json({ error: "获取 BOM 清单失败" }, { status: 500 });
  }
}

// 新增 BOM 物料
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;
    const body = await request.json();

    const validation = validateBody(bomItemCreateSchema, body);
    if (!validation.ok) return validation.response;
    const { materialName, materialType, specification, unitConsumption, lossRate, unitPrice, aiSuggested } = validation.data;

    const uc = Number(unitConsumption);
    const lr = Number(lossRate || 0);
    const up = unitPrice ? Number(unitPrice) : null;
    const totalCost = computeTotalCost(uc, lr, up);

    // 自动从款式继承租户字段（多品牌隔离）
    const { tenant, error: tenantError } = await resolveStyleTenant(id, supabase);
    if (tenantError) {
      return NextResponse.json({ error: tenantError }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("bom_items")
      .insert(
        withTenant(
          {
            style_id: id,
            material_name: materialName,
            material_type: materialType,
            specification: specification ?? null,
            unit_consumption: uc,
            loss_rate: lr,
            unit_price: up,
            total_cost: totalCost,
            ai_suggested: aiSuggested ?? false,
            status: "draft",
            version_no: 1,
          },
          tenant
        )
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "添加 BOM 物料失败" }, { status: 500 });
    }

    // 同步更新款式实际成本
    await syncStyleActualCost(id, supabase);

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "添加 BOM 物料失败" }, { status: 500 });
  }
}

// 同步更新款式的实际成本（所有 BOM 总和）
async function syncStyleActualCost(styleId: string, supabase: SupabaseClient) {
  try {
    const { data } = await supabase
      .from("bom_items")
      .select("total_cost")
      .eq("style_id", styleId);

    if (!data) return;
    const total = data.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);
    const rounded = Math.round(total * 100) / 100;

    await supabase
      .from("styles")
      .update({ actual_cost: rounded, updated_at: new Date() })
      .eq("id", styleId);
  } catch {
    // 静默失败，不影响主流程
  }
}
