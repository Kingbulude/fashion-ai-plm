import { NextResponse } from "next/server";
import { type SupabaseClient } from "@supabase/supabase-js";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";
import { getServiceRoleClient, isServiceRoleConfigured } from "@/lib/db/client";

export const runtime = "edge";

const skillTypeOptions = [
  "personal_assistant",
  "process_master",
  "execution",
];

const processNodeOptions = [
  "planning",
  "design",
  "sampling",
  "testing",
  "procurement",
  "stocking",
  "sales",
  "aftersales",
];

const defaultSkills = [
  {
    key: "theme-planner",
    name: "主题企划助手",
    description: "基于趋势、季节和目标人群生成企划主题与品类方向",
    skill_type: "process_master",
    process_node: "planning",
    entry_route: "/planning",
    config_schema: {
      systemPrompt: "你是服装品牌企划专家。请基于品牌定位、目标人群、季节和当前趋势，生成主题方向、核心品类、色彩/面料/廓形建议，并说明理由。输出结构化的企划草案。",
    },
  },
  {
    key: "trend-researcher",
    name: "市场趋势分析",
    description: "分析时尚趋势、竞品动态，为企划提供数据参考",
    skill_type: "execution",
    process_node: "planning",
    entry_route: "/planning",
    config_schema: {
      systemPrompt: "你是时尚趋势分析师。请基于用户提供的品类、季节、目标人群，分析市场趋势、流行元素、竞品动向，并给出可落地的企划建议。输出结构化的趋势报告。",
    },
  },
  {
    key: "style-derivative",
    name: "款式衍生助手",
    description: "根据参考图或描述生成多个款式设计方向",
    skill_type: "execution",
    process_node: "design",
    entry_route: "/styles",
    config_schema: {
      systemPrompt: "你是服装设计师。请基于用户提供的参考图、主题、品类和季节，生成 3-5 个款式方向，每个方向包含名称、设计要点、面料建议、适用场景。输出结构化 JSON。",
    },
  },
  {
    key: "bom-assistant",
    name: "BOM 物料助手",
    description: "根据款式信息生成面料、辅料、包装等 BOM 建议",
    skill_type: "execution",
    process_node: "design",
    entry_route: "/styles",
    config_schema: {
      systemPrompt: "你是服装工艺与采购专家。请根据款式描述、目标成本和季节，生成 BOM（物料清单）初稿，包括面料、辅料、包装、预计用量和参考单价，并给出优化建议。输出结构化 JSON。",
    },
  },
  {
    key: "sampling-risk",
    name: "打样风险预警",
    description: "评估打样难度、周期和潜在风险",
    skill_type: "execution",
    process_node: "sampling",
    entry_route: "/styles",
    config_schema: {
      systemPrompt: "你是服装打样与工艺专家。请根据款式信息、面料和工艺复杂度，评估打样周期、关键风险点、需要特别关注的工艺环节，并给出降低风险的建议。输出结构化报告。",
    },
  },
  {
    key: "supplier-matcher",
    name: "供应商匹配",
    description: "根据 BOM 和交期要求推荐合适供应商",
    skill_type: "execution",
    process_node: "procurement",
    entry_route: "/suppliers",
    config_schema: {
      systemPrompt: "你是服装供应链专家。请根据 BOM、目标交期、质量要求和预算，从供应商池中推荐最合适的供应商，并说明推荐理由、潜在风险和备选方案。输出结构化建议。",
    },
  },
  {
    key: "production-scheduler",
    name: "生产排期助手",
    description: "基于订单、产能和物料情况生成排期建议",
    skill_type: "execution",
    process_node: "stocking",
    entry_route: "/production",
    config_schema: {
      systemPrompt: "你是服装生产计划专家。请根据订单量、工厂产能、物料到位情况和目标出货日期，生成生产排期建议，标出关键节点、产能瓶颈和风险预警。输出结构化排期表。",
    },
  },
  {
    key: "sales-forecast",
    name: "销售预测",
    description: "基于历史数据预测销量并给出补货建议",
    skill_type: "execution",
    process_node: "sales",
    entry_route: "/sales",
    config_schema: {
      systemPrompt: "你是服装销售与商品分析专家。请基于历史销售数据、库存、季节、渠道和促销计划，预测未来销量，识别热销/滞销款，并给出补货、调拨或促销建议。输出结构化报告。",
    },
  },
  {
    key: "inventory-activation",
    name: "库存盘活",
    description: "识别滞销款并生成促销、返单或下架建议",
    skill_type: "execution",
    process_node: "sales",
    entry_route: "/sales",
    config_schema: {
      systemPrompt: "你是库存与商品运营专家。请根据库存天数、售罄率、销售趋势和退货率，识别滞销款，并为每款生成促销、返单、调拨或下架建议，评估预期效果。输出结构化方案。",
    },
  },
  {
    key: "return-analyst",
    name: "退货归因分析",
    description: "分析售后退货原因并反馈给设计和企划",
    skill_type: "execution",
    process_node: "aftersales",
    entry_route: "/aftersales",
    config_schema: {
      systemPrompt: "你是售后与品质分析专家。请根据退货记录、原因分类和款式维度，分析退货根因（尺码、版型、面料、色差、质量等），并将结论反馈给设计和企划，输出结构化改进建议。",
    },
  },
  {
    key: "design-assistant",
    name: "设计主管 AI 秘书",
    description: "为设计主管提供跨工序的辅助决策和提醒",
    skill_type: "personal_assistant",
    process_node: null,
    entry_route: "/dashboard",
    config_schema: {
      systemPrompt: "你是服装设计主管的智能秘书。帮助用户快速查看设计进度、打样风险、款式反馈，并协助生成决策摘要和待办事项。",
    },
  },
  {
    key: "product-assistant",
    name: "产品主管 AI 秘书",
    description: "为产品主管提供打样、采购、生产环节的辅助",
    skill_type: "personal_assistant",
    process_node: null,
    entry_route: "/dashboard",
    config_schema: {
      systemPrompt: "你是服装产品主管的智能秘书。帮助用户跟踪打样、采购、生产进度，识别延期风险和物料异常，并生成每日工作摘要。",
    },
  },
  {
    key: "operations-assistant",
    name: "运营主管 AI 秘书",
    description: "为运营主管提供销售、测款、售后环节的辅助",
    skill_type: "personal_assistant",
    process_node: null,
    entry_route: "/dashboard",
    config_schema: {
      systemPrompt: "你是服装运营主管的智能秘书。帮助用户查看销售数据、测款结果、售后反馈，生成日报和需要立即跟进的异常提醒。",
    },
  },
  {
    key: "cross-process-summary",
    name: "全链路健康度分析",
    description: "跨工序汇总当季开发、生产、销售和售后表现",
    skill_type: "process_master",
    process_node: null,
    entry_route: "/dashboard",
    config_schema: {
      systemPrompt: "你是服装品牌运营顾问。请基于当季企划、款式、生产、销售和售后数据，生成全链路健康度报告，指出关键风险、机会点和改进建议。输出结构化报告。",
    },
  },
  {
    key: "brand-dna-analyst",
    name: "品牌基因分析师",
    description: "梳理品牌使命、目标客群、风格方向、视觉识别等品牌核心基因",
    skill_type: "execution",
    process_node: "planning",
    entry_route: "/planning",
    config_schema: {
      systemPrompt: "你是品牌战略顾问。请通过对话引导用户梳理品牌基因，包括品牌使命、目标客群、年龄范围、风格方向、定价定位、核心价值、视觉识别、色彩体系、品牌故事、竞争优势等维度。根据用户提供的信息给出结构化整理和优化建议。",
    },
  },
];

async function requireAdmin(request: Request, supabase: SupabaseClient) {
  const session = await getSession(request as any);
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_level, company_id, brand_id")
    .eq("user_id", session.user.id)
    .single();

  if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
    return { error: "Forbidden", status: 403 };
  }

  let companyId = profile?.company_id;

  // 兼容旧数据：company_id 为空时从 brand 推导
  if (!companyId && profile?.brand_id) {
    const { data: brand } = await supabase
      .from("brands")
      .select("company_id")
      .eq("id", profile.brand_id)
      .single();
    if (brand?.company_id) {
      companyId = brand.company_id;
    }
  }

  if (!companyId) {
    return { error: "当前用户未绑定公司", status: 400 };
  }

  return { session, companyId };
}

// 获取当前用户的 company_id（用于普通用户的列表查询），支持从 brand 推导
async function getCompanyId(request: Request, supabase: SupabaseClient) {
  const session = await getSession(request as any);
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 } as const;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id, brand_id")
    .eq("user_id", session.user.id)
    .single();

  let companyId = profile?.company_id;

  if (!companyId && profile?.brand_id) {
    const { data: brand } = await supabase
      .from("brands")
      .select("company_id")
      .eq("id", profile.brand_id)
      .single();
    if (brand?.company_id) {
      companyId = brand.company_id;
    }
  }

  if (!companyId) {
    return { error: "当前用户未绑定公司", status: 400 } as const;
  }

  return { companyId } as const;
}

// 手动 upsert：避免依赖特定唯一约束，兼容旧全局唯一约束和新的 (key, company_id) 约束
async function upsertSkill(
  client: SupabaseClient,
  payload: any
): Promise<{ data?: any; error?: any }> {
  const { key, company_id } = payload;

  // 1. 先按 key + company_id 查询是否存在
  const { data: existing, error: findError } = await client
    .from("ai_skills")
    .select("id")
    .eq("key", key)
    .eq("company_id", company_id)
    .maybeSingle();

  if (findError) {
    console.error("[ai-skills] upsert find error:", findError);
    return { error: findError };
  }

  // 2. 存在则更新，不存在则插入
  if (existing?.id) {
    const { data, error } = await client
      .from("ai_skills")
      .update(payload)
      .eq("id", existing.id)
      .select()
      .single();
    return { data, error };
  }

  const { data, error } = await client
    .from("ai_skills")
    .insert({ ...payload, created_at: new Date().toISOString() })
    .select()
    .single();
  return { data, error };
}

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const companyCheck = await getCompanyId(request, supabase);
    if ("error" in companyCheck) {
      return NextResponse.json({ error: companyCheck.error }, { status: companyCheck.status });
    }

    const { companyId } = companyCheck;

    let { data, error: queryError } = await supabase
      .from("ai_skills")
      .select("*")
      .eq("is_active", true)
      .eq("company_id", companyId)
      .order("name");

    if (queryError) {
      console.error("[ai-skills] GET query error:", queryError);
      return NextResponse.json({ error: "查询 AI Skill 失败", detail: queryError.message }, { status: 500 });
    }

    // 如果当前公司没有任何 AI Skill，自动初始化默认数据
    if (!data || data.length === 0) {
      console.log("[ai-skills] no skills found for company", companyId, "seeding defaults...");

      // 优先使用 service role 绕过 RLS/唯一约束；未配置时降级到 RLS 客户端
      const client = isServiceRoleConfigured ? getServiceRoleClient() : supabase;
      const seededIds: string[] = [];
      const seedErrors: any[] = [];

      for (const skill of defaultSkills) {
        const payload = {
          ...skill,
          company_id: companyId,
          is_active: true,
          updated_at: new Date().toISOString(),
        };

        const { data: upserted, error: upsertError } = await upsertSkill(client, payload);
        if (upsertError) {
          console.error(`[ai-skills] failed to seed skill ${skill.key}:`, upsertError);
          seedErrors.push({ key: skill.key, message: upsertError.message });
        } else if (upserted?.id) {
          seededIds.push(upserted.id);
        }
      }

      if (seedErrors.length > 0) {
        console.error("[ai-skills] seed errors:", seedErrors);
      }

      if (seededIds.length > 0) {
        const { data: seeded, error: seededError } = await supabase
          .from("ai_skills")
          .select("*")
          .eq("is_active", true)
          .eq("company_id", companyId)
          .order("name");

        if (seededError) {
          console.error("[ai-skills] refetch after seed error:", seededError);
        } else {
          data = seeded || [];
        }
      }
    }

    const skills = data || [];
    if (skills.length === 0) {
      return NextResponse.json([]);
    }

    const skillIds = skills.map((s: any) => s.id);

    const [{ data: roleRelations }, { data: scopeRelations }] = await Promise.all([
      supabase.from("process_role_ai_skills").select("ai_skill_id, process_role_id").in("ai_skill_id", skillIds),
      supabase.from("process_owner_scope_ai_skills").select("ai_skill_id, scope_id").in("ai_skill_id", skillIds),
    ]);

    const roleMap: Record<string, string[]> = {};
    (roleRelations || []).forEach((r: any) => {
      if (!roleMap[r.ai_skill_id]) roleMap[r.ai_skill_id] = [];
      roleMap[r.ai_skill_id].push(r.process_role_id);
    });

    const scopeMap: Record<string, string[]> = {};
    (scopeRelations || []).forEach((r: any) => {
      if (!scopeMap[r.ai_skill_id]) scopeMap[r.ai_skill_id] = [];
      scopeMap[r.ai_skill_id].push(r.scope_id);
    });

    return NextResponse.json(
      skills.map((s: any) => ({
        ...s,
        processRoleIds: roleMap[s.id] || [],
        scopeIds: scopeMap[s.id] || [],
      }))
    );
  } catch (error) {
    console.error("Failed to fetch ai skills:", error);
    return NextResponse.json({ error: "Failed to fetch ai skills" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const adminCheck = await requireAdmin(request, supabase);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { companyId } = adminCheck;

    const body = await request.json();
    const { id, key, name, description, skill_type, process_node, config_schema, entry_route, processRoleIds, scopeIds } = body;

    if (!key || !name || !skillTypeOptions.includes(skill_type)) {
      return NextResponse.json({ error: "缺少必填字段或 skill_type 不合法" }, { status: 400 });
    }

    if (process_node && !processNodeOptions.includes(process_node)) {
      return NextResponse.json({ error: "process_node 不合法" }, { status: 400 });
    }

    const payload = {
      key,
      name,
      description: description || null,
      skill_type,
      process_node: process_node || null,
      config_schema: config_schema || null,
      entry_route: entry_route || null,
      company_id: companyId,
      updated_at: new Date().toISOString(),
    };

    // 统一使用 service role 处理核心写入；未配置时降级到 RLS 客户端
    const adminClient = isServiceRoleConfigured ? getServiceRoleClient() : supabase;

    let skillId: string;
    let skillData: any;

    if (id) {
      // 按 ID 更新
      const { data, error } = await adminClient
        .from("ai_skills")
        .update(payload)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();
      if (error) {
        console.error("[ai-skills] update error:", error);
        throw error;
      }
      skillId = data.id;
      skillData = data;
    } else {
      // 手动 upsert：先查后写，避免依赖唯一约束
      const { data, error } = await upsertSkill(adminClient, payload);
      if (error) {
        console.error("[ai-skills] insert/upsert error:", error);
        throw error;
      }
      skillId = data.id;
      skillData = data;
    }

    // 更新与工序角色的关联
    const validProcessRoleIds = (processRoleIds || []).filter((pid: string) => typeof pid === "string" && pid.length > 0);
    await adminClient.from("process_role_ai_skills").delete().eq("ai_skill_id", skillId);
    if (validProcessRoleIds.length > 0) {
      const roleInsert = validProcessRoleIds.map((processRoleId: string) => ({
        ai_skill_id: skillId,
        process_role_id: processRoleId,
      }));
      const { error: roleError } = await adminClient.from("process_role_ai_skills").insert(roleInsert);
      if (roleError) {
        console.error("[ai-skills] role relation error:", roleError);
        throw roleError;
      }
    }

    // 更新与主管类型的关联
    const validScopeIds = (scopeIds || []).filter((sid: string) => typeof sid === "string" && sid.length > 0);
    await adminClient.from("process_owner_scope_ai_skills").delete().eq("ai_skill_id", skillId);
    if (validScopeIds.length > 0) {
      const scopeInsert = validScopeIds.map((scopeId: string) => ({
        ai_skill_id: skillId,
        scope_id: scopeId,
      }));
      const { error: scopeError } = await adminClient.from("process_owner_scope_ai_skills").insert(scopeInsert);
      if (scopeError) {
        console.error("[ai-skills] scope relation error:", scopeError);
        throw scopeError;
      }
    }

    return NextResponse.json({
      ...skillData,
      processRoleIds: validProcessRoleIds,
      scopeIds: validScopeIds,
    });
  } catch (error: any) {
    console.error("Failed to save ai skill:", error);
    const detail = error?.message || error?.details || "未知错误";
    return NextResponse.json({ error: "Failed to save ai skill", detail }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;
    const { supabase } = ctx;

    const adminCheck = await requireAdmin(request, supabase);
    if ("error" in adminCheck) {
      return NextResponse.json({ error: adminCheck.error }, { status: adminCheck.status });
    }

    const { companyId } = adminCheck;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少 AI Skill ID" }, { status: 400 });
    }

    const adminClient = isServiceRoleConfigured ? getServiceRoleClient() : supabase;

    const { error } = await adminClient
      .from("ai_skills")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete ai skill:", error);
    const detail = error?.message || error?.details || "未知错误";
    return NextResponse.json({ error: "Failed to delete ai skill", detail }, { status: 500 });
  }
}
