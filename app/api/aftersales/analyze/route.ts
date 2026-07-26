import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { toCamelCase } from "@/lib/db/mappers";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { generateJson } from "@/lib/ai/json-generation";
import { createAISuggestion } from "@/lib/ai/suggestion-helper";
import { AIRoleLevel, AISuggestionType, AISuggestionPriority, AISpecialistType } from "@/lib/ai/architecture";

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

const PUSH_TARGETS = {
  design: { label: "设计端", table: "design_feedback_items", specialistType: AISpecialistType.DESIGN_AI },
  production: { label: "生产端", table: "production_feedback_items", specialistType: AISpecialistType.PRODUCTION_AI },
  procurement: { label: "采购端", table: "procurement_feedback_items", specialistType: AISpecialistType.PROCUREMENT_AI },
  quality: { label: "品控端", table: "qc_feedback_items", specialistType: AISpecialistType.QUALITY_AI },
};

interface AICategorizationResult {
  category: string;
  severity: "critical" | "major" | "minor";
  rootCause: string;
  suggestion: string;
  confidence: number;
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { tenant, supabase } = ctx;

    const companyId = tenant.company_id || DEFAULT_COMPANY;
    if (!companyId) {
      return NextResponse.json({ error: "未登录" }, { status: 401 });
    }

    const body = await request.json();
    const { action, styleId, days = 30, recordId, target = "design", items } = body;

    if (action === "analyze") {
      const result = await analyzeDefects(supabase, companyId, styleId, days);
      return NextResponse.json(result);
    }

    if (action === "ai_categorize") {
      const result = await aiCategorizeRecord(supabase, companyId, recordId);
      return NextResponse.json(result);
    }

    if (action === "push_to_target") {
      const result = await pushToTarget(supabase, companyId, target, styleId, items);
      return NextResponse.json(result);
    }

    if (action === "batch_ai_categorize") {
      const result = await batchAICategorize(supabase, companyId, styleId, days);
      return NextResponse.json(result);
    }

    return NextResponse.json({ error: "未知操作" }, { status: 400 });
  } catch (err) {
    console.error("售后分析API错误:", err);
    return NextResponse.json({ error: "分析失败" }, { status: 500 });
  }
}

async function analyzeDefects(supabase: SupabaseClient, companyId: string, styleId?: string, days = 30) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  let query = supabase
    .from("aftersales_records")
    .select("*, styles:style_id(style_no, name, category)")
    .eq("company_id", companyId)
    .gte("created_at", sinceDate.toISOString());

  if (styleId) query = query.eq("style_id", styleId);

  const { data: records, error } = await query;
  if (error) throw error;

  const aftersales = (toCamelCase(records) || []) as any[];

  const categoryStats: Record<string, { count: number; label: string; items: any[]; amount: number }> = {};
  for (const cat of DEFECT_CATEGORIES) {
    categoryStats[cat.key] = { count: 0, label: cat.label, items: [], amount: 0 };
  }

  for (const record of aftersales) {
    const issue = (record.reason || record.issueDescription || "").toLowerCase();
    let matched = false;
    for (const cat of DEFECT_CATEGORIES) {
      if (cat.examples.some((ex) => issue.includes(ex))) {
        categoryStats[cat.key].count++;
        categoryStats[cat.key].items.push(record);
        categoryStats[cat.key].amount += record.amount || 0;
        matched = true;
        break;
      }
    }
    if (!matched && issue) {
      categoryStats.other.count++;
      categoryStats.other.items.push(record);
      categoryStats.other.amount += record.amount || 0;
    }
  }

  const styleStats: Record<string, { styleId: string; styleNo: string; styleName: string; total: number; amount: number; categories: Record<string, number> }> = {};
  for (const record of aftersales) {
    const sid = record.styleId;
    if (!sid) continue;
    if (!styleStats[sid]) {
      styleStats[sid] = {
        styleId: sid,
        styleNo: record.styles?.styleNo || "",
        styleName: record.styles?.name || "",
        total: 0,
        amount: 0,
        categories: {},
      };
    }
    styleStats[sid].total++;
    styleStats[sid].amount += record.amount || 0;
    const issue = (record.reason || record.issueDescription || "").toLowerCase();
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

  const totalAmount = aftersales.reduce((sum: number, r: any) => sum + (r.amount || 0), 0);
  const returnCount = aftersales.filter((r: any) => r.type === "return").length;
  const exchangeCount = aftersales.filter((r: any) => r.type === "exchange").length;
  const complaintCount = aftersales.filter((r: any) => r.type === "complaint").length;

  const pendingCount = aftersales.filter((r: any) => r.status === "pending").length;
  const processingCount = aftersales.filter((r: any) => r.status === "processing").length;
  const resolvedCount = aftersales.filter((r: any) => r.status === "resolved").length;

  return {
    totalRecords: aftersales.length,
    totalAmount,
    periodDays: days,
    categoryStats,
    topStyles: sortedStyles,
    suggestions,
    byType: {
      return: returnCount,
      exchange: exchangeCount,
      complaint: complaintCount,
    },
    byStatus: {
      pending: pendingCount,
      processing: processingCount,
      resolved: resolvedCount,
    },
  };
}

function generateSuggestions(categoryStats: Record<string, { count: number; label: string; items: any[]; amount: number }>) {
  const suggestions: { category: string; label: string; severity: string; suggestion: string; target: string }[] = [];

  for (const [key, data] of Object.entries(categoryStats)) {
    if (data.count === 0) continue;
    let severity = "minor";
    let suggestion = "";
    let target = "design";

    if (data.count >= 10) severity = "critical";
    else if (data.count >= 5) severity = "major";

    switch (key) {
      case "fabric":
        suggestion = `近期发现 ${data.count} 起面料质量问题，建议：1）评估现有面料供应商质量；2）加强入仓前面料抽检；3）考虑更换更优质面料供应商。`;
        target = "procurement";
        break;
      case "workmanship":
        suggestion = `近期发现 ${data.count} 起做工问题，建议：1）加强生产过程中的质检节点；2）与加工厂沟通做工标准；3）提供更详细的工艺指导书。`;
        target = "production";
        break;
      case "size":
        suggestion = `近期发现 ${data.count} 起尺码问题，建议：1）复核版型尺寸表准确性；2）增加试穿验证环节；3）优化尺码推荐说明。`;
        target = "design";
        break;
      case "color":
        suggestion = `近期发现 ${data.count} 起颜色问题，建议：1）加强面料染厂颜色确认；2）拍照时统一光线环境；3）产品详情页增加色差说明。`;
        target = "procurement";
        break;
      case "detail":
        suggestion = `近期发现 ${data.count} 起细节问题，建议：1）加强辅料采购质量检验；2）优化细节部位工艺要求；3）出厂前增加细节检查环节。`;
        target = "quality";
        break;
      case "design":
        suggestion = `近期发现 ${data.count} 起设计相关反馈，建议：1）设计部门复盘版型/款式问题；2）收集用户偏好数据优化设计；3）在下一版设计中改进相关问题。`;
        target = "design";
        break;
      default:
        suggestion = `近期发现 ${data.count} 起其他售后问题，建议分类跟进具体原因。`;
        target = "quality";
    }

    suggestions.push({ category: key, label: data.label, severity, suggestion, target });
  }

  return suggestions.sort((a, b) => {
    const order: Record<string, number> = { critical: 0, major: 1, minor: 2 };
    return order[a.severity] - order[b.severity];
  });
}

async function aiCategorizeRecord(supabase: SupabaseClient, companyId: string, recordId: string) {
  const { data: record, error } = await supabase
    .from("aftersales_records")
    .select("*, styles:style_id(name, style_no, category)")
    .eq("id", recordId)
    .eq("company_id", companyId)
    .single();

  if (error || !record) {
    return { success: false, error: "记录不存在" };
  }

  const recordData = toCamelCase(record) as any;

  const prompt = `你是服装行业售后问题分类专家。请分析以下售后记录，给出专业的分类和改进建议。

售后记录信息：
- 类型：${recordData.type === "return" ? "退货" : recordData.type === "exchange" ? "换货" : "投诉"}
- 原因：${recordData.reason || "未填写"}
- 数量：${recordData.quantity || 1} 件
- 金额：${recordData.amount || 0} 元
- 款式：${recordData.styles?.name || "未知"}
- 处理方案：${recordData.solution || "待处理"}

请按以下分类进行判断：
- fabric（面料问题）：起球、掉色、缩水、起皱等
- workmanship（做工问题）：开线、脱线、不对称、针脚问题等
- size（尺码问题）：偏大、偏小、码不准等
- color（颜色问题）：色差、掉色、褪色等
- detail（细节问题）：拉链、扣子、装饰配件等
- design（设计问题）：版型、款式、显胖显矮等
- other（其他问题）：以上都不属于

请返回JSON格式：
{
  "category": "分类key",
  "severity": "critical/major/minor",
  "rootCause": "根本原因分析（50字以内）",
  "suggestion": "具体改进建议（100字以内）",
  "confidence": 0.95
}`;

  const fallback: AICategorizationResult = {
    category: "other",
    severity: "minor",
    rootCause: "AI分析失败，需人工判断",
    suggestion: "请人工审核该售后记录并分类处理",
    confidence: 0,
  };

  const result = await generateJson<AICategorizationResult>({
    prompt,
    systemPrompt: "你是服装行业售后分析专家，只输出合法JSON，不添加任何额外说明。",
    fallback,
  });

  const categoryInfo = DEFECT_CATEGORIES.find((c) => c.key === result.category);

  await supabase
    .from("aftersales_records")
    .update({
      defect_category: result.category,
      defect_severity: result.severity,
      design_suggestion: result.suggestion,
      ai_categorized: true,
      ai_confidence: result.confidence,
      root_cause: result.rootCause,
    })
    .eq("id", recordId);

  if (result.severity === "critical" || result.severity === "major") {
    await createAISuggestion({
      aiRoleLevel: AIRoleLevel.AI_SPECIALIST,
      specialistType: AISpecialistType.QUALITY_AI,
      type: AISuggestionType.ANALYSIS,
      priority: result.severity === "critical" ? AISuggestionPriority.CRITICAL : AISuggestionPriority.HIGH,
      title: `售后问题预警：${categoryInfo?.label || "售后问题"}`,
      content: `发现${result.severity === "critical" ? "严重" : "重要"}售后问题：${recordData.reason}\n\n根本原因：${result.rootCause}\n\n改进建议：${result.suggestion}\n\n涉及款式：${recordData.styles?.name || "未知"}`,
      targetTable: "aftersales_records",
      targetId: recordId,
    });
  }

  return {
    success: true,
    category: result.category,
    categoryLabel: categoryInfo?.label || "其他问题",
    severity: result.severity,
    rootCause: result.rootCause,
    suggestion: result.suggestion,
    confidence: result.confidence,
  };
}

async function batchAICategorize(supabase: SupabaseClient, companyId: string, styleId?: string, days = 30) {
  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - days);

  let query = supabase
    .from("aftersales_records")
    .select("id")
    .eq("company_id", companyId)
    .is("defect_category", null)
    .gte("created_at", sinceDate.toISOString());

  if (styleId) query = query.eq("style_id", styleId);

  const { data: records, error } = await query.limit(20);
  if (error) throw error;

  const recordIds = (records || []).map((r: any) => r.id);
  let successCount = 0;

  for (const id of recordIds) {
    try {
      const result = await aiCategorizeRecord(supabase, companyId, id);
      if (result.success) successCount++;
    } catch {
      // 跳过失败的
    }
  }

  return {
    success: true,
    total: recordIds.length,
    processed: successCount,
  };
}

async function pushToTarget(
  supabase: SupabaseClient,
  companyId: string,
  target: string,
  styleId?: string,
  items?: any[]
) {
  const targetConfig = (PUSH_TARGETS as any)[target];
  if (!targetConfig) {
    return { success: false, error: "未知推送目标" };
  }

  const itemsToPush = items || [];
  const created: any[] = [];

  for (const item of itemsToPush) {
    const insertData: Record<string, any> = {
      company_id: companyId,
      brand_id: item.brandId || null,
      style_id: item.styleId || styleId,
      feedback_type: "defect",
      defect_category: item.category || null,
      title: item.title || `${item.label || "售后"}反馈`,
      description: item.description || item.suggestion || null,
      severity: item.severity || "minor",
      occurrence_count: item.count || 1,
      related_aftersale_ids: item.recordIds || [],
      status: "pending",
      priority: item.severity === "critical" ? "high" : item.severity === "major" ? "medium" : "low",
      source: "aftersales",
    };

    const { data, error } = await supabase
      .from(targetConfig.table)
      .insert(insertData)
      .select()
      .single();

    if (!error && data) {
      created.push(toCamelCase(data));
    }
  }

  if (created.length > 0) {
    await createAISuggestion({
      aiRoleLevel: AIRoleLevel.AI_SPECIALIST,
      specialistType: targetConfig.specialistType,
      type: AISuggestionType.ANALYSIS,
      priority: AISuggestionPriority.HIGH,
      title: `售后问题已推送至${targetConfig.label}`,
      content: `共推送 ${created.length} 条售后缺陷反馈至${targetConfig.label}，请相关同事及时处理。\n\n推送内容：\n${created.map((c: any, i: number) => `${i + 1}. ${c.title}`).join("\n")}`,
    });
  }

  return {
    success: true,
    target,
    targetLabel: targetConfig.label,
    createdCount: created.length,
    items: created,
  };
}
