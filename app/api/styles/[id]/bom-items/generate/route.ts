import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { generateBom } from "@/lib/ai/cloudflare-ai";
import { requireApiAuth, resolveStyleTenant, withTenant } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

interface AiBomItem {
  materialName?: string;
  materialType?: string;
  specification?: string;
  unitConsumption?: number;
  lossRate?: number;
  unitPrice?: number;
  reason?: string;
}

interface ParsedBomResult {
  items?: AiBomItem[];
  totalEstimatedCost?: number;
  summary?: string;
}

function computeTotalCost(unitConsumption: number, lossRate: number, unitPrice: number | null): number | null {
  if (!unitPrice) return null;
  const totalConsumption = unitConsumption * (1 + (lossRate || 0));
  return Math.round(totalConsumption * unitPrice * 100) / 100;
}

function normalizeMaterialType(raw: unknown): "fabric" | "accessory" | "packaging" {
  const v = String(raw || "").toLowerCase();
  if (v.includes("accessory") || v.includes("辅料")) return "accessory";
  if (v.includes("packaging") || v.includes("包装")) return "packaging";
  return "fabric";
}

// AI 生成 BOM 物料清单草稿（基于款式信息）
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const { id } = await params;

    // 多租户隔离：从请求头获取租户，验证款式归属
    const requestHeaders = request.headers;
    const { data: style, error: styleError } = await supabase
      .from("styles")
      .select("id, name, description, category, target_cost, company_id")
      .eq("id", id)
      .single();

    if (styleError || !style) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    // 校验请求头中的 company_id 与款式一致（若有）
    const headerCompanyId = requestHeaders.get("x-company-id");
    if (headerCompanyId && style.company_id && headerCompanyId !== style.company_id) {
      return NextResponse.json({ error: "无权访问该款式" }, { status: 403 });
    }

    const aiResult = await generateBom(
      style.name,
      style.description || "",
      style.category,
      style.target_cost
    );

    // 解析 AI 返回的 JSON
    const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
    let parsed: ParsedBomResult = {};
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as ParsedBomResult;
      } catch {
        // 解析失败则保留空对象
      }
    }

    const aiItems = Array.isArray(parsed.items) ? parsed.items : [];
    if (aiItems.length === 0) {
      return NextResponse.json({
        error: "AI 未返回有效的 BOM 物料",
        raw: aiResult,
      }, { status: 422 });
    }

    // 获取款式租户上下文，用于自动填充 company_id/brand_id/season_id
    const { tenant, error: tenantError } = await resolveStyleTenant(id, supabase);
    if (tenantError) {
      return NextResponse.json({ error: tenantError }, { status: 400 });
    }

    // 写入 BOM 物料表
    const insertedItems: Record<string, unknown>[] = [];
    for (const item of aiItems) {
      if (!item.materialName || item.unitConsumption === undefined) continue;

      const uc = Number(item.unitConsumption) || 0;
      const lr = Number(item.lossRate || 0);
      const up = item.unitPrice ? Number(item.unitPrice) : null;
      const totalCost = computeTotalCost(uc, lr, up);

      const { data, error } = await supabase
        .from("bom_items")
        .insert(
          withTenant(
            {
              style_id: id,
              material_name: item.materialName,
              material_type: normalizeMaterialType(item.materialType),
              specification: item.specification ?? null,
              unit_consumption: uc,
              loss_rate: lr,
              unit_price: up,
              total_cost: totalCost,
              ai_suggested: true,
              status: "draft",
              version_no: 1,
            },
            tenant
          )
        )
        .select()
        .single();

      if (!error && data) {
        insertedItems.push(data);
      }
    }

    // 同步款式实际成本
    await syncStyleActualCost(id, supabase);

    return NextResponse.json({
      insertedCount: insertedItems.length,
      totalEstimatedCost: parsed.totalEstimatedCost ?? null,
      summary: parsed.summary ?? null,
      items: insertedItems,
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 生成 BOM 失败";
    return NextResponse.json({ error: message }, { status: 500 });
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
