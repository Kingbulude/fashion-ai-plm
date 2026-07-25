"use client";

import Link from "next/link";
import { ShoppingCart, TrendingUp, AlertCircle } from "lucide-react";
import { KpiCard, TodoListCard, StyleListCard, AIToolsGrid } from "./shared-modules";
import { useTenant } from "@/lib/auth/tenant-context";

export function SalesWorkspace({
  workspace,
  onCompleteTodo,
  completingTodoId,
}: {
  workspace: any;
  onCompleteTodo: (id: string) => void;
  completingTodoId: string | null;
}) {
  const { accessibleAISkills } = useTenant();
  const aiSkills = accessibleAISkills.filter((s) => s.process_node === "sales");

  const salesTodos = (workspace?.todos || []).filter(
    (t: any) => t.title?.includes("上架") || t.title?.includes("销售")
  );
  const salesStyles = (workspace?.recentStyles || []).filter((s: any) =>
    ["selling", "sold"].includes(s.status)
  );
  const onSaleCount = salesStyles.filter(
    (s: any) => s.status === "selling" || s.status === "sold"
  ).length;
  const stockAlertCount = (workspace?.risks || []).filter((r: any) =>
    r.title?.includes("库存")
  ).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <KpiCard
          title="在售款式"
          value={onSaleCount}
          subtitle="在售/已售款式"
          icon={ShoppingCart}
          color="purple"
          href="/styles?status=selling,sold"
        />
        <KpiCard
          title="本周销售"
          value="-"
          subtitle="暂未接入销售数据"
          icon={TrendingUp}
          color="blue"
        />
        <KpiCard
          title="库存预警"
          value={stockAlertCount}
          subtitle="需要补货或清仓"
          icon={AlertCircle}
          color="amber"
          highlight={stockAlertCount > 0}
        />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TodoListCard
          title="销售任务"
          todos={salesTodos}
          onComplete={onCompleteTodo}
          completingId={completingTodoId}
          href="/todos"
          emptyText="暂无销售任务"
        />
        <StyleListCard
          title="在售款式"
          styles={salesStyles}
          href="/styles?status=selling,sold"
          emptyText="暂无相关款式"
        />
      </div>
      <AIToolsGrid skills={aiSkills} />
    </div>
  );
}
