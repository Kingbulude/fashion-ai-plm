import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { category, season } = await request.json();

    const hotProducts = [
      {
        id: 1,
        name: "极简羊毛大衣",
        category: "外套",
        price: 1299,
        salesVolume: 15600,
        growthRate: "+125%",
        reason: "经典版型+优质面料，符合极简趋势",
        keywords: ["羊毛", "极简", "大衣"],
      },
      {
        id: 2,
        name: "高腰直筒牛仔裤",
        category: "裤装",
        price: 399,
        salesVolume: 28900,
        growthRate: "+89%",
        reason: "舒适版型+百搭属性",
        keywords: ["牛仔裤", "高腰", "直筒"],
      },
      {
        id: 3,
        name: "真丝衬衫",
        category: "上衣",
        price: 599,
        salesVolume: 12300,
        growthRate: "+76%",
        reason: "质感提升+职场需求",
        keywords: ["真丝", "衬衫", "职场"],
      },
      {
        id: 4,
        name: "针织开衫",
        category: "外套",
        price: 359,
        salesVolume: 21500,
        growthRate: "+67%",
        reason: "叠穿潮流+舒适需求",
        keywords: ["针织", "开衫", "叠穿"],
      },
      {
        id: 5,
        name: "A字半身裙",
        category: "裙装",
        price: 299,
        salesVolume: 18700,
        growthRate: "+54%",
        reason: "显瘦版型+百搭",
        keywords: ["半身裙", "A字", "显瘦"],
      },
    ];

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