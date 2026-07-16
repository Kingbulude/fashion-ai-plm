import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export const runtime = "edge";

export async function GET() {
  try {
    const { data, error } = await supabase.from("brand_dna").select("*").limit(1).single();
    
    if (error) {
      return NextResponse.json({
        brand_name: "StyleForge",
        brand_slogan: "以AI赋能时尚，让设计更精准",
        target_audience: "25-35岁都市职场女性，追求品质与时尚的平衡",
        style_direction: ["极简都市", "轻商务", "休闲舒适"],
        price_position: "中高端",
        color_palette: ["#1a1a2e", "#16213e", "#0f3460", "#e94560", "#ffffff"],
        core_values: ["品质至上", "创新设计", "数据驱动"],
        competitive_advantage: "AI驱动的全链路品牌管理系统，数据驱动决策",
      });
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({
      brand_name: "StyleForge",
      brand_slogan: "以AI赋能时尚，让设计更精准",
      target_audience: "25-35岁都市职场女性",
      style_direction: ["极简都市", "轻商务", "休闲舒适"],
      price_position: "中高端",
      core_values: ["品质至上", "创新设计", "数据驱动"],
    });
  }
}