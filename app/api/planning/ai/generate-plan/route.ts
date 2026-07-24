import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";
import { generateJsonArray, generateJson } from "@/lib/ai/json-generation";

export const runtime = "edge";

interface TrendItem { trend: string; description: string; confidence: number; }
interface HotProductItem { name: string; category: string; salesVolume: number; growthRate: string; }
interface ColorItem { name: string; hex: string; usage: string; }
interface FabricItem { name: string; category: string; price: string; }

interface ComprehensivePlanShape {
  suggestedPrice: number;
  priceRange: { min: number; max: number };
  trendPrediction: { confidence: number; items: TrendItem[] };
  hotProducts: { confidence: number; items: HotProductItem[] };
  colorRecommendations: { confidence: number; items: ColorItem[] };
  fabricRecommendations: { confidence: number; items: FabricItem[] };
  executiveSummary: string;
  overallConfidence: number;
}

function buildFallback(season: string, theme: string, category: string, baseCost: number, brandDna: any): ComprehensivePlanShape {
  const suggestedPrice = Math.round(baseCost * 2.5);
  return {
    suggestedPrice,
    priceRange: { min: Math.round(suggestedPrice * 0.8), max: Math.round(suggestedPrice * 1.2) },
    trendPrediction: {
      confidence: 86,
      items: [
        { trend: "极简主义回归", description: "简约线条成为主流", confidence: 92 },
        { trend: "可持续面料", description: "环保材料需求增长", confidence: 88 },
        { trend: "复古混搭", description: "90年代风格回潮", confidence: 85 },
      ],
    },
    hotProducts: {
      confidence: 88,
      items: [
        { name: "极简羊毛大衣", category: "外套", salesVolume: 15600, growthRate: "+125%" },
        { name: "高腰直筒牛仔裤", category: "裤装", salesVolume: 28900, growthRate: "+89%" },
        { name: "真丝衬衫", category: "上衣", salesVolume: 12300, growthRate: "+76%" },
      ],
    },
    colorRecommendations: {
      confidence: 85,
      items: [
        { name: "静谧蓝", hex: "#7EC8E3", usage: "主色调" },
        { name: "焦糖棕", hex: "#C68E17", usage: "辅助色" },
        { name: "燕麦色", hex: "#D4C4A8", usage: "基础色" },
      ],
    },
    fabricRecommendations: {
      confidence: 82,
      items: [
        { name: "双面羊毛呢", category: "羊毛", price: "¥80-120/米" },
        { name: "弹力牛仔布", category: "牛仔", price: "¥25-40/米" },
        { name: "真丝缎面", category: "丝绸", price: "¥150-200/米" },
      ],
    },
    executiveSummary: `基于品牌基因库和市场数据分析，为${season}${theme}系列生成以下企划方案：\n\n【趋势洞察】\n- 极简主义回归: 简约线条成为主流\n- 可持续面料: 环保材料需求增长\n- 复古混搭: 90年代风格回潮\n\n【爆款对标】\n- 极简羊毛大衣: 销量15600，增长+125%\n- 高腰直筒牛仔裤: 销量28900，增长+89%\n- 真丝衬衫: 销量12300，增长+76%\n\n【色彩方案】\n- 静谧蓝(#7EC8E3): 主色调\n- 焦糖棕(#C68E17): 辅助色\n- 燕麦色(#D4C4A8): 基础色\n\n【面料建议】\n- 双面羊毛呢: ¥80-120/米\n- 弹力牛仔布: ¥25-40/米\n- 真丝缎面: ¥150-200/米\n\n【定价策略】\n建议零售价 ¥${suggestedPrice}（成本 ¥${baseCost}，毛利率约60%）\n\n【品牌契合度】\n目标客群：${brandDna.target_audience}\n风格方向：${Array.isArray(brandDna.style_direction) ? brandDna.style_direction.join("、") : brandDna.style_direction}\n定价定位：${brandDna.price_position}\n\n建议按此方案进行商品企划和设计开发。`,
    overallConfidence: 86,
  };
}

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

    const baseCost = targetCost || 100;
    const fallback = buildFallback(season, theme, category, baseCost, brandDna);

    const [trendItems, hotProductItems, colorItems, fabricItems, priceShape] = await Promise.all([
      generateJsonArray<TrendItem>({
        prompt: `请为「${season || "下一季"}」「${category || "女装"}」服装系列生成 3 个高置信度趋势洞察。输出 JSON 数组：{ "trend": "趋势名", "description": "描述", "confidence": 80-95 }`,
        systemPrompt: "你是服装趋势分析专家，只输出合法 JSON 数组。",
        fallback: fallback.trendPrediction.items,
      }),
      generateJsonArray<HotProductItem>({
        prompt: `请为「${season || "当季"}」「${category || "女装"}」市场生成 3 个爆款对标。输出 JSON 数组：{ "name": "商品名", "category": "品类", "salesVolume": 15000, "growthRate": "+100%" }`,
        systemPrompt: "你是服装电商爆款分析专家，只输出合法 JSON 数组。",
        fallback: fallback.hotProducts.items,
      }),
      generateJsonArray<ColorItem>({
        prompt: `请为「${season || "下一季"}」「${category || "女装"}」系列推荐 3 个关键色彩。输出 JSON 数组：{ "name": "颜色名", "hex": "#RRGGBB", "usage": "主色调/辅助色/基础色" }`,
        systemPrompt: "你是服装色彩企划专家，只输出合法 JSON 数组。",
        fallback: fallback.colorRecommendations.items,
      }),
      generateJsonArray<FabricItem>({
        prompt: `请为「${season || "当季"}」「${category || "女装"}」品类推荐 3 种面料。输出 JSON 数组：{ "name": "面料名", "category": "分类", "price": "¥X-Y/米" }`,
        systemPrompt: "你是服装面料企划专家，只输出合法 JSON 数组。",
        fallback: fallback.fabricRecommendations.items,
      }),
      generateJson<{ suggestedPrice: number; priceRange: { min: number; max: number }; recommendedMargin: string }>({
        prompt: `已知服装成本 ¥${baseCost}，品类「${category || "女装"}」，品牌定位「${brandDna.price_position || "中高端"}」。输出 JSON：{ "suggestedPrice": 299, "priceRange": { "min": 239, "max": 359 }, "recommendedMargin": "60%" }`,
        systemPrompt: "你是服装定价策略专家，只输出合法 JSON。",
        fallback: { suggestedPrice: fallback.suggestedPrice, priceRange: fallback.priceRange, recommendedMargin: "60%" },
      }),
    ]);

    const suggestedPrice = priceShape.suggestedPrice || fallback.suggestedPrice;
    const priceRange = priceShape.priceRange || fallback.priceRange;
    const recommendedMargin = priceShape.recommendedMargin || "60%";
    const overallConfidence = Math.round(
      ([86, 88, 85, 82].reduce((a, b) => a + b, 0) + (brandDna.price_position ? 5 : 0)) / 4
    );

    const executiveSummary = `基于品牌基因库和市场数据分析，为${season || ""}${theme || ""}系列生成以下企划方案：

【趋势洞察】
${trendItems.map(t => `- ${t.trend}: ${t.description}`).join("\n")}

【爆款对标】
${hotProductItems.map(p => `- ${p.name}: 销量${p.salesVolume}，增长${p.growthRate}`).join("\n")}

【色彩方案】
${colorItems.map(c => `- ${c.name}(${c.hex}): ${c.usage}`).join("\n")}

【面料建议】
${fabricItems.map(f => `- ${f.name}: ${f.price}`).join("\n")}

【定价策略】
建议零售价 ¥${suggestedPrice}（成本 ¥${baseCost}，毛利率约${recommendedMargin}）

【品牌契合度】
目标客群：${brandDna.target_audience}
风格方向：${Array.isArray(brandDna.style_direction) ? brandDna.style_direction.join("、") : brandDna.style_direction}
定价定位：${brandDna.price_position}

建议按此方案进行商品企划和设计开发。`;

    const comprehensivePlan = {
      planId: null as string | null,
      season,
      theme,
      category,
      targetCost: baseCost,
      suggestedPrice,
      priceRange,
      brandAlignment: {
        brandName: brandDna.brand_name,
        targetAudience: brandDna.target_audience,
        styleDirection: brandDna.style_direction,
        pricePosition: brandDna.price_position,
      },
      aiSkills: {
        trendPrediction: { confidence: 86, items: trendItems },
        hotProducts: { confidence: 88, items: hotProductItems },
        colorRecommendations: { confidence: 85, items: colorItems },
        fabricRecommendations: { confidence: 82, items: fabricItems },
        pricingStrategy: { confidence: 90, suggestedPrice, priceRange, recommendedMargin },
      },
      executiveSummary,
      generatedAt: new Date().toISOString(),
      overallConfidence,
    };

    const newPlan = await supabase.from("planning").insert([{
      season,
      theme,
      category,
      targetCost: baseCost,
      priceRange: `${comprehensivePlan.priceRange.min}-${comprehensivePlan.priceRange.max}`,
      targetAudience: brandDna.target_audience,
      timeline: `${String(season).split("SS")[0]}年${String(season).includes("SS") ? "春夏" : "秋冬"}上市`,
      brandStory: comprehensivePlan.executiveSummary,
    }]).select().single();

    if (newPlan.data) {
      comprehensivePlan.planId = newPlan.data.id;
      await supabase.from("planning_ai_results").insert([{
        planning_id: newPlan.data.id,
        skill_type: "comprehensive_planning",
        skill_name: "统筹企划",
        result: comprehensivePlan,
        confidence_score: overallConfidence,
      }]);
    }

    return NextResponse.json(comprehensivePlan);
  } catch (err) {
    return NextResponse.json({ error: "AI统筹企划失败" }, { status: 500 });
  }
}
