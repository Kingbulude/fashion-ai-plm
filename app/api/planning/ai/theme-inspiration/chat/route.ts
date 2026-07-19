import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

const SEASON_OPTIONS = ["2026SS", "2026AW", "2027SS", "2027AW"];
const CATEGORY_OPTIONS = ["上衣", "裤装", "裙装", "外套", "配饰", "全品类"];

const BRAND_THEMES = {
  "Louis Vuitton": {
    themes: [
      { name: "旅行精神", season: "2026SS", description: "以旅行箱为灵感，展现法式优雅与旅行美学的完美结合", mood: "优雅、自由" },
      { name: "城市游牧", season: "2026AW", description: "都市生活与游牧精神的碰撞，功能性与时尚感并存", mood: "现代、实用" },
      { name: "Monogram艺术", season: "2027SS", description: "经典Monogram图案的艺术化演绎，传统与创新的对话", mood: "经典、艺术" },
    ],
    style: "法式奢华、经典传承",
  },
  "Gucci": {
    themes: [
      { name: "复古浪漫", season: "2026SS", description: "70年代复古风格与浪漫主义的融合，花卉与印花的盛宴", mood: "浪漫、复古" },
      { name: "迷幻花园", season: "2026AW", description: "超现实的花园幻境，色彩斑斓的视觉冲击", mood: "奇幻、大胆" },
      { name: "极简奢华", season: "2027SS", description: "简约线条下的奢华质感，回归设计本质", mood: "简约、精致" },
    ],
    style: "复古奢华、大胆创新",
  },
  "Chanel": {
    themes: [
      { name: "经典重塑", season: "2026SS", description: "经典元素的现代诠释，小黑裙与粗花呢的新生", mood: "经典、现代" },
      { name: "海滨度假", season: "2026AW", description: "蔚蓝海岸的优雅风情，白色与蓝色的纯净对话", mood: "清新、优雅" },
      { name: "优雅运动", season: "2027SS", description: "运动元素与优雅气质的完美结合，打破传统界限", mood: "活力、优雅" },
    ],
    style: "优雅经典、永不过时",
  },
  "Dior": {
    themes: [
      { name: "花朵盛开", season: "2026SS", description: "花卉灵感的极致表达，柔美与力量的平衡", mood: "柔美、浪漫" },
      { name: "建筑美学", season: "2026AW", description: "建筑线条与服装结构的对话，几何美学的极致展现", mood: "建筑、艺术" },
      { name: "新古典主义", season: "2027SS", description: "古典美学的现代演绎，优雅与现代的完美融合", mood: "古典、现代" },
    ],
    style: "浪漫优雅、艺术气息",
  },
  "Prada": {
    themes: [
      { name: "极简未来", season: "2026SS", description: "极简主义与未来感的碰撞，功能性面料的创新应用", mood: "未来、科技" },
      { name: "学院复古", season: "2026AW", description: "学院风格的复古回潮，青春与知性的完美结合", mood: "青春、知性" },
      { name: "解构主义", season: "2027SS", description: "传统结构的解构重组，打破常规的设计语言", mood: "前卫、创新" },
    ],
    style: "极简前卫、功能性",
  },
};

function generateAiResponse(userMessage: string, conversationData: any, brandDna: any): { response: string; nextStep?: string; completed: boolean; saveData?: any } {
  const currentStep = conversationData.currentStep || "start";
  const collectedData = conversationData.collectedData || {};
  
  switch (currentStep) {
    case "start":
      return {
        response: `您好！我是企划主题灵感AI助手。我可以帮您分析大牌企划主题，为您的品牌提供灵感参考。
        
首先，请告诉我您要开发的是哪个季节的企划？
可选：${SEASON_OPTIONS.join("、")}`,
        nextStep: "select_season",
        completed: false,
      };
    
    case "select_season":
      if (SEASON_OPTIONS.includes(userMessage)) {
        collectedData.season = userMessage;
        return {
          response: `好的，${userMessage}季。接下来请选择品类方向：
可选：${CATEGORY_OPTIONS.join("、")}`,
          nextStep: "select_category",
          completed: false,
        };
      }
      return {
        response: `请从以下选项中选择季节：${SEASON_OPTIONS.join("、")}`,
        nextStep: "select_season",
        completed: false,
      };
    
    case "select_category":
      if (CATEGORY_OPTIONS.includes(userMessage)) {
        collectedData.category = userMessage;
        return {
          response: `很好！${collectedData.season}季 · ${userMessage}品类。
        
我将为您分析各大品牌的类似企划主题作为灵感参考，请稍候...`,
          nextStep: "analyze_themes",
          completed: false,
        };
      }
      return {
        response: `请从以下选项中选择品类：${CATEGORY_OPTIONS.join("、")}`,
        nextStep: "select_category",
        completed: false,
      };
    
    case "analyze_themes":
      const recommendedThemes = recommendThemes(collectedData.season, collectedData.category);
      collectedData.recommendedThemes = recommendedThemes;
      
      return {
        response: `🎨 企划主题灵感推荐

基于${collectedData.season}季 · ${collectedData.category}品类，为您推荐以下大牌企划主题作为参考：

${recommendedThemes.map((t: any, i: number) => `${i + 1}. **${t.brand} - ${t.name}**
- 季节：${t.season}
- 描述：${t.description}
- 氛围：${t.mood}
- 品牌风格：${t.brandStyle}`).join("\n\n")}

---

您可以选择其中一个主题作为灵感，或者告诉我您有其他想法，我会帮您生成定制化的企划主题方案。`,
        nextStep: "select_theme",
        completed: false,
      };
    
    case "select_theme":
      const selectedTheme = collectedData.recommendedThemes.find((t: any) => 
        userMessage.includes(t.name) || userMessage.includes(t.brand)
      );
      
      if (selectedTheme) {
        collectedData.selectedTheme = selectedTheme;
        
        const customizedTheme = generateCustomTheme(selectedTheme, collectedData, brandDna);
        
        return {
          response: `🎉 主题选定：${selectedTheme.brand} - ${selectedTheme.name}

我已为您定制化生成企划主题方案：

**主题名称：** ${customizedTheme.name}

**主题描述：** ${customizedTheme.description}

**灵感来源：** ${selectedTheme.brand} ${selectedTheme.season}系列

**品牌契合度：** ${customizedTheme.alignmentScore}%

**核心设计元素：**
${customizedTheme.designElements.map((e: string) => `- ${e}`).join("\n")}

**色彩方向：** ${customizedTheme.colorDirection}

**目标客群：** ${brandDna?.target_audience || "25-35岁都市职场女性"}

---

是否确认使用此主题？确认后将进入商品企划生成环节。`,
          nextStep: "confirm_theme",
          completed: false,
        };
      }
      
      collectedData.customTheme = userMessage;
      return {
        response: `好的，自定义主题：${userMessage}

我将基于您的想法为您生成完整的企划主题方案：

**主题名称：** ${userMessage}

**主题描述：** 基于${collectedData.season}季市场趋势和${collectedData.category}品类特点，打造独具特色的${userMessage}系列。

**灵感来源：** 品牌自主创意

**核心设计元素：**
- ${collectedData.season.includes("SS") ? "轻盈透气的面料" : "温暖厚实的材质"}
- ${collectedData.category === "外套" ? "大气廓形与精致细节" : "合身剪裁与舒适版型"}
- 符合品牌基因的设计语言

---

是否确认使用此主题？确认后将进入商品企划生成环节。`,
        nextStep: "confirm_theme",
        completed: false,
      };
    
    case "confirm_theme":
      if (userMessage.includes("确认") || userMessage.includes("是")) {
        return {
          response: `✅ 主题已确认！

企划主题：${collectedData.selectedTheme?.name || collectedData.customTheme}
季节：${collectedData.season}
品类：${collectedData.category}

您可以继续使用其他Skill进行：
1. 商品企划生成
2. 设计企划
3. 色彩企划
4. 面料企划

或者直接进入商品企划环节？`,
          completed: true,
          saveData: {
            planningTheme: {
              season: collectedData.season,
              theme_name: collectedData.selectedTheme?.name || collectedData.customTheme,
              theme_description: collectedData.selectedTheme?.description || "自定义主题",
              inspiration_source: collectedData.selectedTheme?.brand || "品牌自主创意",
              selected: true,
            },
          },
        };
      }
      
      return {
        response: "好的，您可以重新选择或修改主题。请问您想：\n1. 重新选择灵感主题\n2. 修改当前主题\n3. 输入新的主题想法",
        nextStep: "select_theme",
        completed: false,
      };
    
    default:
      return {
        response: "感谢您的查询！如需更多企划主题灵感，请继续提问。",
        completed: true,
      };
  }
}

function recommendThemes(season: string, category: string): any[] {
  const results: any[] = [];
  
  for (const [brand, data] of Object.entries(BRAND_THEMES)) {
    const seasonThemes = (data as any).themes.filter((t: any) => 
      t.season === season || Math.abs(SEASON_OPTIONS.indexOf(t.season) - SEASON_OPTIONS.indexOf(season)) <= 1
    );
    
    for (const theme of seasonThemes.slice(0, 2)) {
      results.push({
        brand,
        brandStyle: (data as any).style,
        ...theme,
      });
    }
  }
  
  return results.slice(0, 5);
}

function generateCustomTheme(selectedTheme: any, collectedData: any, brandDna: any): any {
  const designElements: string[] = [];
  
  if (collectedData.category === "外套") {
    designElements.push("大气廓形");
    designElements.push("精致细节装饰");
    designElements.push("高品质面料");
  } else if (collectedData.category === "上衣") {
    designElements.push("舒适版型");
    designElements.push("简约线条");
    designElements.push("百搭设计");
  } else if (collectedData.category === "裤装") {
    designElements.push("修身剪裁");
    designElements.push("舒适面料");
    designElements.push("多样化款式");
  } else if (collectedData.category === "裙装") {
    designElements.push("优雅廓形");
    designElements.push("浪漫细节");
    designElements.push("多样化长度");
  } else {
    designElements.push("系列化设计");
    designElements.push("统一风格语言");
    designElements.push("品类间呼应");
  }
  
  return {
    name: `${brandDna?.brand_name || "TEPNIX"} · ${selectedTheme.name}`,
    description: `基于${selectedTheme.brand}的${selectedTheme.name}主题灵感，结合${brandDna?.brand_name || "TEPNIX"}品牌基因，打造适合${collectedData.category}品类的${collectedData.season}系列。`,
    alignmentScore: 85 + Math.floor(Math.random() * 10),
    designElements,
    colorDirection: brandDna?.color_palette?.slice(0, 3).join("、") || "#1a1a2e、#16213e、#ffffff",
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
        skill_type: "theme_inspiration",
        skill_name: "企划主题灵感",
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
      if (aiResponse.saveData.planningTheme) {
        await supabase.from("planning_themes").insert(aiResponse.saveData.planningTheme);
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
    conversation.conversation_data.collectedData = { ...conversation.conversation_data.collectedData };
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
    console.error("Theme inspiration chat error:", err);
    return NextResponse.json(
      { error: "企划主题灵感对话失败" },
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