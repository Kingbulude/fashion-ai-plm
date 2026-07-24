import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";
import { generateJson } from "@/lib/ai/json-generation";

export const runtime = "edge";

interface PricingStrategy {
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  recommendedMargin: string;
  competitiveAnalysis: { brand: string; price: number; positioning: string }[];
  pricingRecommendations: { strategy: string; price: number; rationale: string; risk: string }[];
}

function buildFallback(cost: number, positionMultiplier: number): PricingStrategy {
  const suggestedPrice = Math.round(cost * positionMultiplier);
  return {
    suggestedPrice,
    priceRange: {
      min: Math.round(cost * positionMultiplier * 0.8),
      max: Math.round(cost * positionMultiplier * 1.2),
    },
    recommendedMargin: `${Math.round((positionMultiplier - 1) * 100)}%`,
    competitiveAnalysis: [
      { brand: "竞品A", price: Math.round(cost * 2.8), positioning: "略高" },
      { brand: "竞品B", price: Math.round(cost * 2.2), positioning: "略低" },
      { brand: "竞品C", price: Math.round(cost * 2.5), positioning: "相当" },
    ],
    pricingRecommendations: [
      { strategy: "渗透定价", price: Math.round(cost * positionMultiplier * 0.9), rationale: "新品上市吸引客户，快速占领市场", risk: "较低利润空间" },
      { strategy: "撇脂定价", price: Math.round(cost * positionMultiplier * 1.1), rationale: "高品质定位，获取早期利润", risk: "竞争压力较大" },
      { strategy: "跟随定价", price: Math.round(cost * positionMultiplier), rationale: "与市场平均价格一致，降低风险", risk: "缺乏价格优势" },
    ],
  };
}

export async function POST(request: Request) {
  try {
    const { cost, category, brandPosition } = await request.json();

    const baseCost = cost || 100;
    const positionMultiplier = (() => {
      const map: Record<string, number> = { "高端": 3.5, "中高端": 2.5, "中端": 2.0, "中低端": 1.5 };
      return map[brandPosition || "中高端"] || 2.5;
    })();

    const fallback = buildFallback(baseCost, positionMultiplier);

    const priceStrategy = await generateJson<PricingStrategy>({
      prompt: `你是一位服装品牌定价策略顾问。已知：
- 成本：¥${baseCost}
- 品类：${category || "女装"}
- 品牌定位：${brandPosition || "中高端"}

请生成一份定价策略报告。

输出格式要求为 JSON 对象：
{
  "suggestedPrice": 299,
  "priceRange": { "min": 239, "max": 359 },
  "recommendedMargin": "60%",
  "competitiveAnalysis": [
    { "brand": "竞品A", "price": 329, "positioning": "略高" }
  ],
  "pricingRecommendations": [
    { "strategy": "渗透定价", "price": 269, "rationale": "理由", "risk": "风险" }
  ]
}`,
      systemPrompt: "你是服装品牌定价策略专家，熟悉成本加成、竞品对标和不同品牌定位的价格带。只输出合法 JSON。",
      fallback,
      onError: (err) => console.warn("定价策略 AI 生成失败，使用 fallback:", err),
    });

    await supabase.from("planning_ai_results").insert([{
      planning_id: null,
      skill_type: "pricing_strategy",
      skill_name: "定价策略",
      result: { priceStrategy, cost, category, brandPosition },
      confidence_score: 90,
    }]);

    return NextResponse.json(priceStrategy);
  } catch (err) {
    return NextResponse.json({ error: "定价策略分析失败" }, { status: 500 });
  }
}
