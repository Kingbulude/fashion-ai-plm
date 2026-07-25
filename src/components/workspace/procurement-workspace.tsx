"use client";

import Link from "next/link";
import { Truck, CheckCircle2, AlertTriangle } from "lucide-react";
import { KpiCard, TodoListCard, StyleListCard, AIToolsGrid, AISuggestionBanner } from "./shared-modules";
import { useTenant } from "@/lib/auth/tenant-context";

export function ProcurementWorkspace({
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
    (s) => s.process_node === "procurement"
  );

  const procurementTodos = (workspace?.todos || []).filter((t: any) =>
    t.title?.includes("采购")
  );
  const procurementStyles = (workspace?.recentStyles || []).filter((s: any) =>
    ["sampled", "producing"].includes(s.status)
  );
  const pendingCount = procurementStyles.filter(
    (s: any) => s.status === "sampled" || s.status === "producing"
  ).length;
  const overdueCount = (workspace?.risks || []).filter((r: any) =>
    r.title?.includes("采购逾期")
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
          title="待采购"
          value={pendingCount}
          subtitle="待采购/采购中款式"
          icon={Truck}
          color="amber"
          href="/styles?status=sampled,producing"
        />
        <KpiCard
          title="采购完成"
          value="-"
          subtitle="无逾期即为完成"
          icon={CheckCircle2}
          color="green"
        />
        <KpiCard
          title="采购逾期"
          value={overdueCount}
          subtitle="需要立即处理"
          icon={AlertTriangle}
          color="red"
          highlight={overdueCount > 0}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodoListCard
          title="采购任务"
          todos={procurementTodos}
          onComplete={onCompleteTodo}
          completingId={completingTodoId}
          href="/todos"
          emptyText="暂无采购任务"
        />
        <StyleListCard
          title="采购中款式"
          styles={procurementStyles}
          href="/styles?status=sampled,producing"
          emptyText="暂无相关款式"
        />
      </div>
      <AIToolsGrid skills={aiSkills} />
    </div>
  );
}
