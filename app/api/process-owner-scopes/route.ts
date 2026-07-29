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
];

const defaultScopes = [
  {
    key: "design_lead",
    name: "设计主管",
    description: "从企划到打样完成",
    process_nodes: ["planning", "design", "sampling"],
  },
  {
    key: "product_lead",
    name: "产品主管",
    description: "从打样到大货生产前",
    process_nodes: ["sampling", "testing", "procurement", "stocking"],
  },
  {
    key: "operations_lead",
    name: "运营主管",
    description: "从测款到销售",
    process_nodes: ["testing", "sales"],
  },
  {
    key: "aftersales_lead",
    name: "售后主管",
    description: "售后问题处理",
    process_nodes: ["aftersales"],
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
      .from("process_owner_scopes")
      .select("*")
      .eq("is_active", true)
      .eq("company_id", companyId)
      .order("name");

    if (error) {
      console.error("[process-owner-scopes] GET query error:", error);
      return NextResponse.json({ error: "查询主管类型失败", detail: error.message }, { status: 500 });
    }

    // 如果当前公司没有任何主管类型，自动初始化默认数据
    if (!data || data.length === 0) {
      const upsertPayload = defaultScopes.map((scope) => ({
        ...scope,
        company_id: companyId,
        is_active: true,
        updated_at: new Date().toISOString(),
      }));

      // 优先使用 service role 绕过可能的 RLS/唯一约束冲突；未配置时降级到 RLS 客户端
      const client = isServiceRoleConfigured ? getServiceRoleClient() : supabase;
      const { error: seedError } = await client
        .from("process_owner_scopes")
        .upsert(upsertPayload, { onConflict: "key,company_id" });

      if (seedError) {
        // 如果全局 key 冲突（旧约束未迁移），仅记录日志，不影响已有数据读取
        console.warn("[process-owner-scopes] seed defaults warning:", seedError);
      } else {
        const { data: seeded } = await supabase
          .from("process_owner_scopes")
          .select("*")
          .eq("is_active", true)
          .eq("company_id", companyId)
          .order("name");
        data = seeded || [];
      }
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch process owner scopes:", error);
    return NextResponse.json({ error: "Failed to fetch process owner scopes" }, { status: 500 });
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
    const { id, key, name, description, process_nodes } = body;

    if (!key || !name || !Array.isArray(process_nodes)) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const validNodes = process_nodes.filter((n: string) => processNodeOptions.includes(n));

    const payload = {
      key,
      name,
      description: description || null,
      process_nodes: validNodes,
      company_id: companyId,
      is_active: true,
      updated_at: new Date().toISOString(),
    };

    if (id) {
      const { data, error } = await supabase
        .from("process_owner_scopes")
        .update(payload)
        .eq("id", id)
        .eq("company_id", companyId)
        .select()
        .single();
      if (error) {
        console.error("[process-owner-scopes] UPDATE error:", error);
        return NextResponse.json(
          { error: "更新主管类型失败", detail: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json(data);
    }

    const { data, error } = await supabase
      .from("process_owner_scopes")
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
      console.error("[process-owner-scopes] UPSERT error:", error);
      return NextResponse.json(
        { error: "保存主管类型失败", detail: error.message },
        { status: 500 }
      );
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to save process owner scope:", error);
    return NextResponse.json({ error: "Failed to save process owner scope" }, { status: 500 });
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
      return NextResponse.json({ error: "缺少主管类型ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("process_owner_scopes")
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("company_id", companyId);

    if (error) {
      console.error("[process-owner-scopes] DELETE error:", error);
      return NextResponse.json(
        { error: "删除主管类型失败", detail: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete process owner scope:", error);
    return NextResponse.json({ error: "Failed to delete process owner scope" }, { status: 500 });
  }
}
