import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { analyzeDesignImage } from "@/lib/ai/cloudflare-ai";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

// 从 AI 返回的文本中解析 JSON
function parseAIResponse(text: string): { tags: string[]; colors: string[]; raw: string } {
  // 尝试从文本中提取 JSON 块
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let parsed: Record<string, unknown> = {};

  if (jsonMatch) {
    try {
      parsed = JSON.parse(jsonMatch[0]);
    } catch {
      // 解析失败则保持空对象
    }
  } else {
    try {
      parsed = JSON.parse(text);
    } catch {
      // 解析失败则保持空对象
    }
  }

  const tags = extractStringArray(parsed, ["tags", "标签", "风格标签", "设计标签", "设计风格"]);
  const colors = extractColors(parsed);

  return { tags, colors, raw: text };
}

function extractStringArray(obj: Record<string, unknown>, keys: string[]): string[] {
  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      const arr = val.filter((v): v is string => typeof v === "string");
      if (arr.length > 0) return arr;
    }
    if (typeof val === "string") {
      const arr = val.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean);
      if (arr.length > 0) return arr;
    }
  }
  return [];
}

function extractColors(obj: Record<string, unknown>): string[] {
  const keys = ["colors", "颜色", "主要颜色", "色彩", "colorPalette", "color_palette"];
  const rawColors: unknown[] = [];

  for (const key of keys) {
    const val = obj[key];
    if (Array.isArray(val)) {
      rawColors.push(...val);
    } else if (typeof val === "string") {
      rawColors.push(...val.split(/[,，、\n]/).map((s) => s.trim()).filter(Boolean));
    }
  }

  // 规范化为 #RRGGBB 格式
  const normalized: string[] = [];
  for (const c of rawColors) {
    if (typeof c !== "string") continue;
    const hex = normalizeHex(c);
    if (hex) normalized.push(hex);
  }
  return normalized;
}

function normalizeHex(input: string): string | null {
  const trimmed = input.trim();
  // 提取 #RRGGBB 或 #RGB
  const match = trimmed.match(/#([0-9a-fA-F]{6})\b/) || trimmed.match(/#([0-9a-fA-F]{3})\b/);
  if (match) {
    const hex = match[1];
    if (hex.length === 3) {
      return `#${hex.split("").map((c) => c + c).join("")}`;
    }
    return `#${hex.toLowerCase()}`;
  }
  // 中文颜色名映射到常见 hex
  const colorNameMap: Record<string, string> = {
    "黑": "#000000", "黑色": "#000000", "白": "#ffffff", "白色": "#ffffff",
    "红": "#e53e3e", "红色": "#e53e3e", "蓝": "#3182ce", "蓝色": "#3182ce",
    "绿": "#38a169", "绿色": "#38a169", "黄": "#d69e2e", "黄色": "#d69e2e",
    "灰": "#718096", "灰色": "#718096", "粉": "#ed64a6", "粉色": "#ed64a6",
    "紫": "#805ad5", "紫色": "#805ad5", "橙": "#dd6b20", "橙色": "#dd6b20",
    "棕": "#8b4513", "棕色": "#8b4513", "卡其": "#f0e68c", "米色": "#f5f5dc",
    "藏青": "#1a2b4a", "藏蓝": "#1a2b4a", "驼色": "#c19a6b",
  };
  for (const [name, hex] of Object.entries(colorNameMap)) {
    if (trimmed.includes(name)) return hex;
  }
  return null;
}

// 将图片二进制转 base64（Edge Runtime 兼容方式）
async function imageUrlToBase64(url: string): Promise<{ base64: string; mimeType: string }> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`获取图片失败: ${response.status}`);
  }
  const blob = await response.blob();
  const mimeType = blob.type || "image/jpeg";

  // 将 Blob 转 base64
  const arrayBuffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  const base64 = btoa(binary);
  return { base64, mimeType };
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const assetId = body.assetId as string | undefined;
    const imageUrl = body.imageUrl as string | undefined;

    let targetUrl = imageUrl;
    let targetAssetId = assetId;

    // 若未传入 imageUrl，则根据 assetId 查询资产
    if (!targetUrl && targetAssetId) {
      const { data: asset, error: assetError } = await supabase
        .from("design_assets")
        .select("id, file_url, type")
        .eq("id", targetAssetId)
        .single();

      if (assetError || !asset) {
        return NextResponse.json({ error: "设计资产不存在" }, { status: 404 });
      }
      targetUrl = asset.file_url;
    } else if (!targetUrl) {
      // 默认取该款式最新的活跃设计稿
      const { data: latestAsset, error: latestError } = await supabase
        .from("design_assets")
        .select("id, file_url, type")
        .eq("style_id", id)
        .eq("type", "design")
        .eq("is_active", true)
        .order("version", { ascending: false })
        .limit(1)
        .single();

      if (latestError || !latestAsset) {
        return NextResponse.json({ error: "未找到可分析的设计稿，请先上传设计稿" }, { status: 404 });
      }
      targetUrl = latestAsset.file_url;
      targetAssetId = latestAsset.id;
    }

    if (!targetUrl) {
      return NextResponse.json({ error: "无法获取图片 URL" }, { status: 400 });
    }

    // 下载图片并转 base64
    const { base64, mimeType } = await imageUrlToBase64(targetUrl);

    // 调用 Cloudflare Workers AI 视觉模型
    const aiResponse = await analyzeDesignImage(base64, mimeType);
    const { tags, colors } = parseAIResponse(aiResponse);

    // 更新 styles 表的 ai_tags 和 ai_color_palette
    const { error: updateError } = await supabase
      .from("styles")
      .update({
        ai_tags: tags.length > 0 ? tags : null,
        ai_color_palette: colors.length > 0 ? colors : null,
        updated_at: new Date(),
      })
      .eq("id", id);

    if (updateError) {
      return NextResponse.json({ error: "保存 AI 分析结果失败" }, { status: 500 });
    }

    // 若有 assetId，将分析结果回写到资产记录
    if (targetAssetId) {
      await supabase
        .from("design_assets")
        .update({
          ai_tags: tags.length > 0 ? tags : null,
          ai_analysis: aiResponse,
        })
        .eq("id", targetAssetId);
    }

    return NextResponse.json({
      success: true,
      tags,
      colors,
      raw: aiResponse,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 分析失败";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
