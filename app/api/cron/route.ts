// 定时调度入口
// 外部 Cron 服务（Vercel Cron / Cloudflare Workers Cron）按计划调用此端点
// 用 X-AI-Key 鉴权（不走用户 session）
//
// 配置示例（wrangler.toml 或 Vercel cron）：
//   [triggers]
//   crons = ["0 9 * * *"]  # 每天 9 点触发 daily

import { NextResponse } from "next/server";
import { emit, getMetrics, getEventLog } from "@/lib/events/emitter";
import { EventType } from "@/lib/events/types";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const AI_API_KEY = process.env.AI_API_KEY || "";

type CronSchedule = "hourly" | "daily" | "weekly";

export async function POST(request: Request) {
  // 鉴权（X-AI-Key，middleware 已验证；这里做二次确认）
  const aiKey = request.headers.get("x-ai-key");
  if (!AI_API_KEY || aiKey !== AI_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { schedule?: CronSchedule } = {};
  try {
    body = await request.json();
  } catch {
    // 允许无 body，默认 daily
  }

  const schedule: CronSchedule = body.schedule || "daily";

  // 根据调度类型发射对应事件
  const eventType =
    schedule === "hourly"
      ? EventType.CRON_HOURLY
      : schedule === "weekly"
        ? EventType.CRON_WEEKLY
        : EventType.CRON_DAILY;

  const eventId = await emit(eventType, {
    source: "cron",
    firedAt: new Date().toISOString(),
  });

  return NextResponse.json({
    ok: true,
    schedule,
    eventId,
    message: `已触发 ${schedule} 定时任务`,
  });
}

// 查看事件系统状态（调试用）
export async function GET(request: Request) {
  const aiKey = request.headers.get("x-ai-key");
  if (!AI_API_KEY || aiKey !== AI_API_KEY) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    metrics: getMetrics(),
    recentEvents: getEventLog().slice(-10),
  });
}
