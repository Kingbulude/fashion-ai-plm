// 待办中心 - 多品牌待办统一管理
// 按优先级/状态/类型筛选，一键完成/重开/删除

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/auth/tenant-context";
import { supabase } from "@/lib/auth/supabase";
import {
  Check,
  Trash2,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ListTodo,
  Filter,
  RotateCcw,
  Calendar,
  ChevronRight,
  Inbox,
  Sparkles,
  User,
} from "lucide-react";

const PRIORITY_CONFIG: Record<string, { label: string; color: string; order: number }> = {
  urgent: { label: "紧急", color: "bg-red-100 text-red-700 border-red-200", order: 4 },
  high: { label: "高", color: "bg-orange-100 text-orange-700 border-orange-200", order: 3 },
  medium: { label: "中", color: "bg-amber-100 text-amber-700 border-amber-200", order: 2 },
  low: { label: "低", color: "bg-slate-100 text-slate-600 border-slate-200", order: 1 },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  pending: { label: "待处理", color: "bg-amber-50 text-amber-700 border-amber-200" },
  in_progress: { label: "进行中", color: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "已完成", color: "bg-green-50 text-green-700 border-green-200" },
};

type StatusFilter = "all" | "pending" | "in_progress" | "completed";

export default function TodosPage() {
  const router = useRouter();
  const { currentBrand, currentSeason, currentCompany } = useTenant();
  const [todos, setTodos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [showMineOnly, setShowMineOnly] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  // 获取当前用户 ID，用于「仅看我负责的」筛选
  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) setCurrentUserId(data.user.id);
    };
    getUser();
  }, []);

  // 加载待办
  useEffect(() => {
    fetchTodos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.id, currentSeason?.id]);

  const fetchTodos = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/todos", {
        headers: {
          "x-company-id": currentCompany?.id || "",
          "x-brand-id": currentBrand?.id || "",
          "x-season-id": currentSeason?.id || "",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTodos(Array.isArray(data) ? data : []);
      } else {
        setError("加载待办失败，请稍后重试");
      }
    } catch (err) {
      console.error("获取待办失败:", err);
      setError("网络异常，加载待办失败");
    } finally {
      setLoading(false);
    }
  };

  // 统计数据
  const stats = useMemo(() => {
    const now = new Date();
    return {
      total: todos.length,
      pending: todos.filter((t) => t.status === "pending").length,
      overdue: todos.filter((t) => t.status === "pending" && t.dueDate && new Date(t.dueDate) < now).length,
      completed: todos.filter((t) => t.status === "completed").length,
      inProgress: todos.filter((t) => t.status === "in_progress").length,
    };
  }, [todos]);

  // 过滤
  const filtered = useMemo(() => {
    let result = todos;
    if (statusFilter !== "all") {
      result = result.filter((t) => t.status === statusFilter);
    }
    if (priorityFilter) {
      result = result.filter((t) => t.priority === priorityFilter);
    }
    if (showMineOnly && currentUserId) {
      result = result.filter((t) => t.assignedTo === currentUserId);
    }
    // 按优先级 + 创建时间排序
    return [...result].sort((a, b) => {
      const pa = PRIORITY_CONFIG[a.priority]?.order || 0;
      const pb = PRIORITY_CONFIG[b.priority]?.order || 0;
      if (pa !== pb) return pb - pa;
      return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
    });
  }, [todos, statusFilter, priorityFilter, showMineOnly, currentUserId]);

  // 操作：更新状态
  const updateTodo = async (id: string, updates: any) => {
    setUpdatingId(id);
    try {
      await fetch(`/api/todos/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany?.id || "",
          "x-brand-id": currentBrand?.id || "",
          "x-season-id": currentSeason?.id || "",
        },
        body: JSON.stringify(updates),
      });
      await fetchTodos();
    } catch (err) {
      console.error("更新待办失败:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  // 操作：删除
  const deleteTodo = async (id: string) => {
    if (!confirm("确定要删除这个待办吗？")) return;
    setUpdatingId(id);
    try {
      await fetch(`/api/todos/${id}`, {
        method: "DELETE",
        headers: {
          "x-company-id": currentCompany?.id || "",
          "x-brand-id": currentBrand?.id || "",
          "x-season-id": currentSeason?.id || "",
        },
      });
      await fetchTodos();
    } catch (err) {
      console.error("删除待办失败:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">待办中心</h1>
            <p className="text-sm text-slate-500">
              {currentBrand ? (
                <>
                  <span className="font-medium text-slate-700">{currentBrand.name}</span>
                  {currentSeason && <span className="mx-2">·</span>}
                  {currentSeason && <span>{currentSeason.name}</span>}
                </>
              ) : (
                "加载中..."
              )}
            </p>
          </div>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard
            label="总待办"
            value={stats.total}
            icon={ListTodo}
            color="slate"
          />
          <StatCard
            label="待处理"
            value={stats.pending}
            icon={Clock}
            color="amber"
            highlight={stats.overdue > 0}
            subtext={stats.overdue > 0 ? `${stats.overdue} 项已逾期` : "没有逾期"}
          />
          <StatCard
            label="进行中"
            value={stats.inProgress}
            icon={Sparkles}
            color="blue"
          />
          <StatCard
            label="已完成"
            value={stats.completed}
            icon={CheckCircle2}
            color="green"
          />
        </div>

        {/* 状态切换 + 优先级筛选 */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {(["pending", "in_progress", "completed", "all"] as StatusFilter[]).map((s) => {
              const config: Record<StatusFilter, { label: string }> = {
                pending: { label: "待处理" },
                in_progress: { label: "进行中" },
                completed: { label: "已完成" },
                all: { label: "全部" },
              };
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    statusFilter === s
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {config[s].label}
                </button>
              );
            })}
          </div>

          <select
            value={priorityFilter || ""}
            onChange={(e) => setPriorityFilter(e.target.value || null)}
            className="h-8 px-2.5 rounded-md border border-slate-200 text-xs bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <option value="">全优先级</option>
            <option value="urgent">紧急</option>
            <option value="high">高</option>
            <option value="medium">中</option>
            <option value="low">低</option>
          </select>

          <button
            onClick={() => setShowMineOnly((v) => !v)}
            className={`h-8 px-3 rounded-md border text-xs font-medium flex items-center gap-1.5 transition-colors ${
              showMineOnly
                ? "bg-navy-50 border-navy-200 text-navy-700"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
            title="仅看我负责的待办"
          >
            <User className="h-3.5 w-3.5" />
            {showMineOnly ? "仅看我负责的" : "看我负责的"}
          </button>

          <div className="ml-auto text-sm text-slate-500">
            共 <span className="font-semibold text-slate-700">{filtered.length}</span> 项
          </div>
        </div>

        {/* 列表 */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载待办...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Inbox className="h-12 w-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">
              {statusFilter === "pending" ? "当前没有待处理事项" : "暂无待办"}
            </p>
            {statusFilter === "pending" && (
              <p className="text-xs text-slate-400 mt-1">享受片刻宁静，或去款式开发中创建一些任务</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((todo) => {
              const priority = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
              const status = STATUS_CONFIG[todo.status] || STATUS_CONFIG.pending;
              const isOverdue =
                todo.status === "pending" && todo.dueDate && new Date(todo.dueDate) < new Date();
              const isUpdating = updatingId === todo.id;
              return (
                <div
                  key={todo.id}
                  className={`flex items-start gap-3 p-4 rounded-lg border transition-all ${
                    todo.status === "completed"
                      ? "border-slate-200 bg-slate-50/50"
                      : isOverdue
                      ? "border-red-200 bg-red-50/30"
                      : "border-slate-200 hover:border-slate-300 hover:shadow-sm bg-white"
                  }`}
                >
                  {/* 完成按钮 */}
                  <button
                    onClick={() =>
                      updateTodo(todo.id, {
                        status: todo.status === "completed" ? "pending" : "completed",
                      })
                    }
                    disabled={isUpdating}
                    className={`flex-shrink-0 mt-0.5 h-5 w-5 rounded border-2 transition-colors flex items-center justify-center disabled:opacity-50 ${
                      todo.status === "completed"
                        ? "border-green-500 bg-green-500"
                        : "border-slate-300 hover:border-green-500 hover:bg-green-50 group"
                    }`}
                    title={todo.status === "completed" ? "标记为待处理" : "标记完成"}
                  >
                    {isUpdating ? (
                      <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                    ) : todo.status === "completed" ? (
                      <Check className="h-3 w-3 text-white" />
                    ) : (
                      <Check className="h-3 w-3 text-transparent group-hover:text-green-600" />
                    )}
                  </button>

                  {/* 内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <p
                        className={`text-sm font-medium cursor-pointer hover:underline ${
                          todo.status === "completed"
                            ? "text-slate-500 line-through"
                            : "text-slate-800"
                        }`}
                        onClick={() => router.push(`/todos/${todo.id}`)}
                      >
                        {todo.title}
                      </p>
                      <Badge variant="outline" className={`text-[10px] h-4 ${priority.color}`}>
                        {priority.label}
                      </Badge>
                      {isOverdue && (
                        <Badge variant="destructive" className="text-[10px] h-4">
                          逾期
                        </Badge>
                      )}
                      {todo.status === "in_progress" && (
                        <Badge variant="outline" className={`text-[10px] h-4 ${status.color}`}>
                          进行中
                        </Badge>
                      )}
                    </div>
                    {todo.description && (
                      <p className="text-xs text-slate-500 mb-1">{todo.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      {todo.dueDate && (
                        <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                          <Clock className="h-3 w-3 inline mr-0.5" />
                          {new Date(todo.dueDate).toLocaleString("zh-CN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "numeric",
                            minute: "numeric",
                          })}
                        </span>
                      )}
                      {todo.targetTable && todo.targetId && (
                        <span className="text-slate-400">· {todo.targetTable}</span>
                      )}
                    </div>
                  </div>

                  {/* 操作 */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {todo.targetTable === "styles" && todo.targetId && (
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/styles/${todo.targetId}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    )}
                    {todo.status === "completed" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => updateTodo(todo.id, { status: "pending" })}
                        disabled={isUpdating}
                        title="重开"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTodo(todo.id)}
                      disabled={isUpdating}
                      className="text-slate-400 hover:text-red-600"
                      title="删除"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

// 统计卡
function StatCard({
  label,
  value,
  icon: Icon,
  color,
  highlight,
  subtext,
}: {
  label: string;
  value: number;
  icon: any;
  color: "slate" | "amber" | "blue" | "green";
  highlight?: boolean;
  subtext?: string;
}) {
  const colorMap = {
    slate: "bg-slate-50 text-slate-600",
    amber: "bg-amber-50 text-amber-600",
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
  };
  return (
    <Card
      className={`border-0 shadow-sm transition-all ${
        highlight ? "ring-2 ring-red-200" : ""
      }`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg ${colorMap[color]}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{label}</p>
        {subtext && <p className="text-xs text-slate-400 mt-0.5">{subtext}</p>}
      </CardContent>
    </Card>
  );
}
