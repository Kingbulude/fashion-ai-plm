import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { cost, category, brandPosition } = await request.json();

    const baseCost = cost || 100;
    const positionMultiplier = (() => {
      const map: Record<string, number> = {
        "高端": 3.5,
        "中高端": 2.5,
        "中端": 2.0,
        "中低端": 1.5,
      };
      return map[brandPosition || "中高端"] || 2.5;
    })();

    const priceStrategy = {
      suggestedPrice: Math.round(baseCost * positionMultiplier),
      priceRange: {
        min: Math.round(baseCost * positionMultiplier * 0.8),
        max: Math.round(baseCost * positionMultiplier * 1.2),
      },
      recommendedMargin: `${Math.round((positionMultiplier - 1) * 100)}%`,
      competitiveAnalysis: [
        { brand: "竞品A", price: Math.round(baseCost * 2.8), positioning: "略高" },
        { brand: "竞品B", price: Math.round(baseCost * 2.2), positioning: "略低" },
        { brand: "竞品C", price: Math.round(baseCost * 2.5), positioning: "相当" },
      ],
      pricingRecommendations: [
        {
          strategy: "渗透定价",
          price: Math.round(baseCost * positionMultiplier * 0.9),
          rationale: "新品上市吸引客户，快速占领市场",
          risk: "较低利润空间",
        },
        {
          strategy: "撇脂定价",
          price: Math.round(baseCost * positionMultiplier * 1.1),
          rationale: "高品质定位，获取早期利润",
          risk: "竞争压力较大",
        },
        {
          strategy: "跟随定价",
          price: Math.round(baseCost * positionMultiplier),
          rationale: "与市场平均价格一致，降低风险",
          risk: "缺乏价格优势",
        },
      ],
    };

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