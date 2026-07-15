import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || "";

const genAI = new GoogleGenerativeAI(apiKey);

const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const fullPrompt = systemPrompt ? `${systemPrompt}\n\n${prompt}` : prompt;

  const result = await model.generateContent(fullPrompt);
  return result.response.text();
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

export async function analyzeDesignImage(imageBase64: string, mimeType: string): Promise<string> {
  const visionModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const result = await visionModel.generateContent([
    { text: "请分析这张服装设计图，输出以下信息：1. 服装类型 2. 主要颜色 3. 设计风格 4. 面料建议 5. 工艺要点。以JSON格式输出。" },
    { inlineData: { data: imageBase64, mimeType } },
  ]);

  return result.response.text();
}

export { genAI };
