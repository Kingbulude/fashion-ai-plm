import { NextResponse } from "next/server";
import { RoleLevel } from "@/lib/auth/rbac";
import { requireApiAuth } from "@/lib/auth/tenant-helpers";
import { getServiceRoleClient, isServiceRoleConfigured } from "@/lib/db/client";

export const runtime = "edge";

const processNodeOptions = [
  "planning",
  "design",
  "sampling",
  "testing",
  "procurement",
  "stocking",
  "sales",
  "aftersales",
  "finance",
];

const defaultRoles = [
  {
    key: "planner",
    name: "企划师",
    description: "负责商品企划、主题企划",
    process_node: "planning",
    route_permissions: { "/planning": ["view", "edit"] },
  },
  {
    key: "designer",
    name: "设计师",
    description: "负责款式设计、图案设计",
    process_node: "design",
    route_permissions: { "/design": ["view", "edit"], "/styles": ["view", "edit"] },
  },
  {
    key: "sampling_master",
    name: "打样师",
    description: "负责样衣制作",
    process_node: "sampling",
    route_permissions: { "/styles": ["view", "edit"] },
  },
  {
    key: "testing_specialist",
    name: "测款师",
    description: "负责市场测试、接受度评估",
    process_node: "testing",
    route_permissions: { "/ai-review": ["view", "edit"], "/styles": ["view"] },
  },
  {
    key: "procurement_specialist",
    name: "采购师",
    description: "负责供应商匹配、采购下单",
    process_node: "procurement",
    route_permissions: { "/suppliers": ["view"], "/styles": ["view", "edit"] },
  },
  {
    key: "production_coordinator",
    name: "生产跟单/QC",
    description: "负责生产排期、QC检查",
    process_node: "stocking",
    route_permissions: { "/production": ["view", "edit"] },
  },
  {
    key: "sales",
    name: "销售",
    description: "负责销售记录、销售预测",
    process_node: "sales",
    route_permissions: { "/sales": ["view", "edit"], "/analytics": ["view"] },
  },
  {
    key: "aftersales",
    name: "售后",
    description: "负责退换货分析",
    process_node: "aftersales",
    route_permissions: { "/aftersales": ["view", "edit"] },
  },
  {
    key: "finance",
    name: "财务",
    description: "负责经营分析、成本核算",
    process_node: "finance",
    route_permissions: { "/analytics": ["view"] },
  },
];

async function resolveAdminCompanyId(request: Request) {
  const ctx = await requireApiAuth(request);
  if ("error" in ctx) {
    return { error: ctx.error };
  }

  const { supabase, user } = ctx;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role_level, company_id, brand_id")
    .eq("user_id", user.id)
    .single();

  if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  let companyId = profile?.company_id;

  // 兼容旧数据：profile.company_id 为空时，从 brand 推导
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
    return { error: NextResponse.json({ error: "当前用户未绑定公司" }, { status: 400 }) };
  }

  // 同步回填 profile.company_id，确保后续 RLS 查询/写入能命中
  if (!profile?.company_id && companyId) {
    await supabase
      .from("profiles")
      .update({ company_id: companyId, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);
  }

  return { session: ctx.user, companyId, supabase };
}

export async function GET(request: Request) {
  try {
    const adminCtx = await resolveAdminCompanyId(request);
    if ("error" in adminCtx) {
      return adminCtx.error;
    }

    const { companyId, supabase } = adminCtx;

    let { data, error } = await supabase
      .from("process_roles")
      .select("*")
      .eq("is_active", true)
      .eq("company_id", companyId)
      .order("name");

    if (error) {
      console.error("[process-roles] GET query error:", error);
      return NextResponse.json({ error: "查询工序角色失败", detail: error.message }, { status: 500 });
    }

    // 如果当前公司没有任何工序角色，自动初始化默认数据
    if (!data || data.length === 0) {
      const upsertPayload = defaultRoles.map((role) => ({
        ...role,
        company_id: companyId,
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      const client = isServiceRoleConfigured ? getServiceRoleClient() : supabase;
      const { error: seedError } = await client
        .from("process_roles")
        .upsert(upsertPayload, { onConflict: "key,company_id" });

      if (seedError) {
        console.warn("[process-roles] seed defaults warning:", seedError);
      } else {
        const { data: seeded } = await supabase
          .from("process_roles")
          .select("*")
          .eq("is_active", true)
          .eq("company_id", companyId)
          .order("name");
        data = seeded || [];
      }
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch process roles:", error);
    return NextResponse.json({ error: "Failed to fetch process roles" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const adminCtx = await resolveAdminCompanyId(request);
    if ("error" in adminCtx) {
      return adminCtx.error;
    }

    const { companyId, supabase } = adminCtx;

    const body = await request.json();
    const { id, key, name, description, process_node, route_permissions } = body;

    if (!key || !name || !process_node) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    if (!processNodeOptions.includes(process_node)) {
      return NextResponse.json({ error: "无效的工序节点" }, { status: 400 });
    }

    const payload = {
      key,
      name,
      description: description || null,
      process_node,
      route_permissions: route_permissions || {},
      company_id: companyId,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabase
        .from("process_roles")
        .update(payload)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();
      if (error) {
        console.error("[process-roles] UPDATE error:", error);
        return NextResponse.json({ error: "更新工序角色失败", detail: error.message }, { status: 500 });
      }
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from("process_roles")
      .upsert(
        {
          ...payload,
          created_at: new Date().toISOString(),
        },
        { onConflict: "key,company_id" }
      )
      .select()
      .single();

    if (error) {
      console.error("[process-roles] UPSERT error:", error);
      return NextResponse.json({ error: "保存工序角色失败", detail: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to save process role:", error);
    return NextResponse.json({ error: "Failed to save process role" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const adminCtx = await resolveAdminCompanyId(request);
    if ("error" in adminCtx) {
      return adminCtx.error;
    }

    const { companyId, supabase } = adminCtx;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少角色ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("process_roles")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      console.error("[process-roles] DELETE error:", error);
      return NextResponse.json({ error: "删除工序角色失败", detail: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete process role:", error);
    return NextResponse.json({ error: "Failed to delete process role" }, { status: 500 });
  }
}
