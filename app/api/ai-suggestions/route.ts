import { NextResponse } from "next/server";
import { supabase } from "@/lib/db/client";
import { getSession } from "@/lib/auth/supabase";
import { logOperation } from "@/lib/auth/audit";
import {
  AIRoleLevel,
  AISuggestionStatus,
  getAIRoleForUser,
} from "@/lib/ai/architecture";

export const runtime = "edge";

// 获取AI建议列表（根据用户角色返回对应级别的建议）
export async function GET(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const status = url.searchParams.get("status") || "pending";
    const brandId = url.searchParams.get("brand_id");

    // 获取用户角色
    const { data: profile } = await supabase
      .from("profiles")
      .select("role_level")
      .eq("user_id", session.user.id)
      .single();

    const userAIRole = getAIRoleForUser(profile?.role_level || "executor");

    let query = supabase
      .from("ai_suggestions")
      .select("*")
      .order("created_at", { ascending: false });

    // 根据AI角色级别过滤建议
    if (userAIRole === AIRoleLevel.AI_MASTER) {
      // AI总控：可以看到所有级别的建议
    } else if (userAIRole === AIRoleLevel.AI_SPECIALIST) {
      // AI工序专员：看到专员级和助手级的建议
      query = query.in("ai_role_level", [
        AIRoleLevel.AI_SPECIALIST,
        AIRoleLevel.AI_ASSISTANT,
      ]);
    } else {
      // AI执行助手：只看到助手级的建议
      query = query.eq("ai_role_level", AIRoleLevel.AI_ASSISTANT);
    }

    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (brandId) {
      query = query.eq("brand_id", brandId);
    }

    const { data, error } = await query.limit(50);

    if (error) throw error;
    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Failed to fetch AI suggestions:", error);
    return NextResponse.json([]);
  }
}

// 审核AI建议（人工审核后才生效）
export async function PUT(request: Request) {
  try {
    const session = await getSession(request as any);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { id, status, reviewComment } = body;

    if (!id || !status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json({ error: "参数错误" }, { status: 400 });
    }

    // 获取AI建议
    const { data: suggestion, error: fetchError } = await supabase
      .from("ai_suggestions")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !suggestion) {
      return NextResponse.json({ error: "建议不存在" }, { status: 404 });
    }

    // 更新审核状态
    const { data, error } = await supabase
      .from("ai_suggestions")
      .update({
        status,
        review_comment: reviewComment || null,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // 如果审核通过，执行AI建议的具体操作
    if (status === "approved" && suggestion.proposed_data && suggestion.target_table) {
      try {
        if (suggestion.type === "automation") {
          // 自动化执行：直接写入目标表
          await supabase
            .from(suggestion.target_table)
            .upsert(suggestion.proposed_data)
            .eq("id", suggestion.target_id || "");
        }

        // 标记为已执行
        await supabase
          .from("ai_suggestions")
          .update({ status: "executed" })
          .eq("id", id);
      } catch (execError) {
        console.error("Failed to execute AI suggestion:", execError);
      }
    }

    await logOperation({
      userId: session.user.id,
      brandId: suggestion.brand_id,
      action: `ai_suggestion_${status}`,
      targetTable: "ai_suggestions",
      targetId: id,
      afterData: data,
      request,
    });

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to review AI suggestion:", error);
    return NextResponse.json({ error: "Failed to review suggestion" }, { status: 500 });
  }
}

// 创建AI建议（供AI系统调用）
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      aiRoleLevel,
      specialistType,
      assistantType,
      brandId,
      processNode,
      type,
      priority,
      title,
      content,
      proposedData,
      targetTable,
      targetId,
      expireAt,
    } = body;

    if (!aiRoleLevel || !type || !title || !content) {
      return NextResponse.json({ error: "缺少必填字段" }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("ai_suggestions")
      .insert({
        ai_role_level: aiRoleLevel,
        specialist_type: specialistType || null,
        assistant_type: assistantType || null,
        brand_id: brandId || null,
        process_node: processNode || null,
        type,
        priority: priority || "medium",
        title,
        content,
        proposed_data: proposedData || null,
        target_table: targetTable || null,
        target_id: targetId || null,
        status: AISuggestionStatus.PENDING,
        created_by: "ai_system",
        expire_at: expireAt || null,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error) {
    console.error("Failed to create AI suggestion:", error);
    return NextResponse.json({ error: "Failed to create suggestion" }, { status: 500 });
  }
}
