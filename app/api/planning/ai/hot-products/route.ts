import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";
import { generateJsonArray } from "@/lib/ai/json-generation";

export const runtime = "edge";

interface HotProduct {
  id: number;
  name: string;
  category: string;
  price: number;
  salesVolume: number;
  growthRate: string;
  reason: string;
  keywords: string[];
}

const FALLBACK_HOT_PRODUCTS: HotProduct[] = [
  { id: 1, name: "极简羊毛大衣", category: "外套", price: 1299, salesVolume: 15600, growthRate: "+125%", reason: "经典版型+优质面料，符合极简趋势", keywords: ["羊毛", "极简", "大衣"] },
  { id: 2, name: "高腰直筒牛仔裤", category: "裤装", price: 399, salesVolume: 28900, growthRate: "+89%", reason: "舒适版型+百搭属性", keywords: ["牛仔裤", "高腰", "直筒"] },
  { id: 3, name: "真丝衬衫", category: "上衣", price: 599, salesVolume: 12300, growthRate: "+76%", reason: "质感提升+职场需求", keywords: ["真丝", "衬衫", "职场"] },
  { id: 4, name: "针织开衫", category: "外套", price: 359, salesVolume: 21500, growthRate: "+67%", reason: "叠穿潮流+舒适需求", keywords: ["针织", "开衫", "叠穿"] },
  { id: 5, name: "A字半身裙", category: "裙装", price: 299, salesVolume: 18700, growthRate: "+54%", reason: "显瘦版型+百搭", keywords: ["半身裙", "A字", "显瘦"] },
];

export async function POST(request: Request) {
  try {
    const { category, season } = await request.json();

    const hotProducts = await generateJsonArray<HotProduct>({
      prompt: `你是一位服装电商爆款分析专家。请为「${season || "当季"}」「${category || "女装"}」市场生成 5 个潜在爆款。

输出格式要求为 JSON 数组，每个元素包含：
{
  "id": 1,
  "name": "商品名称",
  "category": "品类",
  "price": 299,
  "salesVolume": 15000,
  "growthRate": "+120%",
  "reason": "成为爆款的核心原因",
  "keywords": ["关键词1", "关键词2", "关键词3"]
}`,
      systemPrompt: "你是服装电商数据分析专家，熟悉各品类爆款特征、价格带和关键词。只输出合法 JSON 数组。",
      fallback: FALLBACK_HOT_PRODUCTS,
      onError: (err) => console.warn("爆款识别 AI 生成失败，使用 fallback:", err),
    });

    await supabase.from("planning_ai_results").insert([{
      planning_id: null,
      skill_type: "hot_product_identification",
      skill_name: "爆款识别",
      result: { hotProducts, category, season },
      confidence_score: 88,
    }]);

    return NextResponse.json({ hotProducts, confidence: 88 });
  } catch (err) {
    return NextResponse.json({ error: "爆款识别失败" }, { status: 500 });
  }
}
