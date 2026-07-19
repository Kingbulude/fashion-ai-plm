import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

const BRAND_DNA_DIMENSIONS = [
  { key: "brand_mission", label: "品牌使命", description: "品牌存在的意义和价值" },
  { key: "target_audience", label: "目标客群", description: "品牌服务的核心人群" },
  { key: "age_range", label: "年龄范围", description: "目标客群的年龄区间" },
  { key: "style_direction", label: "风格方向", description: "品牌的设计风格定位" },
  { key: "price_position", label: "定价定位", description: "品牌的价格区间定位" },
  { key: "core_values", label: "核心价值", description: "品牌坚守的核心原则" },
  { key: "visual_identity", label: "视觉识别", description: "品牌的视觉形象系统" },
  { key: "color_palette", label: "色彩体系", description: "品牌常用的色彩组合" },
  { key: "brand_story", label: "品牌故事", description: "品牌背后的故事和情感" },
  { key: "competitive_advantage", label: "竞争优势", description: "品牌区别于竞品的优势" },
];

function generateAiResponse(userMessage: string, conversationData: any, brandDna: any): { response: string; nextStep?: string; completed: boolean } {
  const currentStep = conversationData.currentStep || "start";
  const collectedData = conversationData.collectedData || {};
  
  const missingDimensions = BRAND_DNA_DIMENSIONS.filter(d => !collectedData[d.key]);
  
  switch (currentStep) {
    case "start":
      return {
        response: `您好！我是品牌基因AI助手。我将帮助您梳理和完善品牌基因。
        
首先，您是成熟品牌还是新品牌？
- 成熟品牌：请上传品牌说明文档，我会帮您拆解分析
- 新品牌：我会通过对话引导您挖掘品牌核心定位`,
        nextStep: "brand_type",
        completed: false,
      };
    
    case "brand_type":
      if (userMessage.includes("成熟") || userMessage.includes("上传")) {
        return {
          response: "好的，您是成熟品牌。请提供品牌说明文档或描述，我会帮您拆解分析并识别缺失的基因维度。",
          nextStep: "upload_doc",
          completed: false,
        };
      } else {
        return {
          response: "好的，您是新品牌。我会通过一系列问题引导您梳理品牌基因。让我们开始吧！\n\n首先，请问品牌的使命是什么？也就是品牌存在的意义和想要创造的价值是什么？",
          nextStep: "collect_mission",
          completed: false,
        };
      }
    
    case "upload_doc":
      const parsedFromDoc = parseBrandDoc(userMessage);
      Object.assign(collectedData, parsedFromDoc);
      
      const docMissing = BRAND_DNA_DIMENSIONS.filter(d => !collectedData[d.key]);
      if (docMissing.length > 0) {
        const firstMissing = docMissing[0];
        return {
          response: `我已分析您的品牌文档，识别出以下信息：\n${Object.entries(collectedData).map(([k, v]) => {
            const dim = BRAND_DNA_DIMENSIONS.find(d => d.key === k);
            return `- ${dim?.label || k}: ${v}`;
          }).join("\n")}\n\n还有一些维度需要补充，让我们继续完善：\n\n${firstMissing.label}（${firstMissing.description}）是什么？`,
          nextStep: `collect_${firstMissing.key}`,
          completed: false,
        };
      }
      return {
        response: generateBrandDnaSummary(collectedData),
        completed: true,
      };
    
    case "collect_mission":
      collectedData.brand_mission = userMessage;
      const nextMission = BRAND_DNA_DIMENSIONS.find(d => d.key === "target_audience");
      return {
        response: `很好！品牌使命：${userMessage}\n\n接下来，请告诉我${nextMission?.label}（${nextMission?.description}）是什么？`,
        nextStep: `collect_${nextMission?.key}`,
        completed: false,
      };
    
    default:
      const match = currentStep.match(/collect_(\w+)/);
      if (match) {
        const key = match[1];
        collectedData[key] = userMessage;
        
        const nextDim = BRAND_DNA_DIMENSIONS.find(d => !collectedData[d.key]);
        if (nextDim) {
          return {
            response: `已记录${BRAND_DNA_DIMENSIONS.find(d => d.key === key)?.label}。\n\n继续完善：${nextDim.label}（${nextDim.description}）是什么？`,
            nextStep: `collect_${nextDim.key}`,
            completed: false,
          };
        } else {
          return {
            response: generateBrandDnaSummary(collectedData),
            completed: true,
          };
        }
      }
      
      return {
        response: "感谢您的信息！我已整理出完整的品牌基因报告。",
        completed: true,
      };
  }
}

function parseBrandDoc(doc: string): Record<string, any> {
  const result: Record<string, any> = {};
  
  const patterns: Record<string, string[]> = {
    brand_mission: ["使命", "愿景", "宗旨", "目标"],
    target_audience: ["客群", "受众", "用户", "人群"],
    style_direction: ["风格", "设计", "定位"],
    price_position: ["价格", "定价", "定位"],
    core_values: ["价值观", "核心价值", "理念"],
    brand_story: ["故事", "历史", "起源"],
  };
  
  for (const [key, keywords] of Object.entries(patterns)) {
    for (const keyword of keywords) {
      const regex = new RegExp(`${keyword}[：:]?\\s*([^\n]+)`, "i");
      const match = doc.match(regex);
      if (match) {
        result[key] = match[1].trim();
        break;
      }
    }
  }
  
  return result;
}

function generateBrandDnaSummary(collectedData: Record<string, any>): string {
  return `🎉 恭喜！品牌基因梳理完成！

以下是您品牌的完整基因图谱：

${BRAND_DNA_DIMENSIONS.map(d => {
    const value = collectedData[d.key];
    return value ? `**${d.label}**：${Array.isArray(value) ? value.join("、") : value}` : `**${d.label}**：未填写`;
  }).join("\n\n")}

---

这份品牌基因将作为后续企划决策的基础参考。您可以随时回来修改或补充。

是否需要我帮您分析这份品牌基因与市场趋势的匹配度？`;
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
        skill_type: "brand_dna",
        skill_name: "品牌基因AI对话",
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
    conversation.conversation_data.collectedData = aiResponse.completed
      ? conversation.conversation_data.collectedData
      : conversation.conversation_data.collectedData;
    conversation.is_completed = aiResponse.completed;
    conversation.updated_at = new Date().toISOString();
    
    if (aiResponse.completed) {
      await supabase.from("brand_dna").upsert({
        ...conversation.conversation_data.collectedData,
        brand_name: conversation.conversation_data.collectedData.brand_name || brandDnaData?.brand_name || "TEPNIX步戌",
        status: "active",
        updated_at: new Date().toISOString(),
      }, { onConflict: "brand_name" });
    }
    
    await supabase.from("ai_conversations").upsert(conversation, { onConflict: "id" });
    
    return NextResponse.json({
      conversationId: conversation.id,
      messages: conversation.conversation_data.messages,
      isCompleted: aiResponse.completed,
      collectedData: conversation.conversation_data.collectedData,
    });
  } catch (err) {
    console.error("Brand DNA chat error:", err);
    return NextResponse.json(
      { error: "品牌基因对话失败" },
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