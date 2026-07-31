// DeepSeek Provider 实现
// 统一封装 DeepSeek API 调用，支持多轮对话与 JSON 输出

const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY || "";
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || "deepseek-chat";
const DEEPSEEK_BASE_URL = process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  responseFormat?: "text" | "json_object";
}

export interface GenerateResult {
  content: string;
  usage?: TokenUsage;
  model: string;
}

export async function generateChatCompletion(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  if (!DEEPSEEK_API_KEY) {
    throw new Error("DeepSeek 配置缺失：请设置 DEEPSEEK_API_KEY 环境变量");
  }

  const model = options.model || DEEPSEEK_MODEL;
  const body: Record<string, unknown> = {
    model,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.max_tokens ?? 2048,
  };

  if (options.responseFormat === "json_object") {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(`${DEEPSEEK_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`DeepSeek 请求失败: ${res.status} ${text}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: TokenUsage;
    error?: { message?: string };
  };

  if (data.error?.message) {
    throw new Error(`DeepSeek 错误: ${data.error.message}`);
  }

  const content = data.choices?.[0]?.message?.content || "";
  return { content, usage: data.usage, model };
}
