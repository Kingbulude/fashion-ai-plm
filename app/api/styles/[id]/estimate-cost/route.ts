import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { estimateStyleCost } from "@/lib/ai/cloudflare-ai";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

interface CostBreakdown {
  fabricCost?: number;
  accessoryCost?: number;
  packagingCost?: number;
  laborCost?: number;
  overheadCost?: number;
}

interface ParsedCostEstimate {
  estimatedCost?: number;
  costRange?: { low?: number; high?: number };
  breakdown?: CostBreakdown;
  suggestions?: string[];
}

// AI 估算款式生产成本（基于款式信息，BOM 未完成时使用）
export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    // 多租户隔离：校验款式归属
    const requestHeaders = request.headers;
    const { data: style, error: styleError } = await supabase
      .from("styles")
      .select("id, name, description, category, design_features, target_audience, target_cost, actual_cost, company_id")
      .eq("id", id)
      .single();

    if (styleError || !style) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    const headerCompanyId = requestHeaders.get("x-company-id");
    if (headerCompanyId && style.company_id && headerCompanyId !== style.company_id) {
      return NextResponse.json({ error: "无权访问该款式" }, { status: 403 });
    }

    const aiResult = await estimateStyleCost(
      style.name,
      style.category,
      style.description,
      style.design_features,
      style.target_audience
    );

    // 解析 AI 返回的 JSON
    const jsonMatch = aiResult.match(/\{[\s\S]*\}/);
    let parsed: ParsedCostEstimate = {};
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]) as ParsedCostEstimate;
      } catch {
        // 解析失败则保留空对象
      }
    }

    if (parsed.estimatedCost === undefined) {
      return NextResponse.json({
        error: "AI 未返回有效的成本估算",
        raw: aiResult,
      }, { status: 422 });
    }

    return NextResponse.json({
      estimatedCost: Number(parsed.estimatedCost),
      costRange: {
        low: Number(parsed.costRange?.low ?? parsed.estimatedCost),
        high: Number(parsed.costRange?.high ?? parsed.estimatedCost),
      },
      breakdown: {
        fabricCost: Number(parsed.breakdown?.fabricCost ?? 0),
        accessoryCost: Number(parsed.breakdown?.accessoryCost ?? 0),
        packagingCost: Number(parsed.breakdown?.packagingCost ?? 0),
        laborCost: Number(parsed.breakdown?.laborCost ?? 0),
        overheadCost: Number(parsed.breakdown?.overheadCost ?? 0),
      },
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      currentTargetCost: style.target_cost ?? null,
      currentActualCost: style.actual_cost ?? null,
    }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 成本估算失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
