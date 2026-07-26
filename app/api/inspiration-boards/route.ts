import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

const DEFAULT_COMPANY = "00000000-0000-0000-0000-000000000010";
const DEFAULT_BRAND = "00000000-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;
    const brandId = tenant.brand_id || DEFAULT_BRAND;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const filterBrandId = searchParams.get("brandId");
    const seasonId = searchParams.get("seasonId");

    let query = supabase
      .from("inspiration_boards")
      .select("*")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (filterBrandId) query = query.eq("brand_id", filterBrandId);
    if (seasonId) query = query.eq("season_id", seasonId);

    const { data, error } = await query;
    if (error) throw error;

    const boards = (toCamelCase(data) || []) as any[];

    const boardIds = boards.map((b: any) => b.id);
    let itemCounts: Record<string, number> = {};

    if (boardIds.length > 0) {
      const { data: items } = await supabase
        .from("inspiration_items")
        .select("board_id")
        .in("board_id", boardIds);

      if (items) {
        for (const item of items) {
          const bid = (item as any).board_id;
          itemCounts[bid] = (itemCounts[bid] || 0) + 1;
        }
      }
    }

    const result = boards.map((b: any) => ({
      ...b,
      itemCount: itemCounts[b.id] || 0,
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "获取灵感白板失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;
    const brandId = tenant.brand_id || DEFAULT_BRAND;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { title, description, brandId: bodyBrandId, seasonId, themeTags, coverImageUrl } = body;

    if (!title?.trim()) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("inspiration_boards")
      .insert({
        company_id: companyId,
        brand_id: bodyBrandId || brandId || null,
        season_id: seasonId || null,
        title: title.trim(),
        description: description || null,
        theme_tags: themeTags || [],
        cover_image_url: coverImageUrl || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建灵感白板失败" }, { status: 500 });
  }
}
