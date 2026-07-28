import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth/supabase";
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

async function resolveAdminCompanyId(request: Request) {
  const session = await getSession(request as any);
  if (!session?.user) {
    return { error: "Unauthorized", status: 401 };
  }

  const adminClient = getServiceRoleClient();

  const { data: profile } = await adminClient
    .from("profiles")
    .select("role_level, company_id, brand_id")
    .eq("user_id", session.user.id)
    .single();

  if (profile?.role_level !== RoleLevel.BOSS && profile?.role_level !== RoleLevel.ADMIN) {
    return { error: "Forbidden", status: 403 };
  }

  let companyId = profile?.company_id;

  // 兼容旧数据：profile.company_id 为空时，从 brand 推导
  if (!companyId && profile?.brand_id) {
    const { data: brand } = await adminClient
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

  return { session, companyId, adminClient };
}

export async function GET(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: "Service role key 未配置", detail: "请配置 SUPABASE_SERVICE_ROLE_KEY 环境变量" },
        { status: 500 }
      );
    }

    const adminCtx = await resolveAdminCompanyId(request);
    if ("error" in adminCtx) {
      return NextResponse.json({ error: adminCtx.error }, { status: adminCtx.status });
    }

    const { companyId, adminClient } = adminCtx;

    const { data, error } = await adminClient
      .from("process_owner_scopes")
      .select("*")
      .eq("is_active", true)
      .eq("company_id", companyId)
      .order("name");

    if (error) {
      console.error("[process-owner-scopes] GET query error:", error);
      return NextResponse.json({ error: "查询主管类型失败", detail: error.message }, { status: 500 });
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch process owner scopes:", error);
    return NextResponse.json({ error: "Failed to fetch process owner scopes" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: "Service role key 未配置", detail: "请配置 SUPABASE_SERVICE_ROLE_KEY 环境变量" },
        { status: 500 }
      );
    }

    const adminCtx = await resolveAdminCompanyId(request);
    if ("error" in adminCtx) {
      return NextResponse.json({ error: adminCtx.error }, { status: adminCtx.status });
    }

    const { companyId, adminClient } = adminCtx;

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
      const { data, error } = await adminClient
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
    } else {
      // 使用 upsert 处理 key 唯一约束冲突（包括已软删除的记录重新激活）
      const { data, error } = await adminClient
        .from("process_owner_scopes")
        .upsert(
          {
            ...payload,
            created_at: new Date().toISOString(),
          },
          { onConflict: "key" }
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
    }
  } catch (error) {
    console.error("Failed to save process owner scope:", error);
    return NextResponse.json({ error: "Failed to save process owner scope" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const ctx = await requireApiAuth(request);
    if ("error" in ctx) return ctx.error;

    if (!isServiceRoleConfigured) {
      return NextResponse.json(
        { error: "Service role key 未配置", detail: "请配置 SUPABASE_SERVICE_ROLE_KEY 环境变量" },
        { status: 500 }
      );
    }

    const adminCtx = await resolveAdminCompanyId(request);
    if ("error" in adminCtx) {
      return NextResponse.json({ error: adminCtx.error }, { status: adminCtx.status });
    }

    const { companyId, adminClient } = adminCtx;

    const url = new URL(request.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "缺少主管类型ID" }, { status: 400 });
    }

    const { error } = await adminClient
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
