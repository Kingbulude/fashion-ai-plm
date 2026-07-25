"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { useTenant } from "@/lib/auth/tenant-context";
import { useApi } from "@/lib/api/use-api";
import { Button } from "@/components/ui/button";
import { RefreshCw, Loader2, Plus } from "lucide-react";
import { ManagerWorkspace } from "@/components/workspace/manager-workspace";
import { DesignWorkspace } from "@/components/workspace/design-workspace";
import { SamplingWorkspace } from "@/components/workspace/sampling-workspace";
import { ProcurementWorkspace } from "@/components/workspace/procurement-workspace";
import { ProductionWorkspace } from "@/components/workspace/production-workspace";
import { SalesWorkspace } from "@/components/workspace/sales-workspace";
import { AftersalesWorkspace } from "@/components/workspace/aftersales-workspace";

export default function DashboardPage() {
  const { currentBrand, currentSeason, currentCompany, userRole, processRoles } =
    useTenant();
  const api = useApi();

  const [workspace, setWorkspace] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [completingTodoId, setCompletingTodoId] = useState<string | null>(null);

  const loadWorkspace = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await api.get<any>("/api/workspace");
      setWorkspace(data);
    } catch (err: any) {
      console.error("加载工作台失败:", err);
      setError(err?.message || "加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadWorkspace();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.id, currentSeason?.id]);

  const handleCompleteTodo = async (todoId: string) => {
    try {
      setCompletingTodoId(todoId);
      await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany?.id || "",
          "x-brand-id": currentBrand?.id || "",
          "x-season-id": currentSeason?.id || "",
        },
        body: JSON.stringify({ status: "completed" }),
      });
      await loadWorkspace(true);
    } catch (err) {
      console.error("完成待办失败:", err);
    } finally {
      setCompletingTodoId(null);
    }
  };

  // 根据角色决定渲染哪个工作台
  const renderWorkspace = () => {
    if (loading) return <LoadingState />;
    if (error) return <ErrorState error={error} onRetry={() => loadWorkspace()} />;
    if (!workspace) return <LoadingState />;

    const isManager = ["boss", "admin", "brand_manager"].includes(userRole || "");
    if (isManager) {
      return (
        <ManagerWorkspace
          workspace={workspace}
          onCompleteTodo={handleCompleteTodo}
          completingTodoId={completingTodoId}
        />
      );
    }

    const processNode = processRoles[0]?.process_node;
    switch (processNode) {
      case "design":
        return (
          <DesignWorkspace
            workspace={workspace}
            onCompleteTodo={handleCompleteTodo}
            completingTodoId={completingTodoId}
          />
        );
      case "sampling":
        return (
          <SamplingWorkspace
            workspace={workspace}
            onCompleteTodo={handleCompleteTodo}
            completingTodoId={completingTodoId}
          />
        );
      case "procurement":
        return (
          <ProcurementWorkspace
            workspace={workspace}
            onCompleteTodo={handleCompleteTodo}
            completingTodoId={completingTodoId}
          />
        );
      case "stocking":
        return (
          <ProductionWorkspace
            workspace={workspace}
            onCompleteTodo={handleCompleteTodo}
            completingTodoId={completingTodoId}
          />
        );
      case "sales":
        return (
          <SalesWorkspace
            workspace={workspace}
            onCompleteTodo={handleCompleteTodo}
            completingTodoId={completingTodoId}
          />
        );
      case "aftersales":
        return (
          <AftersalesWorkspace
            workspace={workspace}
            onCompleteTodo={handleCompleteTodo}
            completingTodoId={completingTodoId}
          />
        );
      default:
        return (
          <ManagerWorkspace
            workspace={workspace}
            onCompleteTodo={handleCompleteTodo}
            completingTodoId={completingTodoId}
          />
        );
    }
  };

  return (
    <SidebarLayout>
      <div className="max-w-[1800px] mx-auto space-y-6 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              工作台
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentBrand ? (
                <>
                  <span className="font-medium text-foreground">
                    {currentBrand.name}
                  </span>
                  {currentSeason && (
                    <span className="mx-2 text-border">·</span>
                  )}
                  {currentSeason && <span>{currentSeason.name}</span>}
                </>
              ) : (
                "加载品牌上下文中..."
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadWorkspace(true)}
              disabled={refreshing}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`}
              />
              刷新
            </Button>
            <Button
              size="sm"
              className="bg-gradient-to-r from-terracotta-500 to-terracotta-600 hover:from-terracotta-600 hover:to-terracotta-700 text-white"
              asChild
            >
              <Link href="/planning">
                <Plus className="h-4 w-4 mr-1.5" />
                新建企划
              </Link>
            </Button>
          </div>
        </div>

        {renderWorkspace()}
      </div>
    </SidebarLayout>
  );
}

// 加载状态
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <span className="ml-3 text-muted-foreground">加载工作台...</span>
    </div>
  );
}

// 错误状态
function ErrorState({
  error,
  onRetry,
}: {
  error: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">
      <p className="text-destructive mb-4">{error}</p>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <RefreshCw className="h-4 w-4 mr-1.5" />
        重试
      </Button>
    </div>
  );
}
