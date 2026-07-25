import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db/client";
import { generateText } from "@/lib/ai/cloudflare-ai";
import { safeJsonParse } from "@/lib/pipeline/steps";
import { MARKETING_SCENES, type MarketingScene } from "@/lib/ai/marketing-scenes";

export const runtime = "edge";

interface GenerateRequest {
  styleId: string;
  sceneIds?: string[]; // 不传则生成全部6个
  customInstruction?: string; // 用户的额外指令
  sourceAssetId?: string; // 源设计稿ID
}

interface GeneratedImage {
  sceneId: string;
  sceneLabel: string;
  imageUrl: string;
  prompt: string;
  assetId?: string;
}

// 用 AI 优化每个场景的 prompt（加入款式特征）
async function buildScenePrompt(params: {
  scene: MarketingScene;
  style: any;
  sourceAsset?: any;
  customInstruction?: string;
}): Promise<string> {
  const { scene, style, sourceAsset, customInstruction } = params;

  const tags = Array.isArray(style?.ai_tags) ? (style.ai_tags as string[]).join(", ") : "clothing";
  const palette = Array.isArray(style?.ai_color_palette)
    ? (style.ai_color_palette as string[]).join(", ")
    : "";

  const sourceTags = Array.isArray(sourceAsset?.ai_tags)
    ? (sourceAsset.ai_tags as string[]).join(", ")
    : "";

  // 简单款式 → 直接拼接，不调 AI（节省 token）
  if (!customInstruction && !sourceAsset) {
    const baseParts = [
      scene.promptSuffix,
      style?.category || "clothing",
      style?.name || "",
      palette ? `in ${palette}` : "",
      `style tags: ${tags}`,
    ].filter(Boolean);
    return baseParts.join(", ").slice(0, 800);
  }

  // 复杂场景 → 调 AI 优化 prompt
  const systemPrompt =
    "你是电商视觉设计 AI 提示词工程师。把场景描述和款式信息结合，输出英文图像生成 prompt。" +
    "输出严格 JSON：{\"prompt\": \"<英文 prompt>\"}";

  const userPrompt = `为服装款式生成营销场景图的 prompt。

款式信息：
- 名称：${style?.name}
- 品类：${style?.category || "未指定"}
- 季节：${style?.season || "未指定"}
- 描述：${style?.description || "无"}
- AI 标签：${tags}
- AI 色卡：${palette}

源设计稿标签：${sourceTags}

场景类型：${scene.label}
场景基础描述：${scene.promptSuffix}

用户额外要求：${customInstruction || "无"}

请输出严格 JSON：
{"prompt": "<结合款式特征的详细英文 prompt，包含品类、颜色、面料、场景描述、灯光、构图>，长度 200-500 字符"}`;

  const raw = await generateText(userPrompt, systemPrompt);
  const parsed = safeJsonParse<{ prompt: string }>(raw);

  if (!parsed?.prompt) {
    return `${scene.promptSuffix}, ${style?.category || "clothing"} in ${palette || "neutral colors"}, ${tags}`.slice(0, 800);
  }

  return parsed.prompt.slice(0, 800);
}

async function getSourceAsset(assetId?: string) {
  if (!assetId) return null;
  const { data } = await dbAdmin
    .from("design_assets")
    .select("id, file_url, file_name, ai_tags, ai_analysis")
    .eq("id", assetId)
    .single();
  return data;
}

export async function GET() {
  return NextResponse.json({
    scenes: MARKETING_SCENES.map((s) => ({ id: s.id, label: s.label, size: s.size })),
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GenerateRequest;
    const { styleId, sceneIds, customInstruction, sourceAssetId } = body;

    if (!styleId) {
      return NextResponse.json({ error: "缺少 styleId" }, { status: 400 });
    }

    // 1. 拉取款式
    const { data: style } = await dbAdmin
      .from("styles")
      .select("id, name, style_no, category, season, description, ai_tags, ai_color_palette, brand_id, company_id")
      .eq("id", styleId)
      .single();

    if (!style) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    // 2. 拉取源资产
    const sourceAsset = await getSourceAsset(sourceAssetId);

    // 3. 确定要生成的场景
    const targetScenes = sceneIds && sceneIds.length > 0
      ? MARKETING_SCENES.filter((s) => sceneIds.includes(s.id))
      : MARKETING_SCENES;

    if (targetScenes.length === 0) {
      return NextResponse.json({ error: "未选择有效场景" }, { status: 400 });
    }

    // 4. 为每个场景生成优化后的 prompt
    const promptResults = await Promise.all(
      targetScenes.map(async (scene) => ({
        scene,
        prompt: await buildScenePrompt({ scene, style, sourceAsset, customInstruction }),
      }))
    );

    // 5. 调用图像生成接口 + 保存到 design_assets
    const results: GeneratedImage[] = [];
    for (const { scene, prompt } of promptResults) {
      const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
        prompt
      )}&image_size=${scene.size}`;

      // 保存为设计资产
      const fileName = `AI营销图_${scene.label}_${style.name}_${Date.now()}.png`;
      const { data: savedAsset, error } = await dbAdmin
        .from("design_assets")
        .insert({
          style_id: styleId,
          brand_id: style.brand_id || null,
          company_id: style.company_id || null,
          type: "ai_marketing",
          file_name: fileName,
          file_url: imageUrl,
          thumbnail_url: imageUrl,
          version: 1,
          is_active: false,
          ai_tags: [scene.id, scene.label],
          ai_analysis: {
            sceneId: scene.id,
            sceneLabel: scene.label,
            customInstruction: customInstruction || null,
            sourceAssetId: sourceAssetId || null,
            prompt,
          },
        })
        .select()
        .single();

      results.push({
        sceneId: scene.id,
        sceneLabel: scene.label,
        imageUrl,
        prompt,
        assetId: error ? undefined : savedAsset?.id,
      });
    }

    return NextResponse.json({
      styleId,
      styleName: style.name,
      images: results,
      total: results.length,
    });
  } catch (err) {
    console.error("[marketing-images] error:", err);
    return NextResponse.json({ error: "营销图生成失败" }, { status: 500 });
  }
}
