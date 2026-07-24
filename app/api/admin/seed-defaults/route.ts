import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { RoleLevel } from "@/lib/auth/rbac";

export const runtime = "edge";

// 默认工序角色配置
const defaultProcessRoles = [
  {
    key: "planner",
    name: "企划师",
    description: "负责企划中心的市场洞察、主题企划与产品规划",
    process_node: "planning",
    route_permissions: { "/planning": ["view", "edit"], "/analytics": ["view"] },
  },
  {
    key: "designer",
    name: "设计师",
    description: "负责设计资产、款式设计与面料企划",
    process_node: "design",
    route_permissions: { "/design": ["view", "edit"], "/styles": ["view", "edit"], "/analytics": ["view"] },
  },
  {
    key: "pattern_maker",
    name: "制版师",
    description: "负责款式打样、版型制作与工艺单输出",
    process_node: "sampling",
    route_permissions: { "/styles": ["view", "edit"], "/production": ["view"] },
  },
  {
    key: "modeling_3d",
    name: "服装3D建模师",
    description: "负责3D样衣建模、虚拟试衣与数字样版",
    process_node: "sampling",
    route_permissions: { "/styles": ["view", "edit"], "/design": ["view"] },
  },
  {
    key: "styling_tester",
    name: "测款造型师",
    description: "负责测款环节的款式搭配、造型呈现与反馈收集",
    process_node: "testing",
    route_permissions: { "/ai-review": ["view", "edit"], "/styles": ["view"], "/analytics": ["view"] },
  },
  {
    key: "buyer",
    name: "采购师",
    description: "负责面料/辅料采购、供应商对接与成本核算",
    process_node: "procurement",
    route_permissions: { "/suppliers": ["view", "edit"], "/styles": ["view"], "/production": ["view"] },
  },
  {
    key: "production_merchandiser",
    name: "生产跟单",
    description: "负责生产排期、订单跟进与质量管控",
    process_node: "stocking",
    route_permissions: { "/production": ["view", "edit"], "/styles": ["view"] },
  },
  {
    key: "sales_ops",
    name: "销售运营",
    description: "负责销售数据分析、渠道运营与库存管理",
    process_node: "sales",
    route_permissions: { "/sales": ["view", "edit"], "/analytics": ["view"] },
  },
  {
    key: "aftersales_service",
    name: "售后客服",
    description: "负责售后问题处理、退换货与客户反馈",
    process_node: "aftersales",
    route_permissions: { "/aftersales": ["view", "edit"], "/analytics": ["view"] },
  },
];

// 默认 AI Skill 配置
const defaultAISkills = [
  {
    key: "theme-planner",
    name: "主题企划智能体",
    description: "根据市场趋势和品牌 DNA 生成季节主题与故事板",
    skill_type: "execution",
    process_node: "planning",
    entry_route: "/planning",
  },
  {
    key: "color-planning",
    name: "色彩企划助手",
    description: "结合流行趋势与品牌色盘推荐季度主色与点缀色",
    skill_type: "execution",
    process_node: "planning",
    entry_route: "/planning",
  },
  {
    key: "fabric-analysis",
    name: "面料分析助手",
    description: "分析面料成分、成本与适用场景，推荐替代面料",
    skill_type: "execution",
    process_node: "design",
    entry_route: "/design",
  },
  {
    key: "style-designer",
    name: "款式设计助手",
    description: "基于主题和面料生成款式草图与设计元素建议",
    skill_type: "execution",
    process_node: "design",
    entry_route: "/design",
  },
  {
    key: "sample-review",
    name: "打样评审 AI",
    description: "对打样效果进行工艺、成本和交期多维评审",
    skill_type: "execution",
    process_node: "sampling",
    entry_route: "/styles",
  },
  {
    key: "ai-review",
    name: "AI 审核中心",
    description: "对测款图片、卖点和定价进行 AI 评分与优化建议",
    skill_type: "execution",
    process_node: "testing",
    entry_route: "/ai-review",
  },
  {
    key: "supplier-match",
    name: "供应商匹配 AI",
    description: "根据面料/辅料需求匹配最合适的供应商并比价",
    skill_type: "execution",
    process_node: "procurement",
    entry_route: "/suppliers",
  },
  {
    key: "production-schedule",
    name: "生产排期 AI",
    description: "根据订单量与产能自动生成生产计划与风险预警",
    skill_type: "execution",
    process_node: "stocking",
    entry_route: "/production",
  },
  {
    key: "sales-prediction",
    name: "销售预测 AI",
    description: "基于历史数据与市场热度预测销量与备货建议",
    skill_type: "execution",
    process_node: "sales",
    entry_route: "/analytics",
  },
  {
    key: "aftersales-insight",
    name: "售后洞察 AI",
    description: "分析退换货原因与客户反馈，输出改进建议",
    skill_type: "execution",
    process_node: "aftersales",
    entry_route: "/aftersales",
  },
  {
    key: "personal-assistant",
    name: "个人 AI 秘书",
    description: "为每个角色提供日程、待办与知识问答服务",
    skill_type: "personal_assistant",
    process_node: null,
    entry_route: null,
  },
  {
    key: "process-master",
    name: "工序总管 AI",
    description: "统筹工序进度、资源调度与跨角色协作",
    skill_type: "process_master",
    process_node: null,
    entry_route: null,
  },
];

export async function POST(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 校验权限
    const { data: currentProfile } = await supabase
      .from("profiles")
      .select("role_level, company_id")
      .eq("user_id", session.user.id)
      .single();

    if (
      currentProfile?.role_level !== RoleLevel.BOSS &&
      currentProfile?.role_level !== RoleLevel.ADMIN
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!currentProfile.company_id) {
      return NextResponse.json({ error: "当前用户未绑定公司" }, { status: 400 });
    }

    const companyId = currentProfile.company_id;

    // 查询已有角色，避免重复
    const { data: existingRoles } = await supabase
      .from("process_roles")
      .select("key")
      .eq("company_id", companyId);

    const existingRoleKeys = new Set((existingRoles || []).map((r) => r.key));

    const roleRows = defaultProcessRoles
      .filter((r) => !existingRoleKeys.has(r.key))
      .map((r) => ({
        company_id: companyId,
        key: r.key,
        name: r.name,
        description: r.description,
        process_node: r.process_node,
        route_permissions: r.route_permissions,
        is_active: true,
      }));

    let createdRoles = 0;
    if (roleRows.length > 0) {
      const { error: roleError } = await supabase.from("process_roles").insert(roleRows);
      if (roleError) {
        console.error("Seed process_roles failed:", roleError);
        return NextResponse.json({ error: roleError.message }, { status: 500 });
      }
      createdRoles = roleRows.length;
    }

    // 查询已有 skill，避免重复
    const { data: existingSkills } = await supabase
      .from("ai_skills")
      .select("key")
      .eq("company_id", companyId);

    const existingSkillKeys = new Set((existingSkills || []).map((s) => s.key));

    const skillRows = defaultAISkills
      .filter((s) => !existingSkillKeys.has(s.key))
      .map((s) => ({
        company_id: companyId,
        key: s.key,
        name: s.name,
        description: s.description,
        skill_type: s.skill_type,
        process_node: s.process_node,
        entry_route: s.entry_route,
        is_active: true,
      }));

    let createdSkills = 0;
    if (skillRows.length > 0) {
      const { error: skillError } = await supabase.from("ai_skills").insert(skillRows);
      if (skillError) {
        console.error("Seed ai_skills failed:", skillError);
        return NextResponse.json({ error: skillError.message }, { status: 500 });
      }
      createdSkills = skillRows.length;
    }

    return NextResponse.json({
      success: true,
      createdRoles,
      createdSkills,
      skippedRoles: defaultProcessRoles.length - createdRoles,
      skippedSkills: defaultAISkills.length - createdSkills,
    });
  } catch (error) {
    console.error("Failed to seed defaults:", error);
    return NextResponse.json({ error: "初始化默认配置失败" }, { status: 500 });
  }
}
