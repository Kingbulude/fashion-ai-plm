import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const { season, category } = await request.json();

    const trends = [
      {
        trend: "极简主义回归",
        description: "简约线条、中性色调成为主流，消费者追求百搭单品",
        confidence: 92,
        impact: "high",
      },
      {
        trend: "可持续面料",
        description: "环保面料、再生材料需求持续增长，消费者关注环保议题",
        confidence: 88,
        impact: "medium",
      },
      {
        trend: "复古混搭",
        description: "90年代风格回潮，oversize剪裁与现代元素融合",
        confidence: 85,
        impact: "high",
      },
      {
        trend: "功能性设计",
        description: "舒适与功能并重，透气、防皱等功能面料应用增多",
        confidence: 80,
        impact: "medium",
      },
      {
        trend: "数字化印花",
        description: "AI生成图案、数字艺术印花成为新亮点",
        confidence: 78,
        impact: "medium",
      },
    ];

    await supabase.from("planning_ai_results").insert([{
      planning_id: null,
      skill_type: "trend_prediction",
      skill_name: "趋势预测",
      result: { trends, season, category },
      confidence_score: 86,
    }]);

    return NextResponse.json({ trends, confidence: 86 });
  } catch (err) {
    return NextResponse.json({ error: "趋势预测失败" }, { status: 500 });
  }
}