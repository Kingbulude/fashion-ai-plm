import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";
import { generateJsonArray } from "@/lib/ai/json-generation";

export const runtime = "edge";

interface ColorRecommendation {
  name: string;
  hex: string;
  trendLevel: string;
  usage: string;
  description: string;
  combinations: string[];
}

const FALLBACK_COLORS: ColorRecommendation[] = [
  { name: "静谧蓝", hex: "#7EC8E3", trendLevel: "上升", usage: "主色调", description: "传达平静、专业感，适合职场通勤系列", combinations: ["#ffffff", "#1a1a2e", "#f5f5f5"] },
  { name: "焦糖棕", hex: "#C68E17", trendLevel: "稳定", usage: "辅助色", description: "温暖稳重，适合秋冬系列", combinations: ["#ffffff", "#2d2d2d", "#F5E6D3"] },
  { name: "灰粉色", hex: "#E8D5D5", trendLevel: "上升", usage: "点缀色", description: "柔和浪漫，提升女性化气质", combinations: ["#ffffff", "#4A4A4A", "#FFFBF0"] },
  { name: "墨绿", hex: "#2D5A27", trendLevel: "稳定", usage: "主色调", description: "复古优雅，适合高品质单品", combinations: ["#F5F5F5", "#1a1a2e", "#D4E6C8"] },
  { name: "燕麦色", hex: "#D4C4A8", trendLevel: "上升", usage: "基础色", description: "高级感基础色，百搭易搭配", combinations: ["#ffffff", "#333333", "#E8E0D5"] },
  { name: "酒红", hex: "#8B2635", trendLevel: "稳定", usage: "点缀色", description: "浓郁奢华，适合秋冬重点单品", combinations: ["#ffffff", "#1a1a2e", "#F5E6E8"] },
];

export async function POST(request: Request) {
  try {
    const { season, category, brandColors } = await request.json();

    const colorRecommendations = await generateJsonArray<ColorRecommendation>({
      prompt: `你是一位服装色彩企划专家。请为「${season || "下一季"}」「${category || "女装"}」系列生成 6 个色彩推荐。
${brandColors && brandColors.length > 0 ? `品牌已有色彩参考：${brandColors.join("、")}。` : ""}

输出格式要求为 JSON 数组，每个元素包含：
{
  "name": "颜色名称",
  "hex": "#RRGGBB",
  "trendLevel": "上升" | "稳定" | "下降",
  "usage": "主色调" | "辅助色" | "点缀色" | "基础色",
  "description": "该颜色的风格描述和适用场景",
  "combinations": ["#ffffff", "#1a1a2e", "#f5f5f5"]
}`,
      systemPrompt: "你是服装色彩企划专家，熟悉 Pantone 趋势、品牌色彩搭配和季次色彩规划。只输出合法 JSON 数组。",
      fallback: FALLBACK_COLORS,
      onError: (err) => console.warn("色彩推荐 AI 生成失败，使用 fallback:", err),
    });

    try {
      await supabase.from("color_trends").insert(
        colorRecommendations.map(c => ({
          season: season || "2026AW",
          color_hex: c.hex,
          color_name: c.name,
          trend_level: c.trendLevel,
          usage_scenarios: [c.usage],
          ai_analysis: c.description,
        }))
      );
    } catch {}

    await supabase.from("planning_ai_results").insert([{
      planning_id: null,
      skill_type: "color_recommendation",
      skill_name: "色彩推荐",
      result: { colorRecommendations, season, category },
      confidence_score: 85,
    }]);

    return NextResponse.json({ colorRecommendations, confidence: 85 });
  } catch (err) {
    return NextResponse.json({ error: "色彩推荐失败" }, { status: 500 });
  }
}
