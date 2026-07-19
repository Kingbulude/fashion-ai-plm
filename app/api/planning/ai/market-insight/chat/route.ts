import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";
import { crawlXiaohongshu, crawlTaobao, crawlDouyin, crawlAllPlatforms, generateMarketReport } from "@/services/crawler";

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
        skill_type: "market_insight",
        skill_name: "市场需求洞察",
        conversation_data: {
          messages: [],
          currentStep: "start",
          collectedData: {},
          crawlResults: {},
        },
        is_completed: false,
      };
    }
    
    const currentStep = conversation.conversation_data.currentStep;
    const collectedData = conversation.conversation_data.collectedData || {};
    const crawlResults = conversation.conversation_data.crawlResults || {};

    let aiResponse: { response: string; nextStep?: string; completed: boolean };

    switch (currentStep) {
      case "start":
        aiResponse = {
          response: `您好！我是市场需求洞察AI助手。我可以帮您分析市场趋势、热门商品和消费者需求。

您可以选择：
1. 分析特定平台的趋势（小红书、淘宝、抖音）
2. 搜索特定关键词的市场数据
3. 获取完整的市场洞察报告

请问您想了解哪方面的信息？`,
          nextStep: "select_action",
          completed: false,
        };
        break;

      case "select_action":
        if (userMessage.includes("小红书") || userMessage.includes("1")) {
          aiResponse = {
            response: "好的，我来帮您爬取小红书的最新数据。请问您想搜索什么关键词？（如：职场穿搭、秋冬外套等）",
            nextStep: "crawl_xiaohongshu",
            completed: false,
          };
        } else if (userMessage.includes("淘宝") || userMessage.includes("2")) {
          aiResponse = {
            response: "好的，我来帮您分析淘宝的热门商品数据。请问您想搜索什么品类？（如：大衣、牛仔裤等）",
            nextStep: "crawl_taobao",
            completed: false,
          };
        } else if (userMessage.includes("抖音") || userMessage.includes("3")) {
          aiResponse = {
            response: "好的，我来帮您分析抖音的热门视频数据。请问您想搜索什么话题？",
            nextStep: "crawl_douyin",
            completed: false,
          };
        } else if (userMessage.includes("报告") || userMessage.includes("全部")) {
          aiResponse = {
            response: "好的，我来为您生成完整的市场洞察报告。正在爬取各平台数据...",
            nextStep: "generate_report",
            completed: false,
          };
        } else {
          aiResponse = {
            response: `我理解您想搜索：${userMessage}。让我帮您爬取各平台的相关数据...`,
            nextStep: "crawl_all",
            completed: false,
          };
        }
        break;

      case "crawl_xiaohongshu":
      case "crawl_taobao":
      case "crawl_douyin": {
        const platform = currentStep.replace("crawl_", "") as "xiaohongshu" | "taobao" | "douyin";
        const platformName = { xiaohongshu: "小红书", taobao: "淘宝", douyin: "抖音" }[platform];
        
        let result;
        if (platform === "xiaohongshu") {
          result = await crawlXiaohongshu(userMessage);
        } else if (platform === "taobao") {
          result = await crawlTaobao(userMessage);
        } else {
          result = await crawlDouyin(userMessage);
        }
        
        crawlResults[platform] = result.data;
        
        await supabase.from("crawler_data").insert({
          platform,
          search_query: userMessage,
          data_type: "trend_analysis",
          raw_data: result,
          processed_data: result.data,
          brand_id: null,
        });

        aiResponse = {
          response: `📊 ${platformName}数据分析完成！

**搜索关键词：** ${userMessage}
**爬取时间：** ${new Date().toLocaleString()}

${platform === "xiaohongshu" ? generateXhsReport(result.data) : 
  platform === "taobao" ? generateTbReport(result.data) : generateDyReport(result.data)}

您还想分析其他平台吗？`,
          nextStep: "select_action",
          completed: false,
        };
        break;
      }

      case "crawl_all": {
        const results = await crawlAllPlatforms(userMessage);
        
        for (const result of results) {
          crawlResults[result.platform] = result.data;
          await supabase.from("crawler_data").insert({
            platform: result.platform,
            search_query: userMessage,
            data_type: "trend_analysis",
            raw_data: result,
            processed_data: result.data,
            brand_id: null,
          });
        }

        aiResponse = {
          response: `📊 多平台数据分析完成！

**搜索关键词：** ${userMessage}

---

**小红书数据：**
${generateXhsReport(crawlResults.xiaohongshu)}

---

**淘宝数据：**
${generateTbReport(crawlResults.taobao)}

---

**抖音数据：**
${generateDyReport(crawlResults.douyin)}

---

您还想深入分析某个平台的数据吗？`,
          nextStep: "select_action",
          completed: false,
        };
        break;
      }

      case "generate_report": {
        const results = await crawlAllPlatforms(userMessage);
        
        for (const result of results) {
          crawlResults[result.platform] = result.data;
          await supabase.from("crawler_data").insert({
            platform: result.platform,
            search_query: userMessage,
            data_type: "trend_analysis",
            raw_data: result,
            processed_data: result.data,
            brand_id: null,
          });
          
          if (result.data.trends) {
            for (const trend of result.data.trends) {
              await supabase.from("market_trends").insert({
                trend_type: "social_media",
                trend_name: trend.trend,
                description: trend.description,
                confidence_score: trend.confidence,
                source: result.platform,
                data_date: new Date().toISOString(),
                tags: result.data.trendingKeywords || [],
              });
            }
          }
        }

        const report = await generateMarketReport(userMessage);
        aiResponse = {
          response: report,
          completed: true,
        };
        break;
      }

      default:
        aiResponse = {
          response: "感谢您的查询！如需更多市场洞察分析，请继续提问。",
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
    conversation.conversation_data.crawlResults = crawlResults;
    conversation.is_completed = aiResponse.completed;
    conversation.updated_at = new Date().toISOString();
    
    await supabase.from("ai_conversations").upsert(conversation, { onConflict: "id" });
    
    return NextResponse.json({
      conversationId: conversation.id,
      messages: conversation.conversation_data.messages,
      isCompleted: aiResponse.completed,
      crawlResults: conversation.conversation_data.crawlResults,
    });
  } catch (err) {
    console.error("Market insight chat error:", err);
    return NextResponse.json(
      { error: "市场洞察对话失败" },
      { status: 500 }
    );
  }
}

function generateXhsReport(data: any): string {
  let report = "";
  
  if (data.trendingKeywords && data.trendingKeywords.length > 0) {
    report += `**热门关键词：** ${data.trendingKeywords.join("、")}\n\n`;
  }
  
  if (data.hotPosts && data.hotPosts.length > 0) {
    report += `**热门帖子：**\n`;
    report += data.hotPosts.slice(0, 3).map((p: any) => 
      `- ${p.title}（点赞：${p.likes.toLocaleString()}，评论：${p.comments}）`
    ).join("\n");
    report += "\n\n";
  }
  
  if (data.trends && data.trends.length > 0) {
    report += `**趋势洞察：**\n`;
    report += data.trends.slice(0, 2).map((t: any) => 
      `- ${t.trend}（置信度${t.confidence}%）`
    ).join("\n");
  }
  
  return report || "暂无数据";
}

function generateTbReport(data: any): string {
  let report = "";
  
  if (data.hotProducts && data.hotProducts.length > 0) {
    report += `**爆款商品：**\n`;
    report += data.hotProducts.slice(0, 3).map((p: any) => 
      `- ${p.name}：销量${p.sales.toLocaleString()}，增长${p.growthRate}`
    ).join("\n");
    report += "\n\n";
  }
  
  if (data.categoryAnalysis) {
    report += `**品类占比：**\n`;
    const categoryMap: Record<string, string> = { tops: "上衣", bottoms: "裤装", outerwear: "外套", accessories: "配饰" };
    for (const [key, value] of Object.entries(data.categoryAnalysis)) {
      const cat = value as any;
      report += `- ${categoryMap[key] || key}：${cat.ratio}%，增长${cat.growth}\n`;
    }
  }
  
  return report || "暂无数据";
}

function generateDyReport(data: any): string {
  let report = "";
  
  if (data.viralVideos && data.viralVideos.length > 0) {
    report += `**热门视频：**\n`;
    report += data.viralVideos.slice(0, 3).map((v: any) => 
      `- ${v.title}（播放：${(v.views / 10000).toFixed(1)}万，点赞：${(v.likes / 10000).toFixed(1)}万）`
    ).join("\n");
    report += "\n\n";
  }
  
  if (data.trendingTopics && data.trendingTopics.length > 0) {
    report += `**热门话题：** ${data.trendingTopics.join("、")}`;
  }
  
  return report || "暂无数据";
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
      return NextResponse.json(data?.conversation_data || { messages: [], currentStep: "start", collectedData: {}, crawlResults: {} });
    }
    
    return NextResponse.json({ messages: [], currentStep: "start", collectedData: {}, crawlResults: {} });
  } catch (err) {
    return NextResponse.json({ messages: [], currentStep: "start", collectedData: {}, crawlResults: {} });
  }
}