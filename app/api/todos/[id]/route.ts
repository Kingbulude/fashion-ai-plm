// 单个待办 API
// 获取 / 更新状态（完成/取消）/ 删除

import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";

export const runtime = "edge";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from("todos")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      return NextResponse.json({ error: "获取待办失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "获取待办失败" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    const updateData: any = { updated_at: new Date().toISOString() };
    if (status === "completed") {
      updateData.status = "completed";
      updateData.completed_at = new Date().toISOString();
    } else if (status) {
      updateData.status = status;
    }

    const { data, error } = await supabase
      .from("todos")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: "更新待办失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data));
  } catch {
    return NextResponse.json({ error: "更新待办失败" }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { error } = await supabase.from("todos").delete().eq("id", id);
    if (error) {
      return NextResponse.json({ error: "删除待办失败" }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "删除待办失败" }, { status: 500 });
  }
}
