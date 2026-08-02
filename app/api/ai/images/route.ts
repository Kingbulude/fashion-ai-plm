import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/db/client";
import { validateBody, aiImageCreateSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

function buildImagePrompt(params: {
  styleName: string;
  description?: string;
  styleType?: string;
  colors?: string[];
}): { prompt: string; size: string } {
  const { styleName, description, styleType, colors } = params;

  const typeHint = (() => {
    switch (styleType) {
      case "realistic": return "realistic product photography";
      case "illustration": return "fashion illustration style";
      case "minimal": return "minimalist line art";
      case "vintage": return "vintage fashion editorial";
      default: return "realistic fashion product photo";
    }
  })();

  const colorHint = colors && colors.length > 0 ? ` in color palette ${colors.join(", ")}` : "";
  const descHint = description ? `, ${description}` : "";

  const prompt = `${typeHint}, ${styleName} clothing item, clean studio background, soft natural lighting, high detail, front view${colorHint}${descHint}`;

  return { prompt: prompt.slice(0, 800), size: "square" };
}

export async function GET(request: Request) {
  try {
    const supabase = createServerSupabaseClient(request);
    const { data, error } = await supabase
      .from("ai_images")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: "获取图片失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createServerSupabaseClient(request);
    const body = await request.json();
    const validation = validateBody(aiImageCreateSchema, body);
    if (!validation.ok) return validation.response;
    const { styleName, styleId, description, styleType, colors } = validation.data;

    const { prompt, size } = buildImagePrompt({
      styleName: styleName || "clothing",
      description: description ?? undefined,
      styleType,
      colors: Array.isArray(colors) ? colors : undefined,
    });

    const imageUrl = `https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=${encodeURIComponent(prompt)}&image_size=${size}`;

    const { data, error } = await supabase
      .from("ai_images")
      .insert([{
        style_id: styleId || null,
        style_name: styleName || "未命名",
        description: description || null,
        style_type: styleType || "realistic",
        colors: colors || null,
        image_url: imageUrl,
      }])
      .select();

    if (error) throw error;
    return NextResponse.json(data?.[0] || {}, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "生成图片失败" }, { status: 500 });
  }
}
