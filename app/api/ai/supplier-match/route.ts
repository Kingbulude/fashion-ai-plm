import { NextResponse } from "next/server";
import { generateText } from "@/lib/ai/cloudflare-ai";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { validateBody, aiSupplierMatchSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

interface SupplierBrief {
  id: string;
  name: string;
  type: string;
  location: string | null;
  specialties: string[] | null;
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const body = await request.json();
    const validation = validateBody(aiSupplierMatchSchema, body);
    if (!validation.ok) return validation.response;
    const { styleName, category, material, processRequirements, location, budget } = validation.data;

    // 多租户隔离：按 company_id 过滤
    const companyId = tenant.company_id;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    let query = supabase.from("suppliers").select("id, name, type, location, specialties, quality_score, delivery_score, price_level").eq("company_id", companyId);

    const { data: suppliers, error } = await query.limit(100);
    if (error) {
      return NextResponse.json({ error: "获取供应商列表失败" }, { status: 500 });
    }

    const supplierList: SupplierBrief[] = (suppliers || []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      name: s.name as string,
      type: s.type as string,
      location: (s.location as string) || null,
      specialties: (s.specialties as string[]) || null,
    }));

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

    return NextResponse.json({ recommendation: result, suppliers: toCamelCase(suppliers) });
  } catch {
    return NextResponse.json({ error: "供应商匹配失败" }, { status: 500 });
  }
}
