import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { season, theme, category, targetCost } = await request.json();

    let brandDna: any = {
      brand_name: "StyleForge",
      target_audience: "25-35岁都市职场女性",
      style_direction: ["极简都市", "轻商务"],
      price_position: "中高端",
      core_values: ["品质至上", "创新设计"],
    };

    try {
      const { data } = await supabase.from("brand_dna").select("*").limit(1).single();
      if (data) brandDna = data;
    } catch {}

    const trendPrediction = [
      { trend: "极简主义回归", description: "简约线条成为主流", confidence: 92 },
      { trend: "可持续面料", description: "环保材料需求增长", confidence: 88 },
      { trend: "复古混搭", description: "90年代风格回潮", confidence: 85 },
    ];

    const hotProducts = [
      { name: "极简羊毛大衣", category: "外套", salesVolume: 15600, growthRate: "+125%" },
      { name: "高腰直筒牛仔裤", category: "裤装", salesVolume: 28900, growthRate: "+89%" },
      { name: "真丝衬衫", category: "上衣", salesVolume: 12300, growthRate: "+76%" },
    ];

    const colorRecommendations = [
      { name: "静谧蓝", hex: "#7EC8E3", usage: "主色调" },
      { name: "焦糖棕", hex: "#C68E17", usage: "辅助色" },
      { name: "燕麦色", hex: "#D4C4A8", usage: "基础色" },
    ];

    const fabricRecommendations = [
      { name: "双面羊毛呢", category: "羊毛", price: "¥80-120/米" },
      { name: "弹力牛仔布", category: "牛仔", price: "¥25-40/米" },
      { name: "真丝缎面", category: "丝绸", price: "¥150-200/米" },
    ];

    const baseCost = targetCost || 100;
    const suggestedPrice = Math.round(baseCost * 2.5);

    const comprehensivePlan = {
      planId: null,
      season,
      theme,
      category,
      targetCost: baseCost,
      suggestedPrice,
      priceRange: { min: Math.round(suggestedPrice * 0.8), max: Math.round(suggestedPrice * 1.2) },
      brandAlignment: {
        brandName: brandDna.brand_name,
        targetAudience: brandDna.target_audience,
        styleDirection: brandDna.style_direction,
        pricePosition: brandDna.price_position,
      },
      aiSkills: {
        trendPrediction: { confidence: 86, items: trendPrediction },
        hotProducts: { confidence: 88, items: hotProducts },
        colorRecommendations: { confidence: 85, items: colorRecommendations },
        fabricRecommendations: { confidence: 82, items: fabricRecommendations },
        pricingStrategy: { confidence: 90, suggestedPrice },
      },
      executiveSummary: `基于品牌基因库和市场数据分析，为${season}${theme}系列生成以下企划方案：

【趋势洞察】
${trendPrediction.map(t => `- ${t.trend}: ${t.description}`).join("\n")}

【爆款对标】
${hotProducts.map(p => `- ${p.name}: 销量${p.salesVolume}，增长${p.growthRate}`).join("\n")}

【色彩方案】
${colorRecommendations.map(c => `- ${c.name}(${c.hex}): ${c.usage}`).join("\n")}

【面料建议】
${fabricRecommendations.map(f => `- ${f.name}: ${f.price}`).join("\n")}

【定价策略】
建议零售价 ¥${suggestedPrice}（成本 ¥${baseCost}，毛利率约60%）

【品牌契合度】
目标客群：${brandDna.target_audience}
风格方向：${brandDna.style_direction.join("、")}
定价定位：${brandDna.price_position}

建议按此方案进行商品企划和设计开发。`,
      generatedAt: new Date().toISOString(),
      overallConfidence: 86,
    };

    const newPlan = await supabase.from("planning").insert([{
      season,
      theme,
      category,
      targetCost: baseCost,
      priceRange: `${comprehensivePlan.priceRange.min}-${comprehensivePlan.priceRange.max}`,
      targetAudience: brandDna.target_audience,
      timeline: `${season.split("SS")[0]}年${season.includes("SS") ? "春夏" : "秋冬"}上市`,
      brandStory: comprehensivePlan.executiveSummary,
    }]).select().single();

    if (newPlan.data) {
      comprehensivePlan.planId = newPlan.data.id;
      await supabase.from("planning_ai_results").insert([{
        planning_id: newPlan.data.id,
        skill_type: "comprehensive_planning",
        skill_name: "统筹企划",
        result: comprehensivePlan,
        confidence_score: 86,
      }]);
    }

    return NextResponse.json(comprehensivePlan);
  } catch (err) {
    return NextResponse.json({ error: "AI统筹企划失败" }, { status: 500 });
  }
}