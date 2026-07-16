import { NextResponse } from "next/server";
import { supabase } from "@/lib/auth/supabase";

export async function GET() {
  try {
    const { data, error } = await supabase
      .from("test_results")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (err) {
    return NextResponse.json({ error: "获取测试结果失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { imageId, targetAudience, testDuration } = body;
    
    const { data: imageData } = await supabase
      .from("ai_images")
      .select("style_name")
      .eq("id", imageId)
      .single();
    
    const { data, error } = await supabase
      .from("test_results")
      .insert([{
        image_id: imageId,
        style_name: imageData?.style_name || "未命名",
        target_audience: targetAudience || null,
        test_duration: testDuration ? Number(testDuration) : 7,
        status: "active",
        feedback_count: 0,
        positive_count: 0,
        negative_count: 0,
      }])
      .select();
    
    if (error) throw error;
    return NextResponse.json(data?.[0] || {}, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "启动测试失败" }, { status: 500 });
  }
}