import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

const WEATHER_DATA = {
  "2026SS": {
    temperature: "15-28°C",
    climate: "温暖湿润",
    seasonalFeatures: ["气温回升", "降雨增多", "紫外线增强"],
    impact: ["轻薄透气面料需求增加", "防晒产品需求", "雨具相关"],
  },
  "2026AW": {
    temperature: "-5-15°C",
    climate: "寒冷干燥",
    seasonalFeatures: ["气温下降", "降雪可能", "空气干燥"],
    impact: ["保暖面料需求增加", "羽绒服热销", "保湿相关"],
  },
  "2027SS": {
    temperature: "16-29°C",
    climate: "温暖湿润",
    seasonalFeatures: ["气温回升", "梅雨季节", "台风影响"],
    impact: ["轻薄透气面料需求增加", "防水面料需求", "防晒产品"],
  },
  "2027AW": {
    temperature: "-4-16°C",
    climate: "寒冷干燥",
    seasonalFeatures: ["气温下降", "寒潮频繁", "雾霾天气"],
    impact: ["保暖面料需求增加", "防风外套热销", "空气净化相关"],
  },
};

const CATEGORY_RATIOS = {
  tops: 35,
  bottoms: 28,
  outerwear: 22,
  dresses: 10,
  accessories: 5,
};

function generateAiResponse(userMessage: string, conversationData: any, brandDna: any): { response: string; nextStep?: string; completed: boolean; saveData?: any } {
  const currentStep = conversationData.currentStep || "start";
  const collectedData = conversationData.collectedData || {};
  
  switch (currentStep) {
    case "start":
      return {
        response: `您好！我是商品企划AI助手。我将基于市场需求洞察和季节特点，为您生成完整的商品企划方案。
        
首先，请告诉我您要开发的是哪个季节的企划？
可选：2026SS、2026AW、2027SS、2027AW`,
        nextStep: "select_season",
        completed: false,
      };
    
    case "select_season":
      if (userMessage.includes("2026") || userMessage.includes("2027")) {
        const season = userMessage.includes("SS") ? (userMessage.includes("2027") ? "2027SS" : "2026SS") : (userMessage.includes("2027") ? "2027AW" : "2026AW");
        collectedData.season = season;
        return {
          response: `好的，${season}季。接下来请输入企划主题名称（如：极简都市系列）：`,
          nextStep: "input_theme",
          completed: false,
        };
      }
      return {
        response: "请选择季节：2026SS、2026AW、2027SS、2027AW",
        nextStep: "select_season",
        completed: false,
      };
    
    case "input_theme":
      collectedData.theme = userMessage;
      return {
        response: `很好！企划主题：${userMessage}
        
我将基于以下数据为您生成商品企划方案：
- 季节：${collectedData.season}
- 主题：${userMessage}
- 品牌基因：${brandDna?.brand_name || "TEPNIX"}
        
正在分析市场需求和天气因素，请稍候...`,
        nextStep: "generate_plan",
        completed: false,
      };
    
    case "generate_plan":
      const productPlan = generateProductPlan(collectedData, brandDna);
      collectedData.productPlan = productPlan;
      
      return {
        response: `📋 商品企划方案已生成

**企划主题：** ${collectedData.theme}
**季节：** ${collectedData.season}

---

## 🌤️ 季节气候分析

**温度范围：** ${productPlan.weather.temperature}
**气候特点：** ${productPlan.weather.climate}
**季节特征：** ${productPlan.weather.seasonalFeatures.join("、")}
**对产品影响：** ${productPlan.weather.impact.join("、")}

---

## 📊 商品结构规划

| 品类 | 占比 | 预估款数 | 价格带 |
|------|------|----------|--------|
${productPlan.productStructure.map((p: any) => `| ${p.category} | ${p.ratio}% | ${p.count}款 | ¥${p.priceMin}-${p.priceMax} |`).join("\n")}

---

## 💰 定价策略

**目标成本：** ¥${productPlan.targetCost}
**建议零售价：** ¥${productPlan.suggestedPrice}
**毛利率：** ${productPlan.grossMargin}%
**价格区间：** ¥${productPlan.priceRange.min} - ¥${productPlan.priceRange.max}

---

## 📅 上市计划

**第一批上市：** ${productPlan.launchSchedule[0]}
**第二批上市：** ${productPlan.launchSchedule[1]}
**第三批上市：** ${productPlan.launchSchedule[2]}

---

## 💡 市场洞察要点

${productPlan.marketInsights.map((i: string) => `- ${i}`).join("\n")}

---

是否确认此商品企划方案？确认后将保存到数据库。`,
        nextStep: "confirm_plan",
        completed: false,
      };
    
    case "confirm_plan":
      if (userMessage.includes("确认") || userMessage.includes("是")) {
        const plan = collectedData.productPlan;
        
        return {
          response: `✅ 商品企划已保存！

您可以继续使用其他Skill进行：
1. 设计企划 - 寻找设计灵感和搭配方案
2. 色彩企划 - 制定色彩方案
3. 面料企划 - 寻找合适的面料

或者直接进入设计企划环节？`,
          completed: true,
          saveData: {
            planning: {
              season: collectedData.season,
              theme: collectedData.theme,
              category: "全品类",
              targetCost: plan.targetCost,
              priceRange: `${plan.priceRange.min}-${plan.priceRange.max}`,
              brandStory: JSON.stringify(plan),
            },
            productPlanning: {
              theme_id: null,
              product_category: "全品类",
              category_ratio: 100,
              price_min: plan.priceRange.min,
              price_max: plan.priceRange.max,
              target_cost: plan.targetCost,
              product_structure: plan.productStructure,
              weather_factor: JSON.stringify(plan.weather),
              market_insights: plan.marketInsights.join("\n"),
            },
          },
        };
      }
      
      return {
        response: "好的，您可以修改企划方案。请问您想调整：\n1. 商品结构占比\n2. 价格策略\n3. 上市时间\n4. 重新生成",
        nextStep: "generate_plan",
        completed: false,
      };
    
    default:
      return {
        response: "感谢您的查询！如需更多商品企划分析，请继续提问。",
        completed: true,
      };
  }
}

function generateProductPlan(collectedData: any, brandDna: any): any {
  const season = collectedData.season;
  const weather = WEATHER_DATA[season as keyof typeof WEATHER_DATA];
  
  const baseCost = brandDna?.price_position === "高端" ? 200 : brandDna?.price_position === "中端" ? 100 : 50;
  const priceMultiplier = brandDna?.price_position === "高端" ? 3 : brandDna?.price_position === "中端" ? 2.5 : 2;
  
  const productStructure = [
    { category: "上衣", ratio: CATEGORY_RATIOS.tops, count: Math.round(20 * CATEGORY_RATIOS.tops / 100), priceMin: Math.round(baseCost * 1.2), priceMax: Math.round(baseCost * 2) },
    { category: "裤装", ratio: CATEGORY_RATIOS.bottoms, count: Math.round(20 * CATEGORY_RATIOS.bottoms / 100), priceMin: Math.round(baseCost * 1.3), priceMax: Math.round(baseCost * 2.2) },
    { category: "外套", ratio: CATEGORY_RATIOS.outerwear, count: Math.round(20 * CATEGORY_RATIOS.outerwear / 100), priceMin: Math.round(baseCost * 2), priceMax: Math.round(baseCost * 4) },
    { category: "裙装", ratio: CATEGORY_RATIOS.dresses, count: Math.round(20 * CATEGORY_RATIOS.dresses / 100), priceMin: Math.round(baseCost * 1.5), priceMax: Math.round(baseCost * 2.5) },
    { category: "配饰", ratio: CATEGORY_RATIOS.accessories, count: Math.round(20 * CATEGORY_RATIOS.accessories / 100), priceMin: Math.round(baseCost * 0.5), priceMax: Math.round(baseCost * 1) },
  ];
  
  const suggestedPrice = Math.round(baseCost * priceMultiplier);
  const grossMargin = Math.round((1 - baseCost / suggestedPrice) * 100);
  
  const launchMonths = season.includes("SS") ? ["3月", "4月", "5月"] : ["9月", "10月", "11月"];
  
  return {
    weather,
    productStructure,
    targetCost: baseCost,
    suggestedPrice,
    grossMargin,
    priceRange: {
      min: Math.round(suggestedPrice * 0.8),
      max: Math.round(suggestedPrice * 1.3),
    },
    launchSchedule: [
      `${launchMonths[0]}上旬 - 核心款上市`,
      `${launchMonths[1]}中旬 - 补充款上市`,
      `${launchMonths[2]}下旬 - 换季款上市`,
    ],
    marketInsights: [
      `关注${weather.seasonalFeatures[0]}带来的市场机会`,
      `${weather.impact[0]}是本季重点`,
      `目标客群${brandDna?.target_audience || "25-35岁都市职场女性"}需求持续增长`,
      `参考竞品定价策略，保持${brandDna?.price_position || "中高端"}定位`,
    ],
  };
}

export async function POST(request: Request) {
  try {
    const { userMessage, conversationId } = await request.json();
    
    let conversation: any = null;
    if (conversationId) {
      const { data } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      conversation = data;
    }
    
    if (!conversation) {
      conversation = {
        id: crypto.randomUUID(),
        skill_type: "product_planning",
        skill_name: "商品企划生成",
        conversation_data: {
          messages: [],
          currentStep: "start",
          collectedData: {},
        },
        is_completed: false,
      };
    }
    
    const { data: brandDnaData } = await supabase
      .from("brand_dna")
      .select("*")
      .limit(1)
      .single();
    
    const aiResponse = generateAiResponse(
      userMessage,
      conversation.conversation_data,
      brandDnaData
    );
    
    if (aiResponse.saveData) {
      if (aiResponse.saveData.planning) {
        await supabase.from("planning").insert(aiResponse.saveData.planning);
      }
      if (aiResponse.saveData.productPlanning) {
        await supabase.from("product_planning").insert(aiResponse.saveData.productPlanning);
      }
    }
    
    const newMessage: Message = {
      id: crypto.randomUUID(),
      content: userMessage,
      sender: "user",
      timestamp: new Date().toISOString(),
    };
    
    const aiMessage: Message = {
      id: crypto.randomUUID(),
      content: aiResponse.response,
      sender: "ai",
      timestamp: new Date().toISOString(),
    };
    
    conversation.conversation_data.messages = [
      ...conversation.conversation_data.messages,
      newMessage,
      aiMessage,
    ];
    conversation.conversation_data.currentStep = aiResponse.nextStep || conversation.conversation_data.currentStep;
    conversation.is_completed = aiResponse.completed;
    conversation.updated_at = new Date().toISOString();
    
    await supabase.from("ai_conversations").upsert(conversation, { onConflict: "id" });
    
    return NextResponse.json({
      conversationId: conversation.id,
      messages: conversation.conversation_data.messages,
      isCompleted: aiResponse.completed,
      collectedData: conversation.conversation_data.collectedData,
    });
  } catch (err) {
    console.error("Product planning chat error:", err);
    return NextResponse.json(
      { error: "商品企划生成对话失败" },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const conversationId = url.searchParams.get("conversationId");
    
    if (conversationId) {
      const { data } = await supabase
        .from("ai_conversations")
        .select("*")
        .eq("id", conversationId)
        .single();
      return NextResponse.json(data?.conversation_data || { messages: [], currentStep: "start", collectedData: {} });
    }
    
    return NextResponse.json({ messages: [], currentStep: "start", collectedData: {} });
  } catch (err) {
    return NextResponse.json({ messages: [], currentStep: "start", collectedData: {} });
  }
}