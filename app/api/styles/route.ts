import { NextResponse } from "next/server";
import { dbAdmin } from "@/lib/db/client";
import { toCamelCase } from "@/lib/db/mappers";
import { requirePermission } from "@/lib/auth/permission";
import { Permission } from "@/lib/auth/rbac";
import { emit } from "@/lib/events/emitter";
import { EventType } from "@/lib/events/types";

export const runtime = "edge";

export async function GET() {
  try {
    const { data, error } = await dbAdmin
      .from("styles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: "获取款式列表失败" }, { status: 500 });
    }

    return NextResponse.json(toCamelCase(data) || []);
  } catch (error) {
    return NextResponse.json({ error: "获取款式列表失败" }, { status: 500 });
  }
}

// 创建款式需要 EDIT 权限（EXECUTOR 及以上可操作）
export async function POST(request: Request) {
  return requirePermission(Permission.EDIT)(request, async ({ userRole }) => {
    try {
      const body = await request.json();
      const {
        styleNo,
        name,
        season,
        category,
        description,
        targetCost,
        status,
      } = body;

      if (!styleNo || !name) {
        return NextResponse.json(
          { error: "款号和款式名称不能为空" },
          { status: 400 }
        );
      }

      const { data: existing } = await dbAdmin
        .from("styles")
        .select("id")
        .eq("style_no", styleNo);
      if (existing && existing.length > 0) {
        return NextResponse.json({ error: "款号已存在" }, { status: 400 });
      }

      const { data, error } = await dbAdmin
        .from("styles")
        .insert({
          style_no: styleNo,
          name,
          season,
          category,
          description,
          target_cost: targetCost ? Number(targetCost) : null,
          status: status || "planning",
          created_by: userRole.userId,
        })
        .select()
        .single();

      if (error) {
        return NextResponse.json({ error: "创建款式失败" }, { status: 500 });
      }

      const camelData = toCamelCase(data) || {};
      const styleData = camelData as {
        id: string;
        styleNo: string;
        name: string;
      };

      // 🔥 触发 AI Pipeline：测款 → 决策 → 下单
      // 异步执行，不阻塞 API 响应
      if (styleData.id) {
        emit(EventType.STYLE_CREATED, {
          source: "user",
          userId: userRole.userId,
          styleId: styleData.id,
          styleNo: styleData.styleNo,
          name: styleData.name,
        }).catch((err) => {
          console.error("[styles] 触发测款 Pipeline 失败:", err);
        });
      }

      return NextResponse.json(camelData, { status: 201 });
    } catch (error) {
      return NextResponse.json({ error: "创建款式失败" }, { status: 500 });
    }
  });
}
