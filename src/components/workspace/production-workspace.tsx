"use client";

import Link from "next/link";
import { Factory, Package, AlertTriangle } from "lucide-react";
import { KpiCard, TodoListCard, StyleListCard, AIToolsGrid } from "./shared-modules";
import { useTenant } from "@/lib/auth/tenant-context";

export function ProductionWorkspace({
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
    (s) => s.process_node === "stocking"
  );

  const productionTodos = (workspace?.todos || []).filter((t: any) =>
    t.title?.includes("生产")
  );
  const productionStyles = (workspace?.recentStyles || []).filter((s: any) =>
    ["producing", "produced"].includes(s.status)
  );
  const pendingCount = productionStyles.filter(
    (s: any) => s.status === "producing"
  ).length;
  const doneCount = productionStyles.filter(
    (s: any) => s.status === "produced"
  ).length;
  const riskCount = (workspace?.risks || []).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiCard
          title="待生产"
          value={pendingCount}
          subtitle="生产中款式"
          icon={Factory}
          color="green"
          href="/styles?status=producing"
        />
        <KpiCard
          title="生产完成"
          value={doneCount}
          subtitle="已下线可入库"
          icon={Package}
          color="green"
          href="/styles?status=produced"
        />
        <KpiCard
          title="生产风险"
          value={riskCount}
          subtitle="需要关注"
          icon={AlertTriangle}
          color="red"
          highlight={riskCount > 0}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodoListCard
          title="生产任务"
          todos={productionTodos}
          onComplete={onCompleteTodo}
          completingId={completingTodoId}
          href="/todos"
          emptyText="暂无生产任务"
        />
        <StyleListCard
          title="生产中款式"
          styles={productionStyles}
          href="/styles?status=producing,produced"
          emptyText="暂无相关款式"
        />
      </div>
      <AIToolsGrid skills={aiSkills} />
    </div>
  );
}
