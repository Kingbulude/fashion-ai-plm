import { OpenAI } from "openai";

const deepseekClient = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: "https://api.deepseek.com/v1",
});

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: { role: "system" | "user" | "assistant"; content: string }[] = [];
  
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  
  messages.push({ role: "user", content: prompt });
  
  const completion = await deepseekClient.chat.completions.create({
    model: "deepseek-chat",
    messages,
    temperature: 0.7,
    max_tokens: 2000,
  });
  
  return completion.choices[0]?.message?.content || "";
}

export async function generateTechPack(styleName: string, description: string): Promise<string> {
  const promptText = `根据以下款式信息生成工艺包草稿：

款式名称：${styleName}
描述：${description}

请包含：
1. 尺寸表（S/M/L/XL）
2. 工艺说明
3. 缝制标准
4. 建议BOM物料清单

以专业服装工艺文档格式输出。`;
  
  return generateText(promptText);
}

export { deepseekClient };
