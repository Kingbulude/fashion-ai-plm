"use client";

import Link from "next/link";
import { ShieldAlert, TrendingDown, AlertTriangle } from "lucide-react";
import { KpiCard, TodoListCard, StyleListCard, AIToolsGrid, AISuggestionBanner } from "./shared-modules";
import { useTenant } from "@/lib/auth/tenant-context";

export function AftersalesWorkspace({
  workspace,
  onCompleteTodo,
  completingTodoId,
}: {
  workspace: any;
  onCompleteTodo: (id: string) => void;
  completingTodoId: string | null;
}) {
  const { accessibleAISkills } = useTenant();
  const aiSkills = accessibleAISkills.filter(
    (s) => s.process_node === "aftersales"
  );

  const aftersalesTodos = (workspace?.todos || []).filter(
    (t: any) =>
      t.title?.includes("售后") ||
      t.title?.includes("退货") ||
      t.title?.includes("换货")
  );
  const aftersalesStyles = (workspace?.recentStyles || []).filter((s: any) =>
    ["selling", "sold", "reviewing"].includes(s.status)
  );
  const pendingCount = (workspace?.todos || []).filter(
    (t: any) =>
      t.title?.includes("售后") || t.title?.includes("退货")
  ).length;
  const qualityComplaintCount = (workspace?.risks || []).filter(
    (r: any) => r.title?.includes("质量") || r.title?.includes("投诉")
  ).length;

  const handleApproveSuggestion = async (id: string) => {
    try {
      await fetch("/api/ai-suggestions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "approved", reviewComment: "已采纳" }),
      });
    } catch {}
  };
  const handleRejectSuggestion = async (id: string) => {
    try {
      await fetch("/api/ai-suggestions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "rejected", reviewComment: "不采纳" }),
      });
    } catch {}
  };

  return (
    <div className="space-y-6">
      {/* AI 智能建议横幅 */}
      <AISuggestionBanner
        suggestions={workspace?.aiSuggestions || []}
        onApprove={handleApproveSuggestion}
        onReject={handleRejectSuggestion}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiCard
          title="待处理售后"
          value={pendingCount}
          subtitle="售后/退货待办"
          icon={ShieldAlert}
          color="red"
          href="/todos"
          highlight={pendingCount > 0}
        />
        <KpiCard
          title="退货率"
          value="-"
          subtitle="暂未接入退货数据"
          icon={TrendingDown}
          color="amber"
        />
        <KpiCard
          title="质量投诉"
          value={qualityComplaintCount}
          subtitle="需要关注"
          icon={AlertTriangle}
          color="red"
          highlight={qualityComplaintCount > 0}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodoListCard
          title="售后任务"
          todos={aftersalesTodos}
          onComplete={onCompleteTodo}
          completingId={completingTodoId}
          href="/todos"
          emptyText="暂无售后任务"
        />
        <StyleListCard
          title="售后关注款式"
          styles={aftersalesStyles}
          href="/styles?status=selling,sold,reviewing"
          emptyText="暂无相关款式"
        />
      </div>
      <AIToolsGrid skills={aiSkills} />
    </div>
  );
}
