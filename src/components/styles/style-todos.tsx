"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/lib/auth/tenant-context";
import { supabase } from "@/lib/auth/supabase";
import {
  Check,
  Loader2,
  Plus,
  Trash2,
  RotateCcw,
  Calendar,
  AlertCircle,
  FileText,
  ChevronRight,
} from "lucide-react";

interface StyleTodo {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  createdAt: string;
  assignedTo: string | null;
}

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  in_progress: "bg-blue-100 text-blue-700 border-blue-200",
  completed: "bg-green-100 text-green-700 border-green-200",
};

const PRIORITY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-amber-100 text-amber-700 border-amber-200",
  low: "bg-slate-100 text-slate-600 border-slate-200",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  in_progress: "进行中",
  completed: "已完成",
};

const PRIORITY_LABELS: Record<string, string> = {
  urgent: "紧急",
  high: "高",
  medium: "中",
  low: "低",
};

interface StyleTodosProps {
  styleId: string;
}

export function StyleTodos({ styleId }: StyleTodosProps) {
  const { currentBrand, currentSeason, currentCompany } = useTenant();
  const [todos, setTodos] = useState<StyleTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDueDate, setNewDueDate] = useState("");

  const getHeaders = () => ({
    "x-company-id": currentCompany?.id || "",
    "x-brand-id": currentBrand?.id || "",
    "x-season-id": currentSeason?.id || "",
  });

  const fetchTodos = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(
        `/api/todos?targetTable=styles&targetId=${styleId}`,
        { headers: getHeaders() }
      );
      if (!res.ok) throw new Error("获取待办失败");
      const data = await res.json();
      const items: StyleTodo[] = Array.isArray(data) ? data : [];
      setTodos(items);
    } catch (err: any) {
      setError(err?.message || "加载失败");
    } finally {
      setLoading(false);
    }
  };

  const createTodo = async () => {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/todos", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDescription.trim() || null,
          type: "task",
          priority: newPriority,
          targetTable: "styles",
          targetId: styleId,
          assignedTo: currentUserId,
          dueDate: newDueDate || null,
        }),
      });
      if (!res.ok) throw new Error("创建待办失败");
      setNewTitle("");
      setNewDescription("");
      setNewPriority("medium");
      setNewDueDate("");
      await fetchTodos();
    } catch (err: any) {
      setError(err?.message || "创建失败");
    } finally {
      setCreating(false);
    }
  };

  const updateStatus = async (todoId: string, status: string) => {
    setUpdatingId(todoId);
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getHeaders(),
        },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("更新失败");
      await fetchTodos();
    } catch (err: any) {
      setError(err?.message || "更新失败");
    } finally {
      setUpdatingId(null);
    }
  };

  const deleteTodo = async (todoId: string) => {
    if (!confirm("确定删除这个待办？")) return;
    setUpdatingId(todoId);
    try {
      const res = await fetch(`/api/todos/${todoId}`, {
        method: "DELETE",
        headers: getHeaders(),
      });
      if (!res.ok) throw new Error("删除失败");
      await fetchTodos();
    } catch (err: any) {
      setError(err?.message || "删除失败");
    } finally {
      setUpdatingId(null);
    }
  };

  useEffect(() => {
    fetchTodos();
    const getUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user?.id) setCurrentUserId(data.user.id);
    };
    getUser();
  }, [styleId, currentBrand?.id]);

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 rounded-xl border border-red-200 bg-red-50 text-red-700 text-sm flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* 新建待办 */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="h-4 w-4 text-navy-700" />
            新建待办
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Input
              placeholder="待办标题"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1"
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="h-10 px-3 rounded-md border border-input bg-background text-sm"
            >
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-auto"
            />
          </div>
          <Input
            placeholder="补充描述（可选）"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
          />
          <div className="flex justify-end">
            <Button
              onClick={createTodo}
              disabled={creating || !newTitle.trim()}
              size="sm"
              className="bg-navy-700 hover:bg-navy-800 text-white"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1.5" />}
              添加待办
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 待办列表 */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4 text-navy-700" />
            关联待办
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {loading ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-terracotta-500" />
            </div>
          ) : todos.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-sand-100 flex items-center justify-center">
                <Check className="h-6 w-6 text-sand-400" />
              </div>
              暂无关联待办
            </div>
          ) : (
            <div className="space-y-2">
              {todos.map((todo) => (
                <div
                  key={todo.id}
                  className="p-4 rounded-xl border border-border bg-card hover:border-navy-200 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <a
                          href={`/todos/${todo.id}`}
                          className="font-medium text-sm text-foreground hover:underline truncate"
                        >
                          {todo.title}
                        </a>
                        <Badge variant="outline" className={STATUS_STYLES[todo.status] || STATUS_STYLES.pending}>
                          {STATUS_LABELS[todo.status] || todo.status}
                        </Badge>
                        <Badge variant="outline" className={PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.medium}>
                          {PRIORITY_LABELS[todo.priority] || todo.priority}
                        </Badge>
                      </div>
                      {todo.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{todo.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {todo.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            截止 {new Date(todo.dueDate).toLocaleDateString("zh-CN")}
                          </span>
                        )}
                        <span>创建于 {new Date(todo.createdAt).toLocaleDateString("zh-CN")}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {todo.status !== "completed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => updateStatus(todo.id, "completed")}
                          disabled={updatingId === todo.id}
                        >
                          {updatingId === todo.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                      )}
                      {todo.status === "completed" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => updateStatus(todo.id, "pending")}
                          disabled={updatingId === todo.id}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-red-50"
                        onClick={() => deleteTodo(todo.id)}
                        disabled={updatingId === todo.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <a
                        href={`/todos/${todo.id}`}
                        className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-sand-100 text-muted-foreground"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
