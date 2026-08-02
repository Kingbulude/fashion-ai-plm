import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/client";
import { generateText } from "@/lib/ai/cloudflare-ai";
import { safeJsonParse } from "@/lib/pipeline/steps";
import {
  AIRoleLevel,
  AISpecialistType,
  AISuggestionPriority,
  AISuggestionType,
} from "@/lib/ai/architecture";
import { createAISuggestion } from "@/lib/ai/suggestion-helper";

export const runtime = "edge";

type RouteContext = { params: Promise<{ styleId: string }> };

interface ReorderSimulation {
  shouldReorder: boolean;
  recommendedQuantity: number;
  urgentLevel: "low" | "medium" | "high";
  bestReorderDate: string;
  estimatedSellOutDate: string;
  colorSizePriority: { color: string; size: string; quantity: number };
  reasoning: string;
  financialImpact: {
    estimatedRevenue: number;
    estimatedProfit: number;
    stockoutCost: number;
  };
  risks: string[];
}

// 兜底：基于规则的简单补货建议
function buildRuleBasedSimulation(params: {
  totalSold: number;
  currentStock: number;
  daysOnSale: number;
  unitCost: number;
  unitPrice: number;
  salesHistory: any[];
}): ReorderSimulation {
  const { totalSold, currentStock, daysOnSale, unitCost, unitPrice, salesHistory } = params;

  const dailySales = daysOnSale > 0 ? totalSold / daysOnSale : 0;
  const daysUntilStockout = dailySales > 0 ? Math.floor(currentStock / dailySales) : 999;

  // 库存还能卖 14 天以内 → 急需翻单
  const shouldReorder = daysUntilStockout < 14 && dailySales > 0;
  const urgentLevel: "low" | "medium" | "high" =
    daysUntilStockout < 5 ? "high" : daysUntilStockout < 10 ? "medium" : "low";

  // 推荐翻单数量 = 30 天预估销量
  const recommendedQuantity = Math.ceil(dailySales * 30);

  const today = new Date();
  const estimatedSellOutDate = new Date(
    today.getTime() + Math.max(daysUntilStockout, 0) * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  // 最佳下单日期：库存能卖 7 天时下单（预留 7 天生产周期）
  const bestReorderDate = new Date(
    today.getTime() + Math.max(daysUntilStockout - 7, 0) * 24 * 60 * 60 * 1000
  )
    .toISOString()
    .slice(0, 10);

  // 找出最畅销的色码组合
  const colorSizeMap = new Map<string, number>();
  (salesHistory || []).forEach((r) => {
    const key = `${r.color}|${r.size}`;
    colorSizeMap.set(key, (colorSizeMap.get(key) || 0) + (Number(r.quantity) || 0));
  });
  const topColorSize = [...colorSizeMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 1)
    .map(([key, qty]) => {
      const [color, size] = key.split("|");
      return { color, size, quantity: Math.ceil(qty * 0.3) };
    })[0] || { color: "黑色", size: "M", quantity: Math.ceil(recommendedQuantity * 0.15) };

  const estimatedRevenue = recommendedQuantity * unitPrice;
  const estimatedProfit = recommendedQuantity * (unitPrice - unitCost);
  const stockoutCost = shouldReorder ? dailySales * 7 * unitPrice : 0;

  return {
    shouldReorder,
    recommendedQuantity,
    urgentLevel,
    bestReorderDate,
    estimatedSellOutDate,
    colorSizePriority: topColorSize,
    reasoning:
      `基于规则引擎：日均销量 ${dailySales.toFixed(1)} 件，当前库存 ${currentStock} 件，` +
      `预计 ${daysUntilStockout} 天后售罄。${shouldReorder ? "需要尽快翻单。" : "暂不需要翻单。"}`,
    financialImpact: {
      estimatedRevenue: Math.round(estimatedRevenue),
      estimatedProfit: Math.round(estimatedProfit),
      stockoutCost: Math.round(stockoutCost),
    },
    risks: shouldReorder
      ? [`若不在 ${bestReorderDate} 前下单，将面临缺货损失约 ¥${Math.round(stockoutCost).toLocaleString()}`]
      : ["库存充足，可继续观察销售趋势"],
  };
}

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { styleId } = await params;
    const supabase = createServerSupabaseClient(request);

    // 1. 拉取款式信息
    const { data: style } = await supabase
      .from("styles")
      .select("id, name, style_no, category, season, target_cost, actual_cost, retail_price, status, brand_id, company_id")
      .eq("id", styleId)
      .maybeSingle();

    if (!style) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    // 2. 拉取最近 60 天销售记录
    const { data: salesHistory } = await supabase
      .from("sales_records")
      .select("quantity, unit_price, total_amount, color, size, sale_date, channel")
      .eq("style_id", styleId)
      .order("sale_date", { ascending: true })
      .limit(500);

    const totalSold = (salesHistory || []).reduce((s, r) => s + (Number(r.quantity) || 0), 0);
    const totalRevenue = (salesHistory || []).reduce(
      (s, r) => s + (Number(r.total_amount) || 0),
      0
    );

    // 3. 计算销售周期天数（首单销售到今天）
    const firstSaleDate = salesHistory && salesHistory.length > 0
      ? new Date(salesHistory[0].sale_date)
      : null;
    const daysOnSale = firstSaleDate
      ? Math.max(1, Math.floor((Date.now() - firstSaleDate.getTime()) / (24 * 60 * 60 * 1000)))
      : 0;

    // 4. 当前库存
    const { data: inventory } = await supabase
      .from("inventory_records")
      .select("quantity")
      .eq("style_id", styleId);
    const currentStock = (inventory || []).reduce(
      (s, r) => s + (Number(r.quantity) || 0),
      0
    );

    // 5. 按色码汇总销量
    const colorSizeSales = new Map<string, number>();
    (salesHistory || []).forEach((r) => {
      const key = `${r.color || "默认"}|${r.size || "默认"}`;
      colorSizeSales.set(key, (colorSizeSales.get(key) || 0) + (Number(r.quantity) || 0));
    });
    const topColorSizeList = [...colorSizeSales.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([key, qty]) => {
        const [color, size] = key.split("|");
        return { color, size, quantity: qty };
      });

    const unitCost = Number(style.actual_cost) || Number(style.target_cost) || 0;
    const unitPrice = Number(style.retail_price) || 0;

    // 没有销售数据 → 直接返回兜底建议
    if (!salesHistory || salesHistory.length === 0 || totalSold === 0) {
      return NextResponse.json({
        shouldReorder: false,
        recommendedQuantity: 0,
        urgentLevel: "low" as const,
        bestReorderDate: new Date().toISOString().slice(0, 10),
        estimatedSellOutDate: "—",
        colorSizePriority: { color: "—", size: "—", quantity: 0 },
        reasoning:
          "该款式暂无销售数据，无法进行翻单模拟。建议先进行小批量测款，待有销售数据后再使用本工具。",
        financialImpact: { estimatedRevenue: 0, estimatedProfit: 0, stockoutCost: 0 },
        risks: ["无销售数据支撑", "建议先小批量测款验证市场反应"],
        basedOn: {
          totalSold: 0,
          totalRevenue: 0,
          currentStock,
          daysOnSale: 0,
          unitCost,
          unitPrice,
        },
      });
    }

    // 6. 构建 AI Prompt
    const colorSizeSalesText = topColorSizeList
      .map((cs) => `${cs.color}/${cs.size}: ${cs.quantity}件`)
      .join("、");

    const prompt = `你是服装品牌的翻单决策专家。基于以下真实销售数据，给出翻单建议。

款式信息：
- 款号：${style.style_no}
- 名称：${style.name}
- 品类：${style.category || "未指定"}
- 季节：${style.season || "未指定"}
- 单件成本：¥${unitCost.toFixed(2)}
- 单件售价：¥${unitPrice.toFixed(2)}
- 当前状态：${style.status}

销售数据：
- 总销量：${totalSold} 件
- 总销售额：¥${totalRevenue.toFixed(2)}
- 销售周期：${daysOnSale} 天
- 日均销量：${(totalSold / daysOnSale).toFixed(1)} 件
- 当前库存：${currentStock} 件
- 畅销色码 TOP5：${colorSizeSalesText}

请严格以 JSON 输出，不要任何其他文字：
{
  "shouldReorder": <是否应该翻单，boolean>,
  "recommendedQuantity": <推荐翻单数量，整数>,
  "urgentLevel": "low | medium | high",
  "bestReorderDate": "<最佳下单日期 YYYY-MM-DD，考虑7天生产周期>",
  "estimatedSellOutDate": "<预计售罄日期 YYYY-MM-DD>",
  "colorSizePriority": {
    "color": "<最畅销颜色>",
    "size": "<最畅销尺码>",
    "quantity": "<该色码翻单数量，整数>"
  },
  "reasoning": "决策依据（结合日均销量、库存、销售周期、利润空间）",
  "financialImpact": {
    "estimatedRevenue": <预计翻单销售额，数字>,
    "estimatedProfit": <预计翻单利润，数字>,
    "stockoutCost": <若不翻单的缺货损失，数字>
  },
  "risks": ["风险1", "风险2"]
}`;

    const raw = await generateText(
      prompt,
      "你是务实的翻单决策专家，避免库存积压，宁可错过不可压货。"
    );

    const parsed = safeJsonParse<ReorderSimulation>(raw);

    // AI 失败时使用规则引擎兜底
    const simulation: ReorderSimulation = parsed
      ? {
          shouldReorder: Boolean(parsed.shouldReorder),
          recommendedQuantity: Number(parsed.recommendedQuantity) || 0,
          urgentLevel: ["low", "medium", "high"].includes(parsed.urgentLevel)
            ? (parsed.urgentLevel as "low" | "medium" | "high")
            : "low",
          bestReorderDate: parsed.bestReorderDate || new Date().toISOString().slice(0, 10),
          estimatedSellOutDate: parsed.estimatedSellOutDate || "—",
          colorSizePriority: parsed.colorSizePriority || { color: "—", size: "—", quantity: 0 },
          reasoning: parsed.reasoning || "AI 未输出决策依据",
          financialImpact: {
            estimatedRevenue: Number(parsed.financialImpact?.estimatedRevenue) || 0,
            estimatedProfit: Number(parsed.financialImpact?.estimatedProfit) || 0,
            stockoutCost: Number(parsed.financialImpact?.stockoutCost) || 0,
          },
          risks: Array.isArray(parsed.risks) ? parsed.risks : [],
        }
      : buildRuleBasedSimulation({
          totalSold,
          currentStock,
          daysOnSale,
          unitCost,
          unitPrice,
          salesHistory: salesHistory || [],
        });

    // 7. 如果建议翻单且数量 > 0，写入 AI 建议表
    if (simulation.shouldReorder && simulation.recommendedQuantity > 0) {
      await createAISuggestion({
        aiRoleLevel: AIRoleLevel.AI_SPECIALIST,
        specialistType: AISpecialistType.STOCKING_AI,
        processNode: "stocking",
        brandId: style.brand_id || undefined,
        type: AISuggestionType.DECISION,
        priority:
          simulation.urgentLevel === "high"
            ? AISuggestionPriority.CRITICAL
            : AISuggestionPriority.HIGH,
        title: `翻单建议：${style.name} 翻单 ${simulation.recommendedQuantity} 件`,
        content:
          `${simulation.reasoning}\n\n` +
          `推荐数量：${simulation.recommendedQuantity} 件\n` +
          `最佳下单日：${simulation.bestReorderDate}\n` +
          `预计售罄日：${simulation.estimatedSellOutDate}\n` +
          `优先色码：${simulation.colorSizePriority.color}/${simulation.colorSizePriority.size} ` +
          `${simulation.colorSizePriority.quantity} 件\n\n` +
          `财务影响：\n` +
          `• 预计销售额：¥${simulation.financialImpact.estimatedRevenue.toLocaleString()}\n` +
          `• 预计利润：¥${simulation.financialImpact.estimatedProfit.toLocaleString()}\n` +
          `• 缺货损失：¥${simulation.financialImpact.stockoutCost.toLocaleString()}\n\n` +
          `风险：\n${simulation.risks.map((r) => "• " + r).join("\n")}`,
        proposedData: {
          styleId,
          shouldReorder: simulation.shouldReorder,
          recommendedQuantity: simulation.recommendedQuantity,
          urgentLevel: simulation.urgentLevel,
          bestReorderDate: simulation.bestReorderDate,
        },
        targetTable: "production_orders",
        targetId: styleId,
        supabase,
      });
    }

    return NextResponse.json({
      ...simulation,
      basedOn: {
        totalSold,
        totalRevenue,
        currentStock,
        daysOnSale,
        unitCost,
        unitPrice,
      },
      topColorSizeSales: topColorSizeList,
    });
  } catch (err) {
    console.error("[reorder-simulation] error:", err);
    return NextResponse.json({ error: "翻单模拟失败" }, { status: 500 });
  }
}
