import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { getTenantFromHeaders } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

const DEFAULT_COMPANY = "00000000-0000-0000-0000-000000000010";

const DEFECT_CATEGORIES = [
  { key: "fabric", label: "面料问题", examples: ["起球", "掉色", "缩水", "起皱", "面料", "布料", "质量差"] },
  { key: "workmanship", label: "做工问题", examples: ["开线", "脱线", "歪", "不对称", "做工", "针脚", "线头"] },
  { key: "size", label: "尺码问题", examples: ["偏大", "偏小", "码不准", "尺码", "尺寸", "不合身"] },
  { key: "color", label: "颜色问题", examples: ["色差", "颜色", "掉色", "褪色", "染色"] },
  { key: "detail", label: "细节问题", examples: ["拉链", "扣子", "纽扣", "装饰", "配件", "花边"] },
  { key: "design", label: "设计问题", examples: ["版型", "款式", "设计", "不好看", "显胖", "显矮"] },
  { key: "other", label: "其他问题", examples: ["其他", "别的"] },
];

export async function POST(request: Request) {
  try {
    const tenant = getTenantFromHeaders(request);
    const companyId = tenant?.company_id || DEFAULT_COMPANY;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { action, styleId, days = 30 } = body;

    if (action === "analyze") {
      const result = await analyzeDefects(companyId, styleId, days);
      return NextResponse.json(result);
    }

    if (action === "push_to_design") {
      const result = await pushToDesign(companyId, styleId, body.items);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "分析失败" }, { status: 500 });
  }
}

async function analyzeDefects(companyId: string, styleId?: string, days = 30) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  let query = supabase
    .from("aftersales_records")
    .select("*, styles:style_id(style_no, style_name)")
    .eq("company_id", companyId)
    .gte("created_at", sinceDate.toISOString());

  if (styleId) query = query.eq("style_id", styleId);

  const { data: records, error } = await query;
  if (error) throw error;

  const aftersales = (toCamelCase(records) || []) as any[];

  const categoryStats: Record<string, { count: number; label: string; items: any[] }> = {};
  for (const cat of DEFECT_CATEGORIES) {
    categoryStats[cat.key] = { count: 0, label: cat.label, items: [] };
  }

  for (const record of aftersales) {
    const issue = (record.issueDescription || record.problemDescription || "").toLowerCase();
    let matched = false;
    for (const cat of DEFECT_CATEGORIES) {
      if (cat.examples.some((ex) => issue.includes(ex))) {
        categoryStats[cat.key].count++;
        categoryStats[cat.key].items.push(record);
        matched = true;
        break;
      }
    }
    if (!matched && issue) {
      categoryStats.other.count++;
      categoryStats.other.items.push(record);
    }
  }

  const styleStats: Record<string, { styleId: string; styleNo: string; styleName: string; total: number; categories: Record<string, number> }> = {};
  for (const record of aftersales) {
    const sid = record.styleId;
    if (!sid) continue;
    if (!styleStats[sid]) {
      styleStats[sid] = {
        styleId: sid,
        styleNo: record.styles?.styleNo || "",
        styleName: record.styles?.styleName || "",
        total: 0,
        categories: {},
      };
    }
    styleStats[sid].total++;
    const issue = (record.issueDescription || record.problemDescription || "").toLowerCase();
    for (const cat of DEFECT_CATEGORIES) {
      if (cat.examples.some((ex) => issue.includes(ex))) {
        styleStats[sid].categories[cat.key] = (styleStats[sid].categories[cat.key] || 0) + 1;
        break;
      }
    }
  }

  const sortedStyles = Object.values(styleStats)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  const suggestions = generateSuggestions(categoryStats);

  return {
    totalRecords: aftersales.length,
    periodDays: days,
    categoryStats,
    topStyles: sortedStyles,
    suggestions,
  };
}

function generateSuggestions(categoryStats: Record<string, { count: number; label: string; items: any[] }>) {
  const suggestions: { category: string; label: string; severity: string; suggestion: string }[] = [];

  for (const [key, data] of Object.entries(categoryStats)) {
    if (data.count === 0) continue;
    let severity = "minor";
    let suggestion = "";

    if (data.count >= 10) severity = "critical";
    else if (data.count >= 5) severity = "major";

    switch (key) {
      case "fabric":
        suggestion = `近期发现 ${data.count} 起面料质量问题，建议：1）评估现有面料供应商质量；2）加强入仓前面料抽检；3）考虑更换更优质面料供应商。`;
        break;
      case "workmanship":
        suggestion = `近期发现 ${data.count} 起做工问题，建议：1）加强生产过程中的质检节点；2）与加工厂沟通做工标准；3）提供更详细的工艺指导书。`;
        break;
      case "size":
        suggestion = `近期发现 ${data.count} 起尺码问题，建议：1）复核版型尺寸表准确性；2）增加试穿验证环节；3）优化尺码推荐说明。`;
        break;
      case "color":
        suggestion = `近期发现 ${data.count} 起颜色问题，建议：1）加强面料染厂颜色确认；2）拍照时统一光线环境；3）产品详情页增加色差说明。`;
        break;
      case "detail":
        suggestion = `近期发现 ${data.count} 起细节问题，建议：1）加强辅料采购质量检验；2）优化细节部位工艺要求；3）出厂前增加细节检查环节。`;
        break;
      case "design":
        suggestion = `近期发现 ${data.count} 起设计相关反馈，建议：1）设计部门复盘版型/款式问题；2）收集用户偏好数据优化设计；3）在下一版设计中改进相关问题。`;
        break;
      default:
        suggestion = `近期发现 ${data.count} 起其他售后问题，建议分类跟进具体原因。`;
    }

    suggestions.push({ category: key, label: data.label, severity, suggestion });
  }

  return suggestions.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, major: 1, minor: 2 };
    return order[a.severity] - order[b.severity];
  });
}

async function pushToDesign(companyId: string, styleId?: string, items?: any[]) {
  const itemsToPush = items || [];
  const created: any[] = [];

  for (const item of itemsToPush) {
    const { data, error } = await supabase
      .from("design_feedback_items")
      .insert({
        company_id: companyId,
        style_id: item.styleId || styleId,
        feedback_type: "defect",
        defect_category: item.category || null,
        title: item.title || `${item.label || "售后"}反馈`,
        description: item.description || item.suggestion || null,
        severity: item.severity || "minor",
        priority: item.severity === "critical" ? "high" : item.severity === "major" ? "medium" : "low",
        occurrence_count: item.count || 1,
        status: "pending",
      })
      .select()
      .single();

    if (!error && data) {
      created.push(toCamelCase(data));
    }
  }

  return {
    success: true,
    createdCount: created.length,
    items: created,
  };
}
