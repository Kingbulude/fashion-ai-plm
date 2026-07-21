"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/auth/tenant-context";
import { useApi } from "@/lib/api/use-api";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  TrendingUp,
  Sparkles,
  Package,
  Factory,
  Palette,
  ShoppingCart,
  Wrench,
  FileText,
  Box,
  ArrowRight,
  Check,
  RefreshCw,
  Loader2,
  ChevronRight,
  CircleDot,
  Layers,
  ListTodo,
  ShieldAlert,
  Plus,
  BarChart3,
} from "lucide-react";

const PIPELINE_STAGES = [
  { key: "planning", label: "企划中", icon: Sparkles, color: "slate" },
  { key: "designing", label: "设计中", icon: Palette, color: "blue" },
  { key: "sampling", label: "打样中", icon: Wrench, color: "amber" },
  { key: "sampled", label: "封样", icon: CheckCircle2, color: "yellow" },
  { key: "producing", label: "生产中", icon: Factory, color: "green" },
  { key: "produced", label: "已生产", icon: Package, color: "emerald" },
  { key: "selling", label: "销售中", icon: ShoppingCart, color: "purple" },
];

const STAGE_COLOR_MAP: Record<string, { bg: string; text: string; bar: string }> = {
  slate: { bg: "bg-slate-100", text: "text-slate-700", bar: "bg-slate-500" },
  blue: { bg: "bg-blue-100", text: "text-blue-700", bar: "bg-blue-500" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", bar: "bg-amber-500" },
  yellow: { bg: "bg-yellow-100", text: "text-yellow-700", bar: "bg-yellow-500" },
  green: { bg: "bg-green-100", text: "text-green-700", bar: "bg-green-500" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", bar: "bg-emerald-500" },
  purple: { bg: "bg-purple-100", text: "text-purple-700", bar: "bg-purple-500" },
};

const PRIORITY_CONFIG: Record<string, { label: string; className: string }> = {
  urgent: { label: "紧急", className: "badge-destructive" },
  high: { label: "高", className: "badge-warning" },
  medium: { label: "中", className: "bg-navy-100 text-navy-700" },
  low: { label: "低", className: "bg-sand-200 text-slate-600" },
};

const RISK_LEVEL_CONFIG: Record<string, { label: string; className: string; icon: any }> = {
  urgent: { label: "紧急", className: "bg-red-50 text-red-700 border-red-200", icon: AlertTriangle },
  high: { label: "高", className: "bg-orange-50 text-orange-700 border-orange-200", icon: AlertTriangle },
  medium: { label: "中", className: "bg-amber-50 text-amber-700 border-amber-200", icon: AlertCircle },
  low: { label: "低", className: "bg-sand-100 text-slate-700 border-sand-200", icon: CircleDot },
};

export default function DashboardPage() {
  const { currentBrand, currentSeason, currentCompany } = useTenant();
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

  const stageCounts = useMemo(() => {
    if (!workspace?.stylesByStatus) {
      return PIPELINE_STAGES.reduce((acc, s) => ({ ...acc, [s.key]: 0 }), {} as Record<string, number>);
    }
    return PIPELINE_STAGES.reduce((acc, s) => {
      acc[s.key] = (workspace.stylesByStatus[s.key] || []).length;
      return acc;
    }, {} as Record<string, number>);
  }, [workspace]);

  const totalActive = useMemo(() => Object.values(stageCounts).reduce((sum, n) => sum + n, 0), [stageCounts]);

  const summary = workspace?.summary || {
    totalStyles: 0,
    pendingTodos: 0,
    overdueCount: 0,
    highRiskCount: 0,
  };

  return (
    <SidebarLayout>
      <div className="max-w-[1800px] mx-auto space-y-8 animate-fadeIn">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">工作台</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {currentBrand ? (
                <>
                  <span className="font-medium text-foreground">{currentBrand.name}</span>
                  {currentSeason && <span className="mx-2 text-border">·</span>}
                  {currentSeason && <span>{currentSeason.name}</span>}
                  <span className="mx-2 text-border">·</span>
                  <span>今天该做什么</span>
                </>
              ) : (
                "加载品牌上下文中..."
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadWorkspace(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button size="sm" className="bg-primary hover:bg-navy-800 shadow-premium" asChild>
              <Link href="/planning">
                <Plus className="h-4 w-4 mr-1.5" />
                新建企划
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-24 flex flex-col items-center justify-center text-muted-foreground gap-3">
            <Loader2 className="h-6 w-6 animate-spin text-terracotta-500" />
            <p className="text-sm">加载工作台数据...</p>
          </div>
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium text-destructive">加载失败</p>
                  <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadWorkspace()} className="ml-auto">
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* KPI Metrics - Bento Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
              <SummaryCard
                title="款式总数"
                value={summary.totalStyles}
                icon={BarChart3}
                color="navy"
                subtitle={`本品牌在开发中款式`}
                href="/styles"
              />
              <SummaryCard
                title="待办事项"
                value={summary.pendingTodos}
                icon={ListTodo}
                color="terracotta"
                subtitle={summary.overdueCount > 0 ? `其中 ${summary.overdueCount} 项已逾期` : "暂无逾期"}
                highlight={summary.overdueCount > 0}
                href="/todos"
              />
              <SummaryCard
                title="高风险"
                value={summary.highRiskCount}
                icon={ShieldAlert}
                color="red"
                subtitle={summary.highRiskCount > 0 ? "需立即处理" : "当前无高风险"}
                highlight={summary.highRiskCount > 0}
              />
              <SummaryCard
                title="活跃款式"
                value={totalActive}
                icon={Layers}
                color="green"
                subtitle="7 大阶段款式分布"
                href="/styles"
              />
            </div>

            {/* Risk Alert */}
            {workspace?.risks && workspace.risks.length > 0 && (
              <Card className="card-premium border-terracotta-100">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                      <ShieldAlert className="h-4 w-4 text-terracotta-500" />
                      风险预警
                      <Badge className="ml-1 bg-terracotta-100 text-terracotta-600 hover:bg-terracotta-100">
                        {workspace.risks.length}
                      </Badge>
                    </CardTitle>
                    <span className="text-xs text-muted-foreground">实时检测</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {workspace.risks.slice(0, 6).map((risk: any, i: number) => {
                      const config = RISK_LEVEL_CONFIG[risk.level] || RISK_LEVEL_CONFIG.low;
                      const Icon = config.icon;
                      return (
                        <Link
                          key={i}
                          href={risk.styleId ? `/styles/${risk.styleId}` : "#"}
                          className={`flex items-center gap-3 p-3 rounded-xl border ${config.className} hover:shadow-md transition-all`}
                        >
                          <div className={`p-1.5 rounded-lg bg-white/60`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="text-sm font-semibold">{risk.title}</p>
                              <Badge variant="outline" className={`text-[10px] h-4 border-current/30`}>
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-foreground/70 mt-0.5 truncate">{risk.message}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 opacity-50 flex-shrink-0" />
                        </Link>
                      );
                    })}
                    {workspace.risks.length > 6 && (
                      <div className="text-center pt-2">
                        <Button variant="link" size="sm" asChild>
                          <Link href="/todos">查看全部 {workspace.risks.length} 个风险</Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Main Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Todos */}
              <Card className="card-premium">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                        <ListTodo className="h-4 w-4 text-terracotta-500" />
                        今日待办
                        {summary.overdueCount > 0 && (
                          <Badge className="ml-1 bg-destructive/10 text-destructive hover:bg-destructive/10">
                            {summary.overdueCount} 逾期
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">按优先级排序，点击完成快速处理</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/todos">查看全部</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!workspace?.todos || workspace.todos.length === 0 ? (
                    <div className="py-14 text-center">
                      <div className="w-14 h-14 rounded-2xl bg-emerald-50 flex items-center justify-center mx-auto mb-3">
                        <CheckCircle2 className="h-7 w-7 text-emerald-500" />
                      </div>
                      <p className="text-sm font-medium text-foreground">今日没有待办</p>
                      <p className="text-xs text-muted-foreground mt-1">所有事情都处理完了，享受片刻宁静</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workspace.todos.slice(0, 8).map((todo: any) => {
                        const priorityConfig = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
                        const isOverdue = todo.due_date && new Date(todo.due_date) < new Date();
                        return (
                          <div
                            key={todo.id}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                              isOverdue
                                ? "border-destructive/20 bg-destructive/5"
                                : "border-border hover:border-terracotta-100 hover:bg-sand-50"
                            }`}
                          >
                            <button
                              onClick={() => handleCompleteTodo(todo.id)}
                              disabled={completingTodoId === todo.id}
                              className="flex-shrink-0 h-5 w-5 rounded-md border-2 border-border hover:border-emerald-500 hover:bg-emerald-50 transition-colors flex items-center justify-center group disabled:opacity-50"
                              title="标记完成"
                            >
                              {completingTodoId === todo.id ? (
                                <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                              ) : (
                                <Check className="h-3 w-3 text-transparent group-hover:text-emerald-600" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-foreground truncate">{todo.title}</p>
                                <Badge variant="outline" className={`text-[10px] h-5 ${priorityConfig.className}`}>
                                  {priorityConfig.label}
                                </Badge>
                                {isOverdue && <Badge className="text-[10px] h-5 badge-destructive">逾期</Badge>}
                              </div>
                              {todo.description && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate">{todo.description}</p>
                              )}
                              {todo.due_date && (
                                <p className={`text-xs mt-1 flex items-center gap-0.5 ${isOverdue ? "text-destructive" : "text-muted-foreground"}`}>
                                  <Clock className="h-3 w-3" />
                                  {new Date(todo.due_date).toLocaleString("zh-CN", {
                                    month: "numeric",
                                    day: "numeric",
                                    hour: "numeric",
                                    minute: "numeric",
                                  })}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Pipeline */}
              <Card className="card-premium">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                    <TrendingUp className="h-4 w-4 text-navy-500" />
                    款式流水线
                  </CardTitle>
                  <CardDescription className="text-xs">7 大阶段款式分布</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    {PIPELINE_STAGES.map((stage) => {
                      const count = stageCounts[stage.key] || 0;
                      const colors = STAGE_COLOR_MAP[stage.color];
                      const Icon = stage.icon;
                      const max = Math.max(...Object.values(stageCounts), 1);
                      const pct = max > 0 ? (count / max) * 100 : 0;
                      return (
                        <div
                          key={stage.key}
                          className="p-4 rounded-xl border border-border bg-sand-50/50 hover:bg-sand-50 hover:shadow-sm transition-all group cursor-pointer"
                        >
                          <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-xl ${colors.bg}`}>
                              <Icon className={`h-4 w-4 ${colors.text}`} />
                            </div>
                            <span className={`text-lg font-bold ${colors.text}`}>{count}</span>
                          </div>
                          <p className="text-sm font-medium text-foreground mb-3">{stage.label}</p>
                          <div className="h-2 bg-sand-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-2">{pct.toFixed(0)}% 占比</p>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Styles */}
            <Card className="card-premium">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                      <Sparkles className="h-4 w-4 text-navy-500" />
                      最近款式
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">最近更新的 6 个款式</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/styles">查看全部</Link>
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!workspace?.recentStyles || workspace.recentStyles.length === 0 ? (
                  <div className="py-14 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
                      <Box className="h-7 w-7 text-muted-foreground" />
                    </div>
                    <p className="text-sm font-medium text-foreground">还没有款式</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/styles">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        创建第一个款式
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {workspace.recentStyles.map((style: any) => {
                      const stageInfo = PIPELINE_STAGES.find((s) => s.key === style.status);
                      const colors = stageInfo ? STAGE_COLOR_MAP[stageInfo.color] : STAGE_COLOR_MAP.slate;
                      return (
                        <Link
                          key={style.id}
                          href={`/styles/${style.id}`}
                          className="block p-4 rounded-xl border border-border bg-card hover:border-terracotta-200 hover:shadow-md transition-all group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-foreground truncate">{style.name}</p>
                            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-terracotta-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                          </div>
                          <p className="text-xs text-muted-foreground mb-3">款号: {style.style_no}</p>
                          <div className="flex items-center justify-between">
                            <Badge className={`${colors.bg} ${colors.text} border-0`}>
                              {stageInfo?.label || style.status}
                            </Badge>
                            <p className="text-xs text-muted-foreground">
                              {new Date(style.updated_at).toLocaleDateString("zh-CN", {
                                month: "numeric",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          {style.target_cost && (
                            <p className="text-xs text-muted-foreground mt-3 pt-3 border-t border-border">
                              目标: <span className="font-medium text-foreground">¥{style.target_cost}</span>
                              {style.actual_cost && (
                                <>
                                  {" / 实际: "}
                                  <span className={`font-medium ${style.actual_cost > style.target_cost ? "text-destructive" : "text-foreground"}`}>
                                    ¥{style.actual_cost}
                                  </span>
                                </>
                              )}
                            </p>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <QuickLink href="/planning" icon={FileText} label="企划中心" desc="品牌季规划" color="navy" />
              <QuickLink href="/styles" icon={Package} label="款式开发" desc="款式 BOM/打样" color="terracotta" />
              <QuickLink href="/suppliers" icon={Factory} label="供应链" desc="供应商/采购" color="green" />
              <QuickLink href="/analytics" icon={BarChart3} label="经营反馈" desc="销售/复盘数据" color="blue" />
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  highlight,
  href,
}: {
  title: string;
  value: number;
  icon: any;
  color: "navy" | "terracotta" | "red" | "green" | "blue";
  subtitle: string;
  highlight?: boolean;
  href?: string;
}) {
  const colorMap = {
    navy: { iconBg: "bg-navy-100", iconText: "text-navy-600", highlight: "ring-navy-200 bg-navy-50/40" },
    terracotta: { iconBg: "bg-terracotta-100", iconText: "text-terracotta-600", highlight: "ring-terracotta-200 bg-terracotta-50/40" },
    red: { iconBg: "bg-red-50", iconText: "text-red-600", highlight: "ring-red-200 bg-red-50/40" },
    green: { iconBg: "bg-emerald-50", iconText: "text-emerald-600", highlight: "ring-emerald-200 bg-emerald-50/40" },
    blue: { iconBg: "bg-blue-50", iconText: "text-blue-600", highlight: "ring-blue-200 bg-blue-50/40" },
  };
  const c = colorMap[color];

  const content = (
    <Card
      className={`card-premium transition-all ${highlight ? `ring-2 ${c.highlight}` : ""} ${href ? "hover:shadow-lg cursor-pointer" : ""}`}
    >
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${c.iconBg}`}>
            <Icon className={`h-5 w-5 ${c.iconText}`} />
          </div>
        </div>
        <p className="data-value">{value}</p>
        <p className="text-xs font-medium text-muted-foreground mt-1">{title}</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5 truncate">{subtitle}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

function QuickLink({
  href,
  icon: Icon,
  label,
  desc,
  color,
}: {
  href: string;
  icon: any;
  label: string;
  desc: string;
  color: "navy" | "terracotta" | "green" | "blue";
}) {
  const colorMap = {
    navy: "bg-navy-100 text-navy-600 group-hover:bg-navy-200",
    terracotta: "bg-terracotta-100 text-terracotta-600 group-hover:bg-terracotta-200",
    green: "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100",
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-terracotta-200 hover:shadow-md transition-all group"
    >
      <div className={`p-2.5 rounded-xl ${colorMap[color]} transition-colors`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-terracotta-500 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
