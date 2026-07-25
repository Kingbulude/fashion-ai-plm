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

export interface BomSuggestionItem {
  materialName: string;
  materialType: "fabric" | "accessory" | "packaging";
  specification: string;
  unitConsumption: number;
  lossRate: number;
  unitPrice: number;
}

export async function generateBom(
  styleName: string,
  description: string,
  category: string | null,
  targetCost: number | null
): Promise<string> {
  const targetCostHint = targetCost ? `目标成本：${targetCost}元（请尽量控制在此范围内）` : "目标成本：未指定";
  const promptText = `你是服装供应链专家。请根据以下款式信息生成完整的 BOM 物料清单草稿。

款式名称：${styleName}
品类：${category || "未指定"}
描述：${description || "无"}
${targetCostHint}

请严格以JSON格式输出，包含以下字段：
{
  "items": [
    {
      "materialName": "面料名称（中文）",
      "materialType": "fabric",
      "specification": "规格（如 180g/m²）",
      "unitConsumption": 1.5,
      "lossRate": 0.05,
      "unitPrice": 30,
      "reason": "选择该物料的理由（简短）"
    }
  ],
  "totalEstimatedCost": 85.5,
  "summary": "BOM 整体说明（1-2句话）"
}

要求：
1. items 至少包含 3 项物料（1 个面料 + 1 个辅料 + 1 个包装）
2. materialType 必须是 fabric / accessory / packaging 之一
3. unitConsumption 单位为米或个
4. lossRate 为小数（5% 填 0.05）
5. unitPrice 单位为元
6. 只输出 JSON，不要任何其他文字。`;

  return generateText(promptText);
}

export interface CostEstimate {
  estimatedCost: number;
  costRange: { low: number; high: number };
  breakdown: { fabricCost: number; accessoryCost: number; packagingCost: number; laborCost: number; overheadCost: number };
  suggestions: string[];
}

export async function estimateStyleCost(
  styleName: string,
  category: string | null,
  description: string | null,
  designFeatures: string | null,
  targetAudience: string | null
): Promise<string> {
  const promptText = `你是服装成本核算专家。请根据以下款式信息估算生产成本。

款式名称：${styleName}
品类：${category || "未指定"}
描述：${description || "无"}
设计特点：${designFeatures || "无"}
目标人群：${targetAudience || "大众"}

请基于行业平均水平估算成本，严格以JSON格式输出：
{
  "estimatedCost": 85.5,
  "costRange": {"low": 70, "high": 100},
  "breakdown": {
    "fabricCost": 40,
    "accessoryCost": 8,
    "packagingCost": 5,
    "laborCost": 20,
    "overheadCost": 12.5
  },
  "suggestions": [
    "建议 1：使用 XX 面料可降低成本 X 元",
    "建议 2：简化 XX 工艺可降低成本 X 元"
  ]
}

要求：
1. 估算基于行业平均水平，单位为元（人民币）
2. suggestions 至少 2 条降本建议
3. 只输出 JSON，不要任何其他文字。`;

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
