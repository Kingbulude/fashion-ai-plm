import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";
import { generateJsonArray } from "@/lib/ai/json-generation";

export const runtime = "edge";

interface FabricRecommendation {
  name: string;
  category: string;
  trendLevel: string;
  price: string;
  description: string;
  properties: { weight: string; width: string; composition: string };
  applications: string[];
}

const FALLBACK_FABRICS: FabricRecommendation[] = [
  { name: "双面羊毛呢", category: "羊毛", trendLevel: "稳定", price: "¥80-120/米", description: "高品质羊毛面料，手感柔软，适合大衣、外套", properties: { weight: "400-500g/m", width: "150cm", composition: "羊毛80% 涤纶20%" }, applications: ["大衣", "外套", "套装"] },
  { name: "弹力牛仔布", category: "牛仔", trendLevel: "稳定", price: "¥25-40/米", description: "高弹力牛仔，舒适贴身，适合裤装、裙装", properties: { weight: "280-320g/m", width: "150cm", composition: "棉90% 氨纶10%" }, applications: ["牛仔裤", "牛仔裙", "牛仔外套"] },
  { name: "真丝缎面", category: "丝绸", trendLevel: "上升", price: "¥150-200/米", description: "高品质真丝面料，光泽度好，适合衬衫、连衣裙", properties: { weight: "16-19mm", width: "140cm", composition: "桑蚕丝100%" }, applications: ["衬衫", "连衣裙", "丝巾"] },
  { name: "针织羊毛", category: "针织", trendLevel: "上升", price: "¥60-90/米", description: "柔软亲肤，保暖性好，适合针织衫、开衫", properties: { weight: "200-250g/m", width: "160cm", composition: "羊毛50% 腈纶50%" }, applications: ["针织衫", "开衫", "毛衣"] },
  { name: "环保再生涤纶", category: "化纤", trendLevel: "上升", price: "¥20-35/米", description: "可持续环保面料，性能优良，适合休闲装", properties: { weight: "150-200g/m", width: "150cm", composition: "再生涤纶100%" }, applications: ["休闲裤", "运动装", "外套"] },
];

export async function POST(request: Request) {
  try {
    const { category, season } = await request.json();

    const fabricRecommendations = await generateJsonArray<FabricRecommendation>({
      prompt: `你是一位服装面料企划专家。请为「${season || "当季"}」「${category || "女装"}」品类推荐 5 种适合的面料。

输出格式要求为 JSON 数组，每个元素包含：
{
  "name": "面料名称",
  "category": "面料分类，如羊毛/丝绸/牛仔/针织/化纤",
  "trendLevel": "上升" | "稳定" | "下降",
  "price": "¥X-Y/米",
  "description": "面料特点和适用场景",
  "properties": { "weight": "克重", "width": "门幅", "composition": "成分" },
  "applications": ["应用1", "应用2"]
}`,
      systemPrompt: "你是服装面料企划专家，熟悉各类面料特性、价格带和季次应用。只输出合法 JSON 数组。",
      fallback: FALLBACK_FABRICS,
      onError: (err) => console.warn("面料分析 AI 生成失败，使用 fallback:", err),
    });

    try {
      await supabase.from("fabric_trends").insert(
        fabricRecommendations.map(f => ({
          fabric_name: f.name,
          category: f.category,
          trend_level: f.trendLevel,
          properties: f.properties,
          application_scenarios: f.applications,
          price_range: f.price,
          ai_analysis: f.description,
        }))
      );
    } catch {}

    await supabase.from("planning_ai_results").insert([{
      planning_id: null,
      skill_type: "fabric_analysis",
      skill_name: "面料分析",
      result: { fabricRecommendations, category, season },
      confidence_score: 82,
    }]);

    return NextResponse.json({ fabricRecommendations, confidence: 82 });
  } catch (err) {
    return NextResponse.json({ error: "面料分析失败" }, { status: 500 });
  }
}
