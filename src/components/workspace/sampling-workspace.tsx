"use client";

import Link from "next/link";
import { Wrench, CheckCircle2, AlertTriangle } from "lucide-react";
import { KpiCard, TodoListCard, StyleListCard, AIToolsGrid } from "./shared-modules";
import { useTenant } from "@/lib/auth/tenant-context";

export function SamplingWorkspace({
  workspace,
  onCompleteTodo,
  completingTodoId,
}: {
  workspace: any;
  onCompleteTodo: (id: string) => void;
  completingTodoId: string | null;
}) {
  const { accessibleAISkills } = useTenant();
  const aiSkills = accessibleAISkills.filter((s) => s.process_node === "sampling");

  const samplingTodos = (workspace?.todos || []).filter((t: any) =>
    t.title?.includes("打样")
  );
  const samplingStyles = (workspace?.recentStyles || []).filter((s: any) =>
    ["designed", "sampling", "sampled"].includes(s.status)
  );
  const pendingCount = samplingStyles.filter(
    (s: any) => s.status === "designed" || s.status === "sampling"
  ).length;
  const doneCount = samplingStyles.filter(
    (s: any) => s.status === "sampled"
  ).length;
  const timeoutCount = (workspace?.risks || []).filter((r: any) =>
    r.title?.includes("打样超时")
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiCard
          title="待打样"
          value={pendingCount}
          subtitle="待打样/打样中款式"
          icon={Wrench}
          color="amber"
          href="/styles?status=designed,sampling"
        />
        <KpiCard
          title="封样完成"
          value={doneCount}
          subtitle="已封样可进入采购"
          icon={CheckCircle2}
          color="amber"
          href="/styles?status=sampled"
        />
        <KpiCard
          title="打样超时"
          value={timeoutCount}
          subtitle="需要立即处理"
          icon={AlertTriangle}
          color="red"
          highlight={timeoutCount > 0}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodoListCard
          title="打样任务"
          todos={samplingTodos}
          onComplete={onCompleteTodo}
          completingId={completingTodoId}
          href="/todos"
          emptyText="暂无打样任务"
        />
        <StyleListCard
          title="打样中款式"
          styles={samplingStyles}
          href="/styles?status=designed,sampling,sampled"
          emptyText="暂无相关款式"
        />
      </div>
      <AIToolsGrid skills={aiSkills} />
    </div>
  );
}
