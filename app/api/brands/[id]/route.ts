// 品牌详情 API
// 包含基本信息 + 品牌 DNA + 款式统计

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;

    // 1. 品牌基本信息
    const { data: brandData, error: brandErr } = await supabase
      .from("brands")
      .select("*")
      .eq("id", id)
      .single();

    if (brandErr || !brandData) {
      return NextResponse.json({ error: "品牌不存在" }, { status: 404 });
    }

    // 2. 品牌 DNA
    const { data: dnaData } = await supabase
      .from("brand_dna")
      .select("*")
      .eq("brand_id", id)
      .maybeSingle();

    // 3. 季节列表
    const { data: seasonsData } = await supabase
      .from("seasons")
      .select("*")
      .eq("brand_id", id)
      .order("year", { ascending: false });

    // 4. 款式统计
    const { data: stylesData } = await supabase
      .from("styles")
      .select("id, status, season_id")
      .eq("brand_id", id);

    const rawStyles = toCamelCase(stylesData);
    const styles: any[] = Array.isArray(rawStyles) ? rawStyles : [];

    // 按状态统计
    const stageStats: Record<string, number> = {};
    for (const s of styles) {
      const st = s.status || "planning";
      stageStats[st] = (stageStats[st] || 0) + 1;
    }

    // 按季节统计
    const seasonStyles: Record<string, number> = {};
    for (const s of styles) {
      if (s.seasonId) {
        seasonStyles[s.seasonId] = (seasonStyles[s.seasonId] || 0) + 1;
      }
    }

    return NextResponse.json({
      brand: toCamelCase(brandData),
      dna: dnaData ? toCamelCase(dnaData) : null,
      seasons: Array.isArray(toCamelCase(seasonsData)) ? toCamelCase(seasonsData) : [],
      stats: {
        totalStyles: styles.length,
        stageStats,
        seasonStyles,
      },
    });
  } catch {
    return NextResponse.json({ error: "获取品牌详情失败" }, { status: 500 });
  }
}
