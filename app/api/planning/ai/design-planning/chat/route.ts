import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

const DESIGN_INSPIRATIONS = {
  "极简都市": {
    keywords: ["minimalist", "urban", "clean", "modern"],
    styleFeatures: ["简洁线条", "中性色调", "利落剪裁", "高品质面料"],
    colorPalette: ["#1a1a2e", "#16213e", "#ffffff", "#b8b8b8"],
    silhouette: ["H型", "直筒", "宽松", "Oversize"],
    details: ["隐形拉链", "极简纽扣", "无装饰", "流畅接缝"],
    lookbook: [
      "上身：白色纯棉衬衫 + 下身：黑色直筒裤 + 配饰：金属手表",
      "上身：灰色羊绒毛衣 + 下身：米色阔腿裤 + 配饰：皮革手袋",
      "上身：黑色西装外套 + 内搭：白色T恤 + 下身：深色牛仔裤",
    ],
  },
  "复古浪漫": {
    keywords: ["vintage", "romantic", "feminine", "nostalgic"],
    styleFeatures: ["花卉印花", "柔和色调", "荷叶边", "蕾丝"],
    colorPalette: ["#e8a87c", "#c38d9e", "#f5f5dc", "#85dcb8"],
    silhouette: ["X型", "收腰", "A字", "鱼尾"],
    details: ["荷叶边装饰", "刺绣", "蝴蝶结", "褶皱"],
    lookbook: [
      "上身：碎花雪纺衬衫 + 下身：高腰半身裙 + 配饰：珍珠项链",
      "连衣裙：复古印花长裙 + 配饰：草编包",
      "上身：蕾丝上衣 + 下身：阔腿裤 + 配饰：丝巾",
    ],
  },
  "运动休闲": {
    keywords: ["athleisure", "sporty", "casual", "comfortable"],
    styleFeatures: ["功能性面料", "运动元素", "舒适版型", "街头感"],
    colorPalette: ["#2d3436", "#636e72", "#ffeaa7", "#74b9ff"],
    silhouette: ["宽松", "束脚", "连帽", "拼接"],
    details: ["拉链口袋", "反光条", "品牌logo", "抽绳"],
    lookbook: [
      "上身：连帽卫衣 + 下身：运动裤 + 配饰：棒球帽",
      "上身：运动外套 + 内搭：紧身T恤 + 下身：瑜伽裤",
      "上身：拼接卫衣 + 下身：工装裤 + 配饰：运动鞋",
    ],
  },
  "新中式": {
    keywords: ["chinese", "traditional", "modern", "elegant"],
    styleFeatures: ["传统纹样", "盘扣", "立领", "水墨色调"],
    colorPalette: ["#2c3e50", "#7f8c8d", "#dfe6e9", "#e74c3c"],
    silhouette: ["立领", "对襟", "改良旗袍", "中式廓形"],
    details: ["盘扣", "刺绣纹样", "水墨画印花", "流苏"],
    lookbook: [
      "改良旗袍：水墨画印花 + 配饰：玉镯",
      "上身：中式立领衬衫 + 下身：阔腿裤 + 配饰：折扇",
      "套装：对襟外套 + 直筒裙 + 配饰：刺绣手袋",
    ],
  },
  "奢华精致": {
    keywords: ["luxury", "elegant", "sophisticated", "high-end"],
    styleFeatures: ["光泽面料", "精致剪裁", "珠宝装饰", "高级质感"],
    colorPalette: ["#1a1a1a", "#d4af37", "#ffffff", "#8b0000"],
    silhouette: ["修身", "鱼尾", "茧型", "沙漏"],
    details: ["珍珠装饰", "水晶纽扣", "丝缎面料", "手工刺绣"],
    lookbook: [
      "连衣裙：丝缎长裙 + 配饰：钻石耳环",
      "套装：西装外套 + 铅笔裙 + 配饰：皮革手套",
      "上身：丝质衬衫 + 下身：高腰裙 + 配饰：手拿包",
    ],
  },
};

const MATERIAL_SUGGESTIONS = {
  "极简都市": ["纯棉", "羊毛", "羊绒", "真丝", "醋酸纤维"],
  "复古浪漫": ["雪纺", "蕾丝", "棉麻", "印花真丝", "网纱"],
  "运动休闲": ["纯棉", "聚酯纤维", "氨纶", "摇粒绒", "防风面料"],
  "新中式": ["真丝", "棉麻", "云锦", "亚麻", "桑蚕丝"],
  "奢华精致": ["真丝", "羊绒", "绸缎", "天鹅绒", "皮革"],
};

function generateAiResponse(userMessage: string, conversationData: any, brandDna: any): { response: string; nextStep?: string; completed: boolean; saveData?: any } {
  const currentStep = conversationData.currentStep || "start";
  const collectedData = conversationData.collectedData || {};

  switch (currentStep) {
    case "start":
      return {
        response: `您好！我是设计企划AI助手。我将基于商品企划，帮助您寻找设计灵感和搭配方案。

首先，请告诉我您的企划主题是什么？（如：极简都市、复古浪漫、运动休闲等）`,
        nextStep: "input_theme",
        completed: false,
      };

    case "input_theme":
      collectedData.theme = userMessage;
      
      const matchedTheme = Object.keys(DESIGN_INSPIRATIONS).find(key => 
        userMessage.includes(key) || DESIGN_INSPIRATIONS[key as keyof typeof DESIGN_INSPIRATIONS].keywords.some(k => 
          userMessage.toLowerCase().includes(k.toLowerCase())
        )
      );

      if (matchedTheme) {
        collectedData.matchedTheme = matchedTheme;
        return {
          response: `很好！企划主题：${userMessage}

我已匹配到相似的设计风格：**${matchedTheme}**

接下来，请选择您想了解的设计方向：
1. 设计灵感关键词
2. 色彩方案建议
3. 廓形与剪裁建议
4. 搭配Look方案
5. 获取完整设计企划`,
          nextStep: "select_design",
          completed: false,
        };
      }

      collectedData.matchedTheme = "极简都市";
      return {
        response: `好的，企划主题：${userMessage}

我将为您创建定制化的设计企划方案。请选择您想了解的设计方向：
1. 设计灵感关键词
2. 色彩方案建议
3. 廓形与剪裁建议
4. 搭配Look方案
5. 获取完整设计企划`,
        nextStep: "select_design",
        completed: false,
      };

    case "select_design":
      const themeData = DESIGN_INSPIRATIONS[collectedData.matchedTheme as keyof typeof DESIGN_INSPIRATIONS] || DESIGN_INSPIRATIONS["极简都市"];

      if (userMessage.includes("1") || userMessage.includes("关键词") || userMessage.includes("灵感")) {
        return {
          response: `🎨 设计灵感关键词

基于主题「${collectedData.matchedTheme}」，推荐以下设计灵感关键词：

**英文关键词（用于图片搜索）：**
${themeData.keywords.map((k: string) => `- ${k}`).join("\n")}

**风格特征：**
${themeData.styleFeatures.map((f: string) => `- ${f}`).join("\n")}

**面料建议：**
${(MATERIAL_SUGGESTIONS[collectedData.matchedTheme as keyof typeof MATERIAL_SUGGESTIONS] || MATERIAL_SUGGESTIONS["极简都市"]).map((m: string) => `- ${m}`).join("\n")}

您还想了解其他设计方向吗？`,
          nextStep: "select_design",
          completed: false,
        };
      }

      if (userMessage.includes("2") || userMessage.includes("色彩") || userMessage.includes("配色")) {
        return {
          response: `🎨 色彩方案建议

基于主题「${collectedData.matchedTheme}」，推荐以下色彩方案：

**主色调：**
${themeData.colorPalette.slice(0, 2).map((c: string) => `- ${c}（${getColorName(c)}）`).join("\n")}

**辅助色：**
${themeData.colorPalette.slice(2).map((c: string) => `- ${c}（${getColorName(c)}）`).join("\n")}

**配色原则：**
- 主色占比：60%
- 辅助色占比：30%
- 点缀色占比：10%

**品牌色彩契合：** ${brandDna?.color_palette?.slice(0, 2).join("、") || "建议结合品牌基因调整"}

您还想了解其他设计方向吗？`,
          nextStep: "select_design",
          completed: false,
        };
      }

      if (userMessage.includes("3") || userMessage.includes("廓形") || userMessage.includes("剪裁")) {
        return {
          response: `🎨 廓形与剪裁建议

基于主题「${collectedData.matchedTheme}」，推荐以下廓形与剪裁方向：

**推荐廓形：**
${themeData.silhouette.map((s: string) => `- ${s}`).join("\n")}

**剪裁要点：**
${themeData.details.map((d: string) => `- ${d}`).join("\n")}

**版型建议：**
- 上身：${collectedData.matchedTheme === "运动休闲" ? "宽松舒适" : "合身剪裁"}
- 下身：${collectedData.matchedTheme === "极简都市" ? "直筒修身" : "多样版型"}
- 外套：${collectedData.matchedTheme === "奢华精致" ? "收腰合身" : "大气廓形"}

您还想了解其他设计方向吗？`,
          nextStep: "select_design",
          completed: false,
        };
      }

      if (userMessage.includes("4") || userMessage.includes("搭配") || userMessage.includes("Look")) {
        return {
          response: `🎨 搭配Look方案

基于主题「${collectedData.matchedTheme}」，推荐以下搭配方案：

${themeData.lookbook.map((look: string, i: number) => `${i + 1}. ${look}`).join("\n\n")}

**搭配原则：**
- 同色系搭配：保持整体风格统一
- 材质对比：创造层次感
- 配饰点睛：提升精致度

您还想了解其他设计方向吗？`,
          nextStep: "select_design",
          completed: false,
        };
      }

      if (userMessage.includes("5") || userMessage.includes("完整") || userMessage.includes("全部")) {
        const fullPlan = generateFullDesignPlan(collectedData, themeData, brandDna);
        collectedData.designPlan = fullPlan;
        
        return {
          response: `📋 完整设计企划方案

**企划主题：** ${collectedData.theme}
**风格方向：** ${collectedData.matchedTheme}

---

## 🎨 设计灵感

**关键词：** ${themeData.keywords.join("、")}
**风格特征：** ${themeData.styleFeatures.join("、")}

---

## 🎯 色彩方案

**主色调：** ${themeData.colorPalette.slice(0, 2).join("、")}
**辅助色：** ${themeData.colorPalette.slice(2).join("、")}
**品牌色彩契合：** ${brandDna?.color_palette?.slice(0, 3).join("、") || "建议结合品牌基因"}

---

## 👗 廓形与剪裁

**推荐廓形：** ${themeData.silhouette.join("、")}
**剪裁要点：** ${themeData.details.join("、")}

---

## 👔 搭配Look方案

${themeData.lookbook.map((look: string, i: number) => `${i + 1}. ${look}`).join("\n")}

---

## 🧵 面料建议

${(MATERIAL_SUGGESTIONS[collectedData.matchedTheme as keyof typeof MATERIAL_SUGGESTIONS] || MATERIAL_SUGGESTIONS["极简都市"]).join("、")}

---

是否确认此设计企划方案？确认后将保存到数据库。`,
          nextStep: "confirm_plan",
          completed: false,
        };
      }

      return {
        response: `请选择您想了解的设计方向：
1. 设计灵感关键词
2. 色彩方案建议
3. 廓形与剪裁建议
4. 搭配Look方案
5. 获取完整设计企划`,
        nextStep: "select_design",
        completed: false,
      };

    case "confirm_plan":
      if (userMessage.includes("确认") || userMessage.includes("是")) {
        const designPlan = collectedData.designPlan;
        
        return {
          response: `✅ 设计企划已保存！

您可以继续使用其他Skill进行：
1. 色彩企划 - 制定详细的色彩方案
2. 面料企划 - 寻找合适的面料供应商

或者直接进入色彩企划环节？`,
          completed: true,
          saveData: {
            designPlanning: {
              theme_name: collectedData.theme,
              style_direction: collectedData.matchedTheme,
              color_palette: DESIGN_INSPIRATIONS[collectedData.matchedTheme as keyof typeof DESIGN_INSPIRATIONS]?.colorPalette || [],
              silhouette: DESIGN_INSPIRATIONS[collectedData.matchedTheme as keyof typeof DESIGN_INSPIRATIONS]?.silhouette || [],
              details: DESIGN_INSPIRATIONS[collectedData.matchedTheme as keyof typeof DESIGN_INSPIRATIONS]?.details || [],
              lookbook: DESIGN_INSPIRATIONS[collectedData.matchedTheme as keyof typeof DESIGN_INSPIRATIONS]?.lookbook || [],
              material_suggestions: MATERIAL_SUGGESTIONS[collectedData.matchedTheme as keyof typeof MATERIAL_SUGGESTIONS] || [],
              brand_id: null,
            },
          },
        };
      }

      return {
        response: "好的，您可以修改设计企划方案。请问您想调整：\n1. 色彩方案\n2. 廓形剪裁\n3. 搭配方案\n4. 重新生成",
        nextStep: "select_design",
        completed: false,
      };

    default:
      return {
        response: "感谢您的查询！如需更多设计企划分析，请继续提问。",
        completed: true,
      };
  }
}

function getColorName(hex: string): string {
  const colors: Record<string, string> = {
    "#1a1a2e": "深蓝黑",
    "#16213e": "深海蓝",
    "#ffffff": "纯白",
    "#b8b8b8": "浅灰",
    "#e8a87c": "珊瑚色",
    "#c38d9e": "玫瑰紫",
    "#f5f5dc": "米色",
    "#85dcb8": "薄荷绿",
    "#2d3436": "炭黑",
    "#636e72": "深灰",
    "#ffeaa7": "柠檬黄",
    "#74b9ff": "天空蓝",
    "#2c3e50": "墨蓝",
    "#7f8c8d": "石板灰",
    "#dfe6e9": "珍珠白",
    "#e74c3c": "中国红",
    "#1a1a1a": "纯黑",
    "#d4af37": "金色",
    "#8b0000": "深红",
  };
  return colors[hex] || "自定义色";
}

function generateFullDesignPlan(collectedData: any, themeData: any, brandDna: any): any {
  return {
    theme: collectedData.theme,
    styleDirection: collectedData.matchedTheme,
    colorPalette: themeData.colorPalette,
    silhouette: themeData.silhouette,
    details: themeData.details,
    lookbook: themeData.lookbook,
    materials: MATERIAL_SUGGESTIONS[collectedData.matchedTheme as keyof typeof MATERIAL_SUGGESTIONS] || MATERIAL_SUGGESTIONS["极简都市"],
    targetAudience: brandDna?.target_audience || "25-35岁都市职场女性",
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
        skill_type: "design_planning",
        skill_name: "设计企划",
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
      if (aiResponse.saveData.designPlanning) {
        await supabase.from("design_planning").insert(aiResponse.saveData.designPlanning);
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
    console.error("Design planning chat error:", err);
    return NextResponse.json(
      { error: "设计企划对话失败" },
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