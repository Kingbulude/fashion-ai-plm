import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { generateText } from "@/lib/ai/cloudflare-ai";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { styleName, category, material, processRequirements, location, budget } = body;

    const { data: suppliers, error } = await supabase.from("suppliers").select("*");
    if (error) {
      return NextResponse.json({ error: "获取供应商列表失败" }, { status: 500 });
    }

    const supplierList = suppliers?.map((s: any) => ({
      id: s.id,
      name: s.name,
      type: s.type,
      location: s.location,
      specialties: s.specialties,
    })) || [];

    const prompt = `你是一位资深的服装供应链专家。请根据以下款式需求，从供应商列表中智能匹配最合适的供应商：

款式名称：${styleName}
品类：${category}
面料：${material}
工艺要求：${processRequirements}
期望产地：${location}
预算：${budget}

供应商列表：
${JSON.stringify(supplierList)}

请根据匹配度从高到低排序，推荐3家最合适的供应商，并说明推荐理由。

请用简洁清晰的格式输出，不要使用markdown。`;

    const result = await generateText(prompt);

    return NextResponse.json({ recommendation: result, suppliers: toCamelCase(supplierList) });
  } catch {
    return NextResponse.json({ error: "供应商匹配失败" }, { status: 500 });
  }
}
