// 统一 AI Provider 选择器
// 根据 AI_PROVIDER 环境变量选择 DeepSeek 或 Cloudflare Workers AI

import { generateChatCompletion as generateDeepseek } from "./providers/deepseek";
import { generateText as generateCloudflare } from "./cloudflare-ai";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GenerateOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  responseFormat?: "text" | "json_object";
}

export interface GenerateResult {
  content: string;
  usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  model: string;
}

export async function generateAIResponse(
  messages: ChatMessage[],
  options: GenerateOptions = {}
): Promise<GenerateResult> {
  const provider = process.env.AI_PROVIDER || "cloudflare";

  if (provider === "deepseek") {
    return generateDeepseek(messages, options);
  }

  // Cloudflare: 只支持单条 prompt + systemPrompt，这里做最小兼容
  const system = messages.find((m) => m.role === "system")?.content;
  const user = messages.filter((m) => m.role !== "system").map((m) => m.content).join("\n\n");
  const content = await generateCloudflare(user, system);
  return { content, model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast" };
}
