// AI 结构化 JSON 生成辅助
// 基于 Cloudflare Workers AI，统一 prompt 管理、JSON 提取与 fallback 兜底

import { generateText } from "./cloudflare-ai";

export interface JsonGenOptions<T> {
  prompt: string;
  systemPrompt?: string;
  fallback: T;
  onError?: (error: unknown) => void;
}

export function extractJsonFromText<T>(text: string): T | null {
  try {
    // 1. 尝试直接解析
    const direct = JSON.parse(text.trim()) as T;
    return direct;
  } catch {
    // 2. 尝试从 markdown code block 提取
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch?.[1]) {
      try {
        return JSON.parse(codeBlockMatch[1].trim()) as T;
      } catch {
        // fallthrough
      }
    }

    // 3. 尝试从文本中定位第一个 { 或 [ 到对应的结束位置
    const firstBrace = text.indexOf("{");
    const firstBracket = text.indexOf("[");
    const start = Math.min(
      firstBrace >= 0 ? firstBrace : Infinity,
      firstBracket >= 0 ? firstBracket : Infinity
    );
    if (start === Infinity) return null;

    // 简单括号匹配
    const openChar = text[start];
    const closeChar = openChar === "{" ? "}" : "]";
    let depth = 0;
    let inString = false;
    let escape = false;
    for (let i = start; i < text.length; i++) {
      const ch = text[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (ch === "\\") {
        escape = true;
        continue;
      }
      if (ch === '"' && !inString) {
        inString = true;
        continue;
      }
      if (ch === '"' && inString) {
        inString = false;
        continue;
      }
      if (inString) continue;
      if (ch === openChar) depth++;
      if (ch === closeChar) {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, i + 1)) as T;
          } catch {
            return null;
          }
        }
      }
    }
    return null;
  }
}

export async function generateJson<T>(options: JsonGenOptions<T>): Promise<T> {
  const { prompt, systemPrompt, fallback, onError } = options;
  try {
    const text = await generateText(
      `${prompt}\n\n请严格以合法 JSON 格式输出，不要包含任何其他解释文字。`,
      systemPrompt || "你是服装行业 AI 助手，只输出合法 JSON，不添加任何额外说明。"
    );
    const parsed = extractJsonFromText<T>(text);
    if (parsed === null) {
      throw new Error("AI 返回内容无法解析为 JSON");
    }
    return parsed;
  } catch (error) {
    onError?.(error);
    return fallback;
  }
}

// 数组类型便捷封装
export async function generateJsonArray<T>(options: Omit<JsonGenOptions<T[]>, "fallback"> & { fallback?: T[] }): Promise<T[]> {
  return generateJson<T[]>({
    ...options,
    fallback: options.fallback ?? [],
  });
}
