import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { validateBody, inspirationItemCreateSchema } from "@/lib/validation/schemas";

export const runtime = "edge";

const DEFAULT_COMPANY = "00000000-0000-0000-0000-000000000010";

type RouteContext = { params: Promise<{ boardId: string }> };

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { boardId } = await params;

    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const tag = searchParams.get("tag");
    const category = searchParams.get("category");

    let query = supabase
      .from("inspiration_items")
      .select("*")
      .eq("board_id", boardId)
      .eq("company_id", companyId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });

    if (tag) query = query.contains("tags", [tag]);
    if (category) query = query.eq("category", category);

    const { data, error } = await query;
    if (error) throw error;

    const items = (toCamelCase(data) || []) as any[];

    const allTags = new Set<string>();
    const allCategories = new Set<string>();
    for (const item of items) {
      (item.tags || []).forEach((t: string) => allTags.add(t));
      if (item.category) allCategories.add(item.category);
    }

    return NextResponse.json({
      items,
      allTags: [...allTags],
      allCategories: [...allCategories],
    });
  } catch {
    return NextResponse.json({ error: "获取灵感素材失败" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  try {
    const { boardId } = await params;

    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const validation = validateBody(inspirationItemCreateSchema, body);
    if (!validation.ok) return validation.response;
    const { title, description, imageUrl, sourceUrl, sourceType, tags, category, colorTags, styleTags } = validation.data;

    const { data, error } = await supabase
      .from("inspiration_items")
      .insert({
        company_id: companyId,
        board_id: boardId,
        title: title || null,
        description: description || null,
        image_url: imageUrl,
        source_url: sourceUrl || null,
        source_type: sourceType || "upload",
        tags: tags || [],
        category: category || null,
        color_tags: colorTags || [],
        style_tags: styleTags || [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "添加灵感素材失败" }, { status: 500 });
  }
}
