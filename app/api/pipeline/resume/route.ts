// Pipeline 恢复 API
// 跟单/审批人通过此端点确认或驳回 AI 建议，恢复暂停的 Pipeline
//
// POST /api/pipeline/resume
// Body: { runId, approved, comment? }

import { NextResponse } from "next/server";
import { resumePipeline } from "@/lib/pipeline/runner";
import { requireApiAuth } from "@/lib/auth/permission";

export const runtime = "edge";

export async function POST(request: Request) {
  const ctx = await requireApiAuth(request);
  if (!ctx) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { runId, approved, comment } = body;

    if (!runId || typeof approved !== "boolean") {
      return NextResponse.json(
        { error: "参数错误：需要 runId 和 approved" },
        { status: 400 }
      );
    }

    await resumePipeline(runId, approved);

    return NextResponse.json({
      ok: true,
      runId,
      action: approved ? "approved" : "rejected",
      comment: comment || null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "恢复失败" },
      { status: 500 }
    );
  }
}
