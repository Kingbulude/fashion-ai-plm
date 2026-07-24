"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/lib/auth/tenant-context";
import { supabase } from "@/lib/auth/supabase";
import {
  ArrowLeft,
  Check,
  RotateCcw,
  Trash2,
  Loader2,
  Clock,
  Calendar,
  AlertCircle,
  ExternalLink,
  User,
  FileText,
  Package,
  Sparkles,
  Wrench,
  Building2,
} from "lucide-react";

export const runtime = "edge";

interface TodoDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  completedAt: string | null;
  targetTable: string | null;
  targetId: string | null;
  assignedTo: string | null;
  createdBy: string | null;
  isRead: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  pending: { label: "待处理", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  in_progress: { label: "进行中", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200" },
  completed: { label: "已完成", color: "text-green-700", bg: "bg-green-50", border: "border-green-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  urgent: { label: "紧急", color: "text-red-700", bg: "bg-red-50", border: "border-red-200" },
  high: { label: "高", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  medium: { label: "中", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  low: { label: "低", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
};

const TYPE_ICON: Record<string, React.ElementType> = {
  styles: Package,
  design: Sparkles,
  sampling: Wrench,
  production: Building2,
  task: FileText,
};

function formatDate(value: string | null | undefined): string {
  if (!value) return "未设置";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "无效日期";
  return d.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTargetHref(todo: TodoDetail): string | null {
  if (!todo.targetTable || !todo.targetId) return null;
  if (todo.targetTable === "styles") return `/styles/${todo.targetId}`;
  return null;
}

function getTargetLabel(targetTable: string | null): string {
  switch (targetTable) {
    case "styles":
      return "关联款式";
    case "design":
      return "关联设计";
    case "sampling":
      return "关联打样";
    case "production":
      return "关联生产";
    default:
      return "关联对象";
  }
}

export default function TodoDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const { currentBrand, currentCompany, currentSeason } = useTenant();

  const [todo, setTodo] = useState<TodoDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [updating, setUpdating] = useState(false);
  const [names, setNames] = useState<{ assignee?: string; creator?: string }>({});

  const fetchTodo = async (todoId: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        headers: {
          "x-company-id": currentCompany?.id || "",
          "x-brand-id": currentBrand?.id || "",
          "x-season-id": currentSeason?.id || "",
        },
      });
      if (!res.ok) throw new Error("获取待办失败");
      const data = await res.json();
      setTodo(data);
      fetchNames(data.assignedTo, data.createdBy);
      if (data.isRead === false) {
        await fetch(`/api/todos/${todoId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "x-company-id": currentCompany?.id || "",
            "x-brand-id": currentBrand?.id || "",
            "x-season-id": currentSeason?.id || "",
          },
          body: JSON.stringify({ isRead: true }),
        });
      }
    } catch (err: any) {
      setError(err?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchNames = async (assignedTo?: string | null, createdBy?: string | null) => {
    const ids = [assignedTo, createdBy].filter(Boolean) as string[];
    if (ids.length === 0) return;
    try {
      const { data } = await supabase.from("profiles").select("user_id, name").in("user_id", ids);
      const map: Record<string, string> = {};
      (data || []).forEach((p: any) => {
        map[p.user_id] = p.name || p.user_id;
      });
      setNames({
        assignee: assignedTo ? map[assignedTo] || assignedTo : undefined,
        creator: createdBy ? map[createdBy] || createdBy : undefined,
      });
    } catch {
      setNames({
        assignee: assignedTo || undefined,
        creator: createdBy || undefined,
      });
    }
  };

  const updateStatus = async (status: string) => {
    if (!todo) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "x-company-id": currentCompany?.id || "",
          "x-brand-id": currentBrand?.id || "",
          "x-season-id": currentSeason?.id || "",
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("更新失败");
      await fetchTodo(todo.id);
    } catch (err: any) {
      setError(err?.message || "更新失败");
    } finally {
      setUpdating(false);
    }
  };

  const deleteTodo = async () => {
    if (!todo) return;
    if (!confirm("确定要删除这个待办吗？删除后不可恢复。")) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/todos/${todo.id}`, {
        method: "DELETE",
        headers: {
          "x-company-id": currentCompany?.id || "",
          "x-brand-id": currentBrand?.id || "",
          "x-season-id": currentSeason?.id || "",
        },
      });
      if (!res.ok) throw new Error("删除失败");
      router.push("/todos");
    } catch (err: any) {
      setError(err?.message || "删除失败");
      setUpdating(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!id) return;
      if (!cancelled) await fetchTodo(id);
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [id, currentBrand?.id, currentSeason?.id]);

  if (loading) {
    return (
      <SidebarLayout>
        <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-terracotta-500" />
            <p className="text-sm">加载待办详情...</p>
          </div>
        </div>
      </SidebarLayout>
    );
  }

  if (error || !todo) {
    return (
      <SidebarLayout>
        <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
          <Card className="card-premium border-destructive/30 bg-red-50">
            <CardContent className="p-6 flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-destructive">加载失败</p>
                <p className="text-sm text-muted-foreground mt-1">{error || "待办不存在或已被删除"}</p>
                <Button variant="outline" size="sm" className="mt-4" onClick={() => router.push("/todos")}>
                  返回待办列表
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    );
  }

  const statusCfg = STATUS_CONFIG[todo.status] || STATUS_CONFIG.pending;
  const priorityCfg = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
  const targetHref = getTargetHref(todo);
  const TargetIcon = (todo.targetTable && TYPE_ICON[todo.targetTable]) || FileText;

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1200px] mx-auto">
        {/* 顶部导航 */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 -ml-2 text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/todos")}
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          返回待办列表
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 主内容 */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="card-premium">
              <CardContent className="p-6">
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  <Badge variant="outline" className={`${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}>
                    {statusCfg.label}
                  </Badge>
                  <Badge variant="outline" className={`${priorityCfg.bg} ${priorityCfg.color} ${priorityCfg.border}`}>
                    {priorityCfg.label}优先级
                  </Badge>
                </div>

                <h1 className="text-2xl font-bold text-foreground mb-4">{todo.title}</h1>

                {todo.description ? (
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {todo.description}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">暂无描述</p>
                )}
              </CardContent>
            </Card>

            {/* 目标对象 */}
            {todo.targetTable && todo.targetId && (
              <Card className="card-premium">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TargetIcon className="h-4 w-4 text-navy-700" />
                    {getTargetLabel(todo.targetTable)}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {targetHref ? (
                    <Button variant="outline" size="sm" className="border-navy-200 text-navy-700 hover:bg-navy-50" asChild>
                      <a href={targetHref}>
                        查看关联对象
                        <ExternalLink className="h-3.5 w-3.5 ml-1.5" />
                      </a>
                    </Button>
                  ) : (
                    <p className="text-sm text-muted-foreground">ID: {todo.targetId}</p>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* 侧边信息 */}
          <div className="space-y-6">
            <Card className="card-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">操作</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-2">
                {todo.status !== "completed" && (
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                    size="sm"
                    onClick={() => updateStatus("completed")}
                    disabled={updating}
                  >
                    {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
                    标记完成
                  </Button>
                )}
                {todo.status === "completed" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => updateStatus("pending")}
                    disabled={updating}
                  >
                    <RotateCcw className="h-4 w-4 mr-1.5" />
                    重新打开
                  </Button>
                )}
                {todo.status === "pending" && (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="sm"
                    onClick={() => updateStatus("in_progress")}
                    disabled={updating}
                  >
                    <Clock className="h-4 w-4 mr-1.5" />
                    标记进行中
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="w-full text-destructive hover:bg-red-50 hover:text-destructive"
                  size="sm"
                  onClick={deleteTodo}
                  disabled={updating}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  删除
                </Button>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">详情</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4 text-sm">
                <div className="flex items-start gap-3">
                  <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">负责人</p>
                    <p className="font-medium text-foreground">{names.assignee || todo.assignedTo || "未分配"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">截止日期</p>
                    <p className="font-medium text-foreground">{formatDate(todo.dueDate)}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-muted-foreground">创建时间</p>
                    <p className="font-medium text-foreground">{formatDate(todo.createdAt)}</p>
                  </div>
                </div>
                {todo.completedAt && (
                  <div className="flex items-start gap-3">
                    <Check className="h-4 w-4 text-emerald-600 mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">完成时间</p>
                      <p className="font-medium text-emerald-700">{formatDate(todo.completedAt)}</p>
                    </div>
                  </div>
                )}
                {names.creator && (
                  <div className="flex items-start gap-3">
                    <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-muted-foreground">创建人</p>
                      <p className="font-medium text-foreground">{names.creator}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
