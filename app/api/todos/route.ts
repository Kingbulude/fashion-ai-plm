// 待办 API
// 列出待办 / 创建待办 / 更新状态

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { getTenantFromHeaders, withTenant } from "@/lib/auth/tenant-helpers";

export const runtime = "edge";

const DEFAULT_COMPANY = "00000000-0000-0000-0000-000000000010";
const DEFAULT_BRAND = "00000000-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const headerTenant = getTenantFromHeaders(request);
    const brandId = url.searchParams.get("brandId") || headerTenant?.brand_id;
    const status = url.searchParams.get("status"); // pending/in_progress/completed

    let query = supabase
      .from("todos")
      .select("*")
      .order("priority", { ascending: false })
      .order("created_at", { ascending: false });

    if (brandId) {
      query = query.eq("brand_id", brandId);
    }
    if (status) {
      query = query.eq("status", status);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ error: "获取待办失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch {
    return NextResponse.json({ error: "获取待办失败" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { title, description, type, priority, targetTable, targetId, assignedTo, dueDate } = body;

    if (!title) {
      return NextResponse.json({ error: "标题不能为空" }, { status: 400 });
    }

    const headerTenant = getTenantFromHeaders(request);
    const tenant = headerTenant || { company_id: DEFAULT_COMPANY, brand_id: DEFAULT_BRAND, season_id: null };

    const { data, error } = await supabase
      .from("todos")
      .insert(
        withTenant(
          {
            type: type || "task",
            title,
            description: description || null,
            target_table: targetTable || null,
            target_id: targetId || null,
            priority: priority || "medium",
            status: "pending",
            assigned_to: assignedTo || null,
            due_date: dueDate || null,
          },
          tenant
        )
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "创建待办失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data), { status: 201 });
  } catch {
    return NextResponse.json({ error: "创建待办失败" }, { status: 500 });
  }
}
