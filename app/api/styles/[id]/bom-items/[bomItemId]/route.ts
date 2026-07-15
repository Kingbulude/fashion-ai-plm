import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string; bomItemId: string }> };

function computeTotalCost(unitConsumption: number, lossRate: number, unitPrice: number | null): number | null {
  if (!unitPrice) return null;
  const totalConsumption = unitConsumption * (1 + (lossRate || 0));
  return Math.round(totalConsumption * unitPrice * 100) / 100;
}

// 获取单个 BOM 物料
export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { bomItemId } = await params;

    const { data, error } = await supabase
      .from("bom_items")
      .select("*")
      .eq("id", bomItemId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "BOM 物料不存在" }, { status: 404 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取 BOM 物料失败" }, { status: 500 });
  }
}

// 更新 BOM 物料
export async function PUT(request: Request, { params }: RouteContext) {
  try {
    const { id, bomItemId } = await params;
    const body = await request.json();

    const { materialName, materialType, specification, unitConsumption, lossRate, unitPrice } = body;

    const updateData: Record<string, unknown> = {};
    if (materialName !== undefined) updateData.material_name = materialName;
    if (materialType !== undefined) updateData.material_type = materialType;
    if (specification !== undefined) updateData.specification = specification;
    if (unitConsumption !== undefined) updateData.unit_consumption = Number(unitConsumption);
    if (lossRate !== undefined) updateData.loss_rate = Number(lossRate);
    if (unitPrice !== undefined) updateData.unit_price = unitPrice ? Number(unitPrice) : null;

    // 重新计算总成本
    if (unitConsumption !== undefined || lossRate !== undefined || unitPrice !== undefined) {
      const uc = unitConsumption !== undefined ? Number(unitConsumption) : 0;
      const lr = lossRate !== undefined ? Number(lossRate) : 0;
      const up = unitPrice ? Number(unitPrice) : null;
      updateData.total_cost = computeTotalCost(uc, lr, up);
    }

    const { data, error } = await supabase
      .from("bom_items")
      .update(updateData)
      .eq("id", bomItemId)
      .select()
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "BOM 物料不存在" }, { status: 404 });
    }

    // 同步更新款式实际成本
    await syncStyleActualCost(id);

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新 BOM 物料失败" }, { status: 500 });
  }
}

// 删除 BOM 物料
export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    const { id, bomItemId } = await params;

    const { error } = await supabase
      .from("bom_items")
      .delete()
      .eq("id", bomItemId);

    if (error) {
      return NextResponse.json({ error: "删除 BOM 物料失败" }, { status: 500 });
    }

    // 同步更新款式实际成本
    await syncStyleActualCost(id);

    return NextResponse.json({ message: "删除成功" }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "删除 BOM 物料失败" }, { status: 500 });
  }
}

async function syncStyleActualCost(styleId: string) {
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
    // 静默失败
  }
}
