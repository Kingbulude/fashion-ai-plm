// AI 审核聚合 API
// 跨款式聚合待审核项目（设计稿/BOM/工艺包）

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { getTenantFromHeaders } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const headerTenant = getTenantFromHeaders(request);
    const brandId = url.searchParams.get("brandId") || headerTenant?.brand_id;
    const seasonId = url.searchParams.get("seasonId") || headerTenant?.season_id;

    // 获取品牌款式
    let styleQuery = supabase
      .from("styles")
      .select("id, style_no, name, status, ai_tags, ai_color_palette, target_cost, actual_cost")
      .in("status", ["designed", "sampling", "producing"]);
    if (brandId) styleQuery = styleQuery.eq("brand_id", brandId);
    if (seasonId) styleQuery = styleQuery.eq("season_id", seasonId);

    const { data: styles } = await styleQuery;
    const rawStyles = toCamelCase(styles);
    const styleList: any[] = Array.isArray(rawStyles) ? rawStyles : [];
    const styleIds = styleList.map((s) => s.id);
    const styleMap: Record<string, any> = {};
    for (const s of styleList) styleMap[s.id] = s;

    if (styleIds.length === 0) {
      return NextResponse.json({
        reviewItems: [],
        stats: { design: 0, bom: 0, techpack: 0, urgent: 0, high: 0 },
      });
    }

    // 并行获取各种待审核数据
    const [assetsRes, bomRes, techPacksRes, samplingRes] = await Promise.all([
      supabase.from("style_assets").select("*").in("style_id", styleIds).order("created_at", { ascending: false }),
      supabase.from("bom_items").select("*").in("style_id", styleIds).limit(50),
      supabase.from("tech_packs").select("*").in("style_id", styleIds).limit(20),
      supabase.from("sampling_records").select("*").in("style_id", styleIds).limit(20),
    ]);

    // 审核项生成（自动检测问题）
    const reviewItems: any[] = [];

    // 1. 设计稿审核（检查 AI 标签是否完整）
    const rawAssets = toCamelCase(assetsRes.data);
    const assets: any[] = Array.isArray(rawAssets) ? rawAssets : [];
    const latestDesigns: Record<string, any> = {};
    for (const a of assets) {
      if (a.type === "design" && !latestDesigns[a.styleId]) {
        latestDesigns[a.styleId] = a;
      }
    }

    for (const styleId in latestDesigns) {
      const design = latestDesigns[styleId];
      const style = styleMap[styleId];
      const tags = style?.aiTags || design.aiTags || [];
      const colors = style?.aiColorPalette || design.aiColorPalette || [];

      const issues: string[] = [];
      const suggestions: string[] = [];

      if (!tags || tags.length === 0) {
        issues.push("设计稿未经过 AI 标签分析");
        suggestions.push("点击 AI 分析自动提取风格标签");
      }
      if (!colors || colors.length === 0) {
        issues.push("未提取色彩信息");
        suggestions.push("AI 分析后可获取主色调辅助色彩搭配");
      }
      if (tags && tags.length < 3) {
        issues.push(`标签数量较少（仅 ${tags.length} 个）`);
        suggestions.push("建议补充风格、元素、场景标签");
      }

      if (issues.length > 0) {
        reviewItems.push({
          id: `design-${design.id}`,
          type: "design",
          priority: issues.length > 1 ? "high" : "medium",
          title: `${style?.name || "未知款式"} - 设计稿审核`,
          styleId,
          styleName: style?.name,
          styleNo: style?.styleNo,
          issues,
          suggestions,
          assetId: design.id,
          createdAt: design.createdAt,
        });
      }
    }

    // 2. BOM 成本审核
    const rawBom = toCamelCase(bomRes.data);
    const bomItems: any[] = Array.isArray(rawBom) ? rawBom : [];
    const bomByStyle: Record<string, any[]> = {};
    for (const b of bomItems) {
      if (!bomByStyle[b.styleId]) bomByStyle[b.styleId] = [];
      bomByStyle[b.styleId].push(b);
    }

    for (const styleId in bomByStyle) {
      const items = bomByStyle[styleId];
      const style = styleMap[styleId];
      if (!style) continue;
      const totalCost = items.reduce((s, b) => s + (b.totalPrice || b.total_price || 0), 0);
      const target = style.targetCost || 0;

      if (items.length === 0) continue;

      const issues: string[] = [];
      const suggestions: string[] = [];

      if (target > 0 && totalCost > target * 1.1) {
        issues.push(`BOM 总成本 ¥${totalCost} 超目标 ¥${target} 超过 10%`);
        suggestions.push("检查单价高的物料，寻找替代供应商");
      } else if (target > 0 && totalCost > target) {
        issues.push(`BOM 成本轻微超支（${(((totalCost - target) / target) * 100).toFixed(1)}%）`);
      }

      if (items.length < 3) {
        issues.push(`BOM 物料较少（仅 ${items.length} 项）`);
        suggestions.push("检查是否漏填关键物料");
      }

      // 检查缺失字段
      const missingSupplier = items.filter((b) => !b.supplierId && !b.supplier_id);
      if (missingSupplier.length > 0) {
        issues.push(`${missingSupplier.length} 项物料未指定供应商`);
        suggestions.push("为每项物料指定供应商以便于采购");
      }

      if (issues.length > 0) {
        reviewItems.push({
          id: `bom-${styleId}`,
          type: "bom",
          priority: totalCost > target * 1.1 ? "urgent" : issues.length > 1 ? "high" : "medium",
          title: `${style.name} - BOM 成本审核`,
          styleId,
          styleName: style.name,
          styleNo: style.styleNo,
          issues,
          suggestions,
          totalCost,
          targetCost: target,
          createdAt: new Date().toISOString(),
        });
      }
    }

    // 3. 工艺包审核
    const rawTechPacks = toCamelCase(techPacksRes.data);
    const techPacks: any[] = Array.isArray(rawTechPacks) ? rawTechPacks : [];
    for (const tp of techPacks) {
      const style = styleMap[tp.styleId];
      if (!style) continue;
      const issues: string[] = [];
      const suggestions: string[] = [];

      if (!tp.specs || Object.keys(tp.specs).length === 0) {
        issues.push("工艺参数未填写");
        suggestions.push("完善面料、版型、工艺要求");
      }
      if (!tp.fabricInfo && !tp.fabric_info) {
        issues.push("面料信息缺失");
      }

      if (issues.length > 0) {
        reviewItems.push({
          id: `techpack-${tp.id}`,
          type: "techpack",
          priority: issues.length > 1 ? "high" : "medium",
          title: `${style.name} - 工艺包审核`,
          styleId: tp.styleId,
          styleName: style.name,
          styleNo: style.styleNo,
          issues,
          suggestions,
          createdAt: tp.updatedAt || tp.updated_at,
        });
      }
    }

    // 4. 打样记录审核
    const rawSampling = toCamelCase(samplingRes.data);
    const sampling: any[] = Array.isArray(rawSampling) ? rawSampling : [];
    for (const s of sampling) {
      const style = styleMap[s.styleId];
      if (!style) continue;
      const issues: string[] = [];
      const suggestions: string[] = [];

      if (s.status === "in_progress" && s.startDate) {
        const days = Math.floor((Date.now() - new Date(s.startDate).getTime()) / (1000 * 60 * 60 * 24));
        if (days > 7) {
          issues.push(`打样已进行 ${days} 天，超出常规时长`);
          suggestions.push("跟进加工厂进度，必要时升级或转移");
        }
      }

      if (issues.length > 0) {
        reviewItems.push({
          id: `sampling-${s.id}`,
          type: "sampling",
          priority: issues[0].includes("超出") ? "urgent" : "medium",
          title: `${style.name} - 打样进度审核`,
          styleId: s.styleId,
          styleName: style.name,
          styleNo: style.styleNo,
          issues,
          suggestions,
          createdAt: s.updatedAt || s.updated_at,
        });
      }
    }

    // 排序：urgent > high > medium
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
    reviewItems.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

    // 统计
    const stats = {
      design: reviewItems.filter((r) => r.type === "design").length,
      bom: reviewItems.filter((r) => r.type === "bom").length,
      techpack: reviewItems.filter((r) => r.type === "techpack").length,
      sampling: reviewItems.filter((r) => r.type === "sampling").length,
      urgent: reviewItems.filter((r) => r.priority === "urgent").length,
      high: reviewItems.filter((r) => r.priority === "high").length,
    };

    return NextResponse.json({
      reviewItems,
      stats,
    });
  } catch {
    return NextResponse.json({ error: "获取审核数据失败" }, { status: 500 });
  }
}
