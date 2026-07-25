"use client";

import Link from "next/link";
import { Palette, CheckCircle2, AlertCircle } from "lucide-react";
import { KpiCard, TodoListCard, StyleListCard, AIToolsGrid } from "./shared-modules";
import { useTenant } from "@/lib/auth/tenant-context";

export function DesignWorkspace({
  workspace,
  onCompleteTodo,
  completingTodoId,
}: {
  workspace: any;
  onCompleteTodo: (id: string) => void;
  completingTodoId: string | null;
}) {
  const { accessibleAISkills } = useTenant();
  const aiSkills = accessibleAISkills.filter((s) => s.process_node === "design");

  const designTodos = (workspace?.todos || []).filter(
    (t: any) =>
      t.title?.includes("设计") ||
      t.title?.includes("上传") ||
      t.title?.includes("修改")
  );
  const designStyles = (workspace?.recentStyles || []).filter((s: any) =>
    ["planning", "designing", "designed"].includes(s.status)
  );
  const pendingCount = designStyles.filter(
    (s: any) => s.status === "planning" || s.status === "designing"
  ).length;
  const doneCount = designStyles.filter(
    (s: any) => s.status === "designed"
  ).length;
  const revisionCount = designTodos.filter((t: any) =>
    t.title?.includes("修改")
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiCard
          title="待设计"
          value={pendingCount}
          subtitle="待设计/设计中款式"
          icon={Palette}
          color="blue"
          href="/styles?status=planning,designing"
        />
        <KpiCard
          title="设计完成"
          value={doneCount}
          subtitle="已可进入打样"
          icon={CheckCircle2}
          color="green"
          href="/styles?status=designed"
        />
        <KpiCard
          title="待修改"
          value={revisionCount}
          subtitle="需要修改的设计"
          icon={AlertCircle}
          color="terracotta"
          highlight={revisionCount > 0}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodoListCard
          title="我的设计任务"
          todos={designTodos}
          onComplete={onCompleteTodo}
          completingId={completingTodoId}
          href="/todos"
          emptyText="暂无设计任务"
        />
        <StyleListCard
          title="我负责的款式"
          styles={designStyles}
          href="/styles?status=planning,designing,designed"
          emptyText="暂无相关款式"
        />
      </div>
      <AIToolsGrid skills={aiSkills} />
    </div>
  );
}
