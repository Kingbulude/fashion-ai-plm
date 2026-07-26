import { NextResponse } from "next/server";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

const DEFAULT_COMPANY = "00000000-0000-0000-0000-000000000010";

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const styleId = searchParams.get("styleId");
    const isActive = searchParams.get("isActive");
    const search = searchParams.get("search");

    let query = supabase
      .from("design_assets")
      .select(
        "*, styles:style_id(id, name, style_no, category, status, cover_image)"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (type) query = query.eq("type", type);
    if (styleId) query = query.eq("style_id", styleId);
    if (isActive === "true") query = query.eq("is_active", true);

    const { data, error } = await query.limit(200);

    if (error) {
      console.error("获取设计资产失败:", error);
      return NextResponse.json({ error: "获取设计资产失败" }, { status: 500 });
    }

    let assets = (toCamelCase(data) || []) as any[];

    // 客户端搜索过滤
    if (search) {
      const q = search.toLowerCase();
      assets = assets.filter(
        (a) =>
          a.fileName?.toLowerCase().includes(q) ||
          a.styles?.name?.toLowerCase().includes(q) ||
          a.styles?.styleNo?.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({ assets });
  } catch (err) {
    console.error("设计资产API错误:", err);
    return NextResponse.json({ error: "获取设计资产失败" }, { status: 500 });
  }
}
