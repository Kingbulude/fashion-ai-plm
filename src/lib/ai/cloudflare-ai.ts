// Cloudflare Workers AI 封装
// 文档：https://developers.cloudflare.com/workers-ai/

const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CLOUDFLARE_AI_TOKEN = process.env.CLOUDFLARE_AI_TOKEN || "";

// 推荐模型：中文能力强、推理快、免费额度大
const TEXT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
const VISION_MODEL = "@cf/llava-hf/llava-1.5-7b-hf";

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

async function callWorkersAI(model: string, payload: Record<string, unknown>): Promise<string> {
  if (!CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_AI_TOKEN) {
    throw new Error("Cloudflare Workers AI 配置缺失：请设置 CLOUDFLARE_ACCOUNT_ID 和 CLOUDFLARE_AI_TOKEN");
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/ai/run/${model}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUDFLARE_AI_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloudflare AI 请求失败: ${response.status} ${errorText}`);
  }

  const data = await response.json() as {
    result?: { response?: string };
    success?: boolean;
    errors?: Array<{ message: string }>;
  };

  if (!data.success && data.errors) {
    throw new Error(`Cloudflare AI 错误: ${data.errors.map((e) => e.message).join("; ")}`);
  }

  return data.result?.response || "";
}

export async function generateText(prompt: string, systemPrompt?: string): Promise<string> {
  const messages: ChatMessage[] = [];

  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }

  messages.push({ role: "user", content: prompt });

  return callWorkersAI(TEXT_MODEL, {
    messages,
    max_tokens: 2048,
    temperature: 0.7,
  });
}

export async function generateTechPack(styleName: string, description: string): Promise<string> {
  const promptText = `你是服装工艺专家。根据以下款式信息生成工艺包草稿：

款式名称：${styleName}
描述：${description}

请严格以JSON格式输出，包含以下字段：
{
  "sizeChart": [
    {"size": "S", "chest": "", "waist": "", "hip": "", "length": "", "shoulder": "", "sleeve": ""},
    {"size": "M", "chest": "", "waist": "", "hip": "", "length": "", "shoulder": "", "sleeve": ""},
    {"size": "L", "chest": "", "waist": "", "hip": "", "length": "", "shoulder": "", "sleeve": ""},
    {"size": "XL", "chest": "", "waist": "", "hip": "", "length": "", "shoulder": "", "sleeve": ""}
  ],
  "processNotes": "工艺说明（详细文字）",
  "sewingStandard": "缝制标准（详细文字）",
  "printEmbroidery": [{"type": "印花/绣花", "position": "位置", "description": "描述"}],
  "bomSuggestion": [
    {"materialName": "面料名称", "materialType": "fabric", "specification": "规格", "unitConsumption": 1.5, "unitPrice": 30}
  ]
}

只输出JSON，不要任何其他文字。`;

  return generateText(promptText);
}

export async function analyzeDesignImage(imageBase64: string, mimeType: string): Promise<string> {
  const promptText = "请分析这张服装设计图，输出以下信息：1. 服装类型 2. 主要颜色 3. 设计风格 4. 面料建议 5. 工艺要点。以JSON格式输出。";

  // Workers AI 视觉模型使用 image 参数，要求 number[]（Uint8Array 转 Array）
  const binaryString = atob(imageBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const imageArray = Array.from(bytes);

  return callWorkersAI(VISION_MODEL, {
    prompt: promptText,
    image: imageArray,
  });
}

export { TEXT_MODEL, VISION_MODEL };
