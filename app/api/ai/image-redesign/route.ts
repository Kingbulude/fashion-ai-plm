import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db/client";
import { generateText } from "@/lib/ai/cloudflare-ai";
import { safeJsonParse } from "@/lib/pipeline/steps";
import { REDESIGN_PRESETS } from "@/lib/ai/redesign-presets";

export const runtime = "edge";

interface RedesignPlan {
  prompt: string;
  styleType: string;
  colors: string[];
  summary: string;
}

// 拉取源资产 + 款式信息
async function getSourceContext(assetId: string | undefined, styleId: string) {
  let sourceAsset: any = null;

  if (assetId) {
    const { data } = await dbAdmin
      .from("design_assets")
      .select("id, file_url, file_name, ai_tags, ai_analysis, type")
      .eq("id", assetId)
      .single();
    sourceAsset = data;
  }

  const { data: style } = await dbAdmin
    .from("styles")
    .select("id, name, style_no, category, season, description, ai_tags, ai_color_palette, brand_id, company_id")
    .eq("id", styleId)
    .single();

  return { sourceAsset, style };
}

// 用 AI 把"原图描述 + 改款指令"转成详细的图像生成 prompt
async function buildRedesignPrompt(params: {
  instruction: string;
  sourceAsset: any;
  style: any;
}): Promise<RedesignPlan> {
  const { instruction, sourceAsset, style } = params;

  const tags = Array.isArray(style?.ai_tags) ? (style.ai_tags as string[]).join("、") : "未指定";
  const palette = Array.isArray(style?.ai_color_palette)
    ? (style.ai_color_palette as string[]).join("、")
    : "未指定";

  const sourceTags = Array.isArray(sourceAsset?.ai_tags)
    ? (sourceAsset.ai_tags as string[]).join("、")
    : "未指定";

  const sourceAnalysis = sourceAsset?.ai_analysis
    ? JSON.stringify(sourceAsset.ai_analysis).slice(0, 400)
    : "无";

  const systemPrompt =
    "你是服装设计 AI 提示词工程师。把用户的改款指令转化为详细的英文图像生成 prompt，" +
    "保留原图核心特征，仅修改用户指定部分。输出严格 JSON，不要其他文字。";

  const userPrompt = `基于以下款式信息，把改款指令扩展为详细的图像生成 prompt。

款式信息：
- 款号：${style?.style_no}
- 名称：${style?.name}
- 品类：${style?.category || "未指定"}
- 季节：${style?.season || "未指定"}
- 描述：${style?.description || "无"}
- AI 标签：${tags}
- AI 色卡：${palette}

源资产信息：
- 文件名：${sourceAsset?.file_name || "无"}
- AI 标签：${sourceTags}
- AI 分析：${sourceAnalysis}

用户改款指令：${instruction}

请输出严格 JSON：
{
  "prompt": "<英文图像生成 prompt，必须包含：服装类型、改款后的版型/颜色/面料/细节、clean studio background, soft natural lighting, high detail, front view>，长度 200-500 字符",
  "styleType": "realistic | illustration | minimal | vintage 之一",
  "colors": ["改款后的主色", "辅色", "点缀色"],
  "summary": "一句话中文总结改款方向"
}`;

  const raw = await generateText(userPrompt, systemPrompt);
  const parsed = safeJsonParse<RedesignPlan>(raw);

  if (!parsed || !parsed.prompt) {
    // 兜底：直接拼接简单 prompt
    return {
      prompt:
        `realistic fashion product photo, ${style?.category || "clothing"} redesigned with ${instruction}, ` +
        `clean studio background, soft natural lighting, high detail, front view`,
      styleType: "realistic",
      colors: [],
      summary: `按指令"${instruction}"改款`,
    };
  }

  return parsed;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { styleId, sourceAssetId, instruction, saveAsAsset = true } = body;

    if (!styleId) {
      return NextResponse.json({ error: "缺少 styleId" }, { status: 400 });
    }
    if (!instruction || typeof instruction !== "string" || instruction.trim().length === 0) {
      return NextResponse.json({ error: "缺少改款指令" }, { status: 400 });
    }

    // 1. 获取款式 + 源资产
    const { sourceAsset, style } = await getSourceContext(sourceAssetId, styleId);
    if (!style) {
      return NextResponse.json({ error: "款式不存在" }, { status: 404 });
    }

    // 2. AI 扩展改款 prompt
    const plan = await buildRedesignPrompt({
      instruction: instruction.trim(),
      sourceAsset,
      style,
    });

    // 3. 调用图像生成接口
    const size = "portrait_4_3";
    const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(
      plan.prompt
    )}&image_size=${size}`;

    // 4. 保存为 AI 衍生资产（design_assets 表）
    let savedAsset: any = null;
    if (saveAsAsset) {
      const fileName = `AI改款_${style.name}_${Date.now()}.png`;
      const { data, error } = await dbAdmin
        .from("design_assets")
        .insert({
          style_id: styleId,
          brand_id: style.brand_id || null,
          company_id: style.company_id || null,
          type: "ai_derivative",
          file_name: fileName,
          file_url: imageUrl,
          thumbnail_url: imageUrl,
          version: 1,
          is_active: false,
          ai_tags: plan.colors || [],
          ai_analysis: {
            redesignInstruction: instruction,
            summary: plan.summary,
            styleType: plan.styleType,
            sourceAssetId: sourceAssetId || null,
            prompt: plan.prompt,
          },
        })
        .select()
        .single();

      if (!error && data) {
        savedAsset = data;
      }
    }

    return NextResponse.json({
      imageUrl,
      summary: plan.summary,
      styleType: plan.styleType,
      colors: plan.colors,
      prompt: plan.prompt,
      asset: savedAsset,
    });
  } catch (err) {
    console.error("[image-redesign] error:", err);
    return NextResponse.json({ error: "AI 改款生成失败" }, { status: 500 });
  }
}

// 暴露预设给前端
export async function GET() {
  return NextResponse.json({ presets: REDESIGN_PRESETS });
}
