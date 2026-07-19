import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";
import { searchFabricSuppliers, getFabricDetails, getSeasonFabrics, searchFabricsByTheme } from "@/services/crawler";

export const runtime = "edge";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
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
        skill_type: "fabric_planning",
        skill_name: "面料企划",
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
    
    const currentStep = conversation.conversation_data.currentStep;
    const collectedData = conversation.conversation_data.collectedData || {};

    let aiResponse: { response: string; nextStep?: string; completed: boolean; saveData?: any };

    switch (currentStep) {
      case "start":
        aiResponse = {
          response: `您好！我是面料企划AI助手。我将帮助您寻找符合主题的面料和供应商信息。

首先，请告诉我您的企划主题是什么？（如：极简都市、复古浪漫等）`,
          nextStep: "input_theme",
          completed: false,
        };
        break;

      case "input_theme":
        collectedData.theme = userMessage;
        
        const seasonType = userMessage.includes("春夏") || userMessage.includes("SS") ? "SS" : "AW";
        collectedData.season = seasonType;

        aiResponse = {
          response: `很好！企划主题：${userMessage}

接下来，请选择您想了解的内容：
1. 季节面料推荐
2. 面料类型与特性
3. 供应商信息查询
4. 面料详细参数
5. 获取完整面料企划`,
          nextStep: "select_fabric",
          completed: false,
        };
        break;

      case "select_fabric": {
        const seasonFabrics = await getSeasonFabrics(collectedData.season);

        if (userMessage.includes("1") || userMessage.includes("季节") || userMessage.includes("推荐")) {
          const themeFabrics = await searchFabricsByTheme(collectedData.theme);
          
          aiResponse = {
            response: `🧵 ${seasonFabrics.season}季节面料推荐

**推荐面料：**
${seasonFabrics.recommended.map((f: string) => `- ${f}`).join("\n")}

**特性要求：**
${seasonFabrics.characteristics.map((c: string) => `- ${c}`).join("\n")}

**避免使用：**
${seasonFabrics.avoid.map((a: string) => `- ${a}`).join("\n")}

**主题匹配面料：**
${themeFabrics.slice(0, 5).map((f: any) => `- ${f.name}：${f.composition}，${f.price}`).join("\n")}

您还想了解其他面料信息吗？`,
            nextStep: "select_fabric",
            completed: false,
          };
        } else if (userMessage.includes("2") || userMessage.includes("类型") || userMessage.includes("特性")) {
          const FABRIC_TYPES = {
            natural: { name: "天然面料", examples: ["棉", "麻", "丝", "羊毛", "羊绒"], characteristics: ["透气吸汗", "舒适亲肤", "天然环保"], priceRange: "中高" },
            synthetic: { name: "合成面料", examples: ["涤纶", "锦纶", "氨纶"], characteristics: ["耐磨耐穿", "易打理", "功能性强"], priceRange: "低中" },
            blended: { name: "混纺面料", examples: ["棉涤", "毛涤", "棉麻"], characteristics: ["兼具多种优点", "性价比高", "性能均衡"], priceRange: "中" },
            functional: { name: "功能面料", examples: ["防水透气", "防晒", "抗菌"], characteristics: ["特殊功能", "科技含量高"], priceRange: "中高" },
          };

          aiResponse = {
            response: `🧵 面料类型与特性

${Object.values(FABRIC_TYPES).map((t: any) => `**${t.name}**
- 常见面料：${t.examples.join("、")}
- 特性：${t.characteristics.join("、")}
- 价格区间：${t.priceRange}`).join("\n\n")}

**选择建议：**
- 高端定位：优先天然面料（丝、羊毛、羊绒）
- 性价比定位：混纺面料（棉涤、毛涤）
- 功能性需求：合成面料或功能面料

您还想了解其他面料信息吗？`,
            nextStep: "select_fabric",
            completed: false,
          };
        } else if (userMessage.includes("3") || userMessage.includes("供应商")) {
          const suppliers = await searchFabricSuppliers(userMessage);
          
          aiResponse = {
            response: `🧵 供应商信息${suppliers.length > 0 ? "" : "（未找到匹配供应商，显示全部）"}

${suppliers.length > 0 ? suppliers.slice(0, 5).map((s: any) => `**${s.name}**
- 所在地：${s.location}
- 主营：${s.specialties.join("、")}
- 品质等级：${s.quality}
- 最小起订量：${s.minOrder}米
- 价格区间：${s.priceLevel}
${s.certifications ? `- 认证：${s.certifications.join("、")}` : ""}`).join("\n\n") : "未找到匹配的供应商"}

**供应商选择建议：**
- 品质优先：选择品质等级"优"的供应商
- 成本控制：选择价格区间"低中"或"中"的供应商
- 交期保障：优先考虑地理位置近的供应商

您还想了解其他面料信息吗？`,
            nextStep: "select_fabric",
            completed: false,
          };
        } else if (userMessage.includes("4") || userMessage.includes("参数") || userMessage.includes("详细")) {
          const fabricDetail = await getFabricDetails(userMessage);
          
          if (fabricDetail) {
            aiResponse = {
              response: `🧵 ${fabricDetail.name}详细参数

**成分：** ${fabricDetail.composition}
**克重：** ${fabricDetail.weight}
**幅宽：** ${fabricDetail.width}
**参考价格：** ${fabricDetail.price}
**推荐供应商：** ${fabricDetail.supplier}

**特性：**
${fabricDetail.characteristics.map((c: string) => `- ${c}`).join("\n")}

**适用范围：**
${fabricDetail.usage.map((u: string) => `- ${u}`).join("\n")}

**使用建议：**
- 洗涤方式：${fabricDetail.name.includes("丝") || fabricDetail.name.includes("羊绒") ? "建议干洗" : "可水洗"}
- 注意事项：${fabricDetail.name.includes("麻") ? "容易起皱，建议混纺使用" : "正常使用"}

您还想了解其他面料信息吗？`,
              nextStep: "select_fabric",
              completed: false,
            };
          } else {
            aiResponse = {
              response: `🧵 面料详细参数查询

请告诉我您想了解哪种面料的详细参数？（如：棉、麻、丝、羊毛等）`,
              nextStep: "select_fabric",
              completed: false,
            };
          }
        } else if (userMessage.includes("5") || userMessage.includes("完整") || userMessage.includes("全部")) {
          const seasonFabricsData = await getSeasonFabrics(collectedData.season);
          const themeFabrics = await searchFabricsByTheme(collectedData.theme);
          const suppliers = await searchFabricSuppliers(collectedData.theme);
          
          collectedData.fabricPlan = {
            recommendedFabrics: seasonFabricsData.recommended,
            characteristics: seasonFabricsData.characteristics,
            themeFabrics,
            suppliers: suppliers.slice(0, 4),
          };
          
          aiResponse = {
            response: `📋 完整面料企划方案

**企划主题：** ${collectedData.theme}
**季节：** ${seasonFabricsData.season}

---

## 🧵 面料推荐

**主推面料：**
${seasonFabricsData.recommended.slice(0, 5).map((f: string) => `- ${f}`).join("\n")}

**特性要求：**
${seasonFabricsData.characteristics.map((c: string) => `- ${c}`).join("\n")}

**主题匹配面料：**
${themeFabrics.slice(0, 5).map((f: any) => `- ${f.name}：${f.composition}，${f.price}`).join("\n")}

---

## 📊 供应商清单

${suppliers.slice(0, 4).map((s: any) => `**${s.name}**
- 所在地：${s.location}
- 主营：${s.specialties.join("、")}
- 品质：${s.quality}
- 最小起订：${s.minOrder}米`).join("\n\n")}

---

## 💡 采购建议

**价格策略：**
- 高端款：使用天然面料（丝、羊毛、羊绒）
- 基础款：使用混纺面料（棉涤、棉麻）
- 功能性款：使用功能面料

**品质控制：**
- 采购前索取样品确认
- 建立供应商评估体系
- 定期质检确保品质

---

是否确认此面料企划方案？确认后将保存到数据库。`,
            nextStep: "confirm_plan",
            completed: false,
          };
        } else {
          aiResponse = {
            response: `请选择您想了解的内容：
1. 季节面料推荐
2. 面料类型与特性
3. 供应商信息查询
4. 面料详细参数
5. 获取完整面料企划`,
            nextStep: "select_fabric",
            completed: false,
          };
        }
        break;
      }

      case "confirm_plan":
        if (userMessage.includes("确认") || userMessage.includes("是")) {
          const fabricPlan = collectedData.fabricPlan;
          
          await supabase.from("fabric_planning").insert({
            theme_name: collectedData.theme,
            season: (await getSeasonFabrics(collectedData.season)).season,
            fabric_types: fabricPlan.recommendedFabrics,
            characteristics: fabricPlan.characteristics,
            supplier_list: fabricPlan.suppliers.map((s: any) => s.name),
            brand_id: null,
          });

          aiResponse = {
            response: `✅ 面料企划已保存！

面料企划流程已完成。您可以回到企划中心查看所有企划方案，或开始新的企划流程。`,
            completed: true,
          };
        } else {
          aiResponse = {
            response: "好的，您可以修改面料企划方案。请问您想调整：\n1. 面料推荐\n2. 供应商选择\n3. 采购建议\n4. 重新生成",
            nextStep: "select_fabric",
            completed: false,
          };
        }
        break;

      default:
        aiResponse = {
          response: "感谢您的查询！如需更多面料企划分析，请继续提问。",
          completed: true,
        };
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
    conversation.conversation_data.currentStep = aiResponse.nextStep || currentStep;
    conversation.conversation_data.collectedData = collectedData;
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
    console.error("Fabric planning chat error:", err);
    return NextResponse.json(
      { error: "面料企划对话失败" },
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