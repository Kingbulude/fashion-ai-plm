import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

const SEASON_COLORS = {
  "SS": {
    name: "春夏",
    temperature: "暖",
    dominantColors: ["#ffecd2", "#fcb69f", "#ff9ff3", "#54a0ff", "#5f27cd"],
    trendColors: ["薄荷绿", "珊瑚橙", "薰衣草紫", "天空蓝", "裸粉色"],
    mood: "清新、活力、轻盈",
    contrast: "高对比",
  },
  "AW": {
    name: "秋冬",
    temperature: "冷",
    dominantColors: ["#2d3436", "#636e72", "#b2bec3", "#dfe6e9", "#fdcb6e"],
    trendColors: ["焦糖棕", "墨绿", "酒红", "燕麦色", "金属银"],
    mood: "温暖、沉稳、优雅",
    contrast: "低对比",
  },
};

const COLOR_THEORIES = {
  complementary: {
    name: "互补色搭配",
    description: "色轮上对立的颜色组合，形成强烈对比",
    example: "红色 ↔ 绿色，蓝色 ↔ 橙色",
    effect: "视觉冲击力强，适合点缀",
  },
  analogous: {
    name: "邻近色搭配",
    description: "色轮上相邻的颜色组合，和谐统一",
    example: "红色 → 橙色 → 黄色",
    effect: "柔和舒适，适合大面积使用",
  },
  triadic: {
    name: "三角配色",
    description: "色轮上呈三角形分布的三个颜色",
    example: "红色 ↔ 黄色 ↔ 蓝色",
    effect: "活泼有活力，视觉平衡",
  },
  monochromatic: {
    name: "单色搭配",
    description: "同一颜色的不同深浅变化",
    example: "浅灰 → 中灰 → 深灰",
    effect: "简洁高级，层次分明",
  },
};

const COLOR_PALETTES = {
  "极简都市": {
    primary: ["#1a1a2e", "#16213e"],
    secondary: ["#ffffff", "#b8b8b8", "#e0e0e0"],
    accent: ["#4a90d9", "#6c5ce7"],
    mood: "专业、冷静、现代",
  },
  "复古浪漫": {
    primary: ["#e8a87c", "#c38d9e"],
    secondary: ["#f5f5dc", "#85dcb8", "#ffeaa7"],
    accent: ["#fd79a8", "#74b9ff"],
    mood: "温柔、浪漫、怀旧",
  },
  "运动休闲": {
    primary: ["#2d3436", "#636e72"],
    secondary: ["#ffeaa7", "#74b9ff", "#fab1a0"],
    accent: ["#00b894", "#e17055"],
    mood: "活力、动感、年轻",
  },
  "新中式": {
    primary: ["#2c3e50", "#7f8c8d"],
    secondary: ["#dfe6e9", "#e74c3c", "#f1c40f"],
    accent: ["#9b59b6", "#3498db"],
    mood: "典雅、含蓄、东方",
  },
  "奢华精致": {
    primary: ["#1a1a1a", "#2c2c2c"],
    secondary: ["#d4af37", "#ffffff", "#8b0000"],
    accent: ["#e6b800", "#ffd700"],
    mood: "高贵、典雅、精致",
  },
};

const COLOR_MEANINGS: Record<string, string> = {
  "#1a1a2e": "深蓝黑 - 专业、稳重、神秘",
  "#16213e": "深海蓝 - 智慧、信任、平静",
  "#ffffff": "纯白 - 纯洁、简洁、高雅",
  "#b8b8b8": "浅灰 - 中性、现代、低调",
  "#e8a87c": "珊瑚色 - 温暖、活力、亲和",
  "#c38d9e": "玫瑰紫 - 浪漫、优雅、温柔",
  "#f5f5dc": "米色 - 温暖、舒适、自然",
  "#85dcb8": "薄荷绿 - 清新、健康、活力",
  "#2d3436": "炭黑 - 稳重、神秘、高级",
  "#636e72": "深灰 - 中性、专业、内敛",
  "#ffeaa7": "柠檬黄 - 活力、乐观、创意",
  "#74b9ff": "天空蓝 - 清新、自由、宁静",
  "#2c3e50": "墨蓝 - 智慧、深沉、典雅",
  "#7f8c8d": "石板灰 - 沉稳、内敛、自然",
  "#dfe6e9": "珍珠白 - 纯净、优雅、柔和",
  "#e74c3c": "中国红 - 热情、喜庆、力量",
  "#1a1a1a": "纯黑 - 神秘、高级、权威",
  "#d4af37": "金色 - 奢华、高贵、财富",
  "#8b0000": "深红 - 热情、优雅、神秘",
  "#ff9ff3": "粉色 - 温柔、浪漫、甜美",
  "#54a0ff": "蓝色 - 宁静、专业、信任",
  "#5f27cd": "紫色 - 神秘、高贵、创意",
  "#fdcb6e": "金色 - 温暖、活力、乐观",
};

function generateAiResponse(userMessage: string, conversationData: any, brandDna: any): { response: string; nextStep?: string; completed: boolean; saveData?: any } {
  const currentStep = conversationData.currentStep || "start";
  const collectedData = conversationData.collectedData || {};

  switch (currentStep) {
    case "start":
      return {
        response: `您好！我是色彩企划AI助手。我将基于流行趋势和品牌基因，为您制定专业的色彩方案。

首先，请告诉我您的企划主题是什么？（如：极简都市、复古浪漫等）`,
        nextStep: "input_theme",
        completed: false,
      };

    case "input_theme":
      collectedData.theme = userMessage;
      
      const matchedPalette = Object.keys(COLOR_PALETTES).find(key => userMessage.includes(key));
      collectedData.matchedPalette = matchedPalette || "极简都市";

      return {
        response: `很好！企划主题：${userMessage}

我已匹配到适合的色彩风格：**${collectedData.matchedPalette}**

接下来，请选择您想了解的内容：
1. 流行趋势色彩分析
2. 主题配色方案
3. 色彩搭配理论
4. 色彩心理与营销
5. 获取完整色彩企划`,
        nextStep: "select_color",
        completed: false,
      };

    case "select_color":
      const palette = COLOR_PALETTES[collectedData.matchedPalette as keyof typeof COLOR_PALETTES] || COLOR_PALETTES["极简都市"];
      const seasonType = userMessage.includes("春夏") || userMessage.includes("SS") ? "SS" : "AW";
      const seasonColors = SEASON_COLORS[seasonType as keyof typeof SEASON_COLORS];

      if (userMessage.includes("1") || userMessage.includes("趋势")) {
        return {
          response: `🎨 ${seasonColors.name}流行趋势色彩分析

**本季主题：** ${seasonColors.mood}

**主色调趋势：**
${seasonColors.trendColors.map((c: string, i: number) => `${i + 1}. ${c}`).join("\n")}

**色卡参考：**
${seasonColors.dominantColors.map((c: string) => `- ${c}：${COLOR_MEANINGS[c] || "时尚色"}`).join("\n")}

**对比度建议：** ${seasonColors.contrast}

您还想了解其他色彩方向吗？`,
          nextStep: "select_color",
          completed: false,
        };
      }

      if (userMessage.includes("2") || userMessage.includes("配色") || userMessage.includes("方案")) {
        return {
          response: `🎨 主题配色方案

基于主题「${collectedData.matchedPalette}」，推荐以下配色方案：

**主色调（60%）：**
${palette.primary.map((c: string) => `- ${c}：${COLOR_MEANINGS[c] || "主色"}`).join("\n")}

**辅助色（30%）：**
${palette.secondary.map((c: string) => `- ${c}：${COLOR_MEANINGS[c] || "辅助色"}`).join("\n")}

**点缀色（10%）：**
${palette.accent.map((c: string) => `- ${c}：${COLOR_MEANINGS[c] || "点缀色"}`).join("\n")}

**整体氛围：** ${palette.mood}

**品牌色彩契合：** ${brandDna?.color_palette?.slice(0, 2).join("、") || "建议结合品牌基因"}

您还想了解其他色彩方向吗？`,
          nextStep: "select_color",
          completed: false,
        };
      }

      if (userMessage.includes("3") || userMessage.includes("理论") || userMessage.includes("搭配")) {
        return {
          response: `🎨 色彩搭配理论

以下是常用的色彩搭配方法：

${Object.values(COLOR_THEORIES).map((t: any) => `**${t.name}**
- 描述：${t.description}
- 示例：${t.example}
- 效果：${t.effect}`).join("\n\n")}

**推荐搭配方式：**
- 同色系搭配：最安全，不易出错
- 邻近色搭配：和谐统一，适合大面积使用
- 互补色搭配：适合作为点缀，增加亮点

您还想了解其他色彩方向吗？`,
          nextStep: "select_color",
          completed: false,
        };
      }

      if (userMessage.includes("4") || userMessage.includes("心理") || userMessage.includes("营销")) {
        return {
          response: `🎨 色彩心理与营销

不同颜色传达不同的情感和心理暗示：

**暖色调（红、橙、黄）：**
- 传达：热情、活力、温暖、积极
- 适用：促销、年轻品牌、运动品类

**冷色调（蓝、绿、紫）：**
- 传达：冷静、专业、信任、宁静
- 适用：高端品牌、科技产品、商务品类

**中性色（黑、白、灰、棕）：**
- 传达：简约、高级、稳重、百搭
- 适用：奢侈品、基础款、极简风格

**色彩营销建议：**
- 主视觉用品牌核心色，建立识别度
- 促销信息用高饱和度对比色吸引注意
- 产品图片背景用中性色，突出产品本身

您还想了解其他色彩方向吗？`,
          nextStep: "select_color",
          completed: false,
        };
      }

      if (userMessage.includes("5") || userMessage.includes("完整") || userMessage.includes("全部")) {
        const fullColorPlan = generateFullColorPlan(collectedData, palette, seasonColors, brandDna);
        collectedData.colorPlan = fullColorPlan;
        
        return {
          response: `📋 完整色彩企划方案

**企划主题：** ${collectedData.theme}
**色彩风格：** ${collectedData.matchedPalette}

---

## 🎨 流行趋势分析

**季节：** ${seasonColors.name}
**趋势色：** ${seasonColors.trendColors.join("、")}
**整体氛围：** ${seasonColors.mood}

---

## 🎯 配色方案

**主色调（60%）：**
${palette.primary.map((c: string) => `- ${c}：${COLOR_MEANINGS[c] || "主色"}`).join("\n")}

**辅助色（30%）：**
${palette.secondary.map((c: string) => `- ${c}：${COLOR_MEANINGS[c] || "辅助色"}`).join("\n")}

**点缀色（10%）：**
${palette.accent.map((c: string) => `- ${c}：${COLOR_MEANINGS[c] || "点缀色"}`).join("\n")}

---

## 📐 色彩搭配建议

**推荐搭配方式：** 邻近色搭配 + 单色搭配
**对比度：** ${seasonColors.contrast}
**品牌契合度：** ${brandDna?.color_palette?.slice(0, 3).join("、") || "需确认"}

---

## 💡 营销应用建议

- 产品主图：使用主色调背景
- 详情页：辅助色为主，点缀色突出重点
- 促销活动：高饱和度点缀色吸引注意
- 品牌识别：保持核心色一致性

---

是否确认此色彩企划方案？确认后将保存到数据库。`,
          nextStep: "confirm_plan",
          completed: false,
        };
      }

      return {
        response: `请选择您想了解的内容：
1. 流行趋势色彩分析
2. 主题配色方案
3. 色彩搭配理论
4. 色彩心理与营销
5. 获取完整色彩企划`,
        nextStep: "select_color",
        completed: false,
      };

    case "confirm_plan":
      if (userMessage.includes("确认") || userMessage.includes("是")) {
        const colorPlan = collectedData.colorPlan;
        
        return {
          response: `✅ 色彩企划已保存！

您可以继续使用其他Skill进行：
1. 面料企划 - 寻找合适的面料供应商

或者直接进入面料企划环节？`,
          completed: true,
          saveData: {
            colorPlanning: {
              theme_name: collectedData.theme,
              color_palette: [...colorPlan.primary, ...colorPlan.secondary, ...colorPlan.accent],
              primary_colors: colorPlan.primary,
              secondary_colors: colorPlan.secondary,
              accent_colors: colorPlan.accent,
              color_theory: "邻近色搭配",
              season: "2026AW",
              brand_id: null,
            },
          },
        };
      }

      return {
        response: "好的，您可以修改色彩企划方案。请问您想调整：\n1. 配色方案\n2. 搭配理论\n3. 营销建议\n4. 重新生成",
        nextStep: "select_color",
        completed: false,
      };

    default:
      return {
        response: "感谢您的查询！如需更多色彩企划分析，请继续提问。",
        completed: true,
      };
  }
}

function generateFullColorPlan(collectedData: any, palette: any, seasonColors: any, brandDna: any): any {
  return {
    theme: collectedData.theme,
    style: collectedData.matchedPalette,
    season: seasonColors.name,
    primary: palette.primary,
    secondary: palette.secondary,
    accent: palette.accent,
    mood: palette.mood,
    trendColors: seasonColors.trendColors,
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
        skill_type: "color_planning",
        skill_name: "色彩企划",
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
      if (aiResponse.saveData.colorPlanning) {
        await supabase.from("color_planning").insert(aiResponse.saveData.colorPlanning);
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
    console.error("Color planning chat error:", err);
    return NextResponse.json(
      { error: "色彩企划对话失败" },
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