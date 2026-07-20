// 工作台首页 - 集团多品牌"作战室"
// 核心目标：3 秒看清"今天该做什么"——待办、逾期、风险、款式进度

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
  X,
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

// 7 大阶段展示顺序
const PIPELINE_STAGES = [
  { key: "planning", label: "企划中", icon: Sparkles, color: "slate" },
  { key: "designing", label: "设计中", icon: Palette, color: "blue" },
  { key: "sampling", label: "打样中", icon: Wrench, color: "amber" },
  { key: "sampled", label: "封样", icon: CheckCircle2, color: "yellow" },
  { key: "producing", label: "生产中", icon: Factory, color: "green" },
  { key: "produced", label: "已生产", icon: Package, color: "emerald" },
  { key: "selling", label: "销售中", icon: ShoppingCart, color: "purple" },
];

const STAGE_COLOR_MAP: Record<string, { bg: string; text: string; ring: string }> = {
  slate: { bg: "bg-slate-50", text: "text-slate-700", ring: "ring-slate-200" },
  blue: { bg: "bg-blue-50", text: "text-blue-700", ring: "ring-blue-200" },
  amber: { bg: "bg-amber-50", text: "text-amber-700", ring: "ring-amber-200" },
  yellow: { bg: "bg-yellow-50", text: "text-yellow-700", ring: "ring-yellow-200" },
  green: { bg: "bg-green-50", text: "text-green-700", ring: "ring-green-200" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200" },
  purple: { bg: "bg-purple-50", text: "text-purple-700", ring: "ring-purple-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string }> = {
  urgent: { label: "紧急", color: "bg-red-100 text-red-700 border-red-200" },
  high: { label: "高", color: "bg-orange-100 text-orange-700 border-orange-200" },
  medium: { label: "中", color: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "低", color: "bg-slate-100 text-slate-600 border-slate-200" },
};

const RISK_LEVEL_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: any }> = {
  urgent: {
    label: "紧急",
    bg: "bg-red-50",
    text: "text-red-700",
    border: "border-red-200",
    icon: AlertTriangle,
  },
  high: {
    label: "高",
    bg: "bg-orange-50",
    text: "text-orange-700",
    border: "border-orange-200",
    icon: AlertTriangle,
  },
  medium: {
    label: "中",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
    icon: AlertCircle,
  },
  low: {
    label: "低",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    icon: CircleDot,
  },
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
      // 重新加载工作台
      await loadWorkspace(true);
    } catch (err) {
      console.error("完成待办失败:", err);
    } finally {
      setCompletingTodoId(null);
    }
  };

  // 计算阶段数量
  const stageCounts = useMemo(() => {
    if (!workspace?.stylesByStatus) {
      return PIPELINE_STAGES.reduce((acc, s) => ({ ...acc, [s.key]: 0 }), {} as Record<string, number>);
    }
    return PIPELINE_STAGES.reduce((acc, s) => {
      acc[s.key] = (workspace.stylesByStatus[s.key] || []).length;
      return acc;
    }, {} as Record<string, number>);
  }, [workspace]);

  const totalActive = useMemo(
    () => Object.values(stageCounts).reduce((sum, n) => sum + n, 0),
    [stageCounts]
  );

  const summary = workspace?.summary || {
    totalStyles: 0,
    pendingTodos: 0,
    overdueCount: 0,
    highRiskCount: 0,
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">工作台</h1>
            <p className="text-sm text-slate-500">
              {currentBrand ? (
                <>
                  <span className="font-medium text-slate-700">{currentBrand.name}</span>
                  {currentSeason && <span className="mx-2">·</span>}
                  {currentSeason && <span>{currentSeason.name}</span>}
                  <span className="mx-2">·</span>
                  <span>今天该做什么</span>
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
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button size="sm" asChild>
              <Link href="/planning">
                <Plus className="h-4 w-4 mr-1.5" />
                新建企划
              </Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载工作台数据...
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <div>
                  <p className="font-medium text-red-700">加载失败</p>
                  <p className="text-sm text-red-600 mt-0.5">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => loadWorkspace()} className="ml-auto">
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 1. 4 大关键指标卡 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <SummaryCard
                title="款式总数"
                value={summary.totalStyles}
                icon={BarChart3}
                color="blue"
                subtitle={`本品牌在开发中款式`}
                href="/styles"
              />
              <SummaryCard
                title="待办事项"
                value={summary.pendingTodos}
                icon={ListTodo}
                color="amber"
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

            {/* 2. 风险预警区（紧急/高） */}
            {workspace?.risks && workspace.risks.length > 0 && (
              <Card className="mb-6 border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-red-500" />
                      风险预警
                      <Badge variant="destructive" className="ml-1">
                        {workspace.risks.length}
                      </Badge>
                    </CardTitle>
                    <span className="text-xs text-slate-500">实时检测</span>
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
                          className={`flex items-center gap-3 p-3 rounded-lg border ${config.border} ${config.bg} hover:shadow-sm transition-all`}
                        >
                          <div className={`p-1.5 rounded ${config.bg}`}>
                            <Icon className={`h-4 w-4 ${config.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className={`text-sm font-medium ${config.text}`}>{risk.title}</p>
                              <Badge variant="outline" className={`text-[10px] h-4 ${config.text} ${config.border}`}>
                                {config.label}
                              </Badge>
                            </div>
                            <p className="text-xs text-slate-600 mt-0.5 truncate">{risk.message}</p>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-400 flex-shrink-0" />
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

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* 3. 今日待办 */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <ListTodo className="h-4 w-4 text-amber-500" />
                        今日待办
                        {summary.overdueCount > 0 && (
                          <Badge variant="destructive" className="ml-1">
                            {summary.overdueCount} 逾期
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        按优先级排序，点击完成快速处理
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/todos">查看全部</Link>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {!workspace?.todos || workspace.todos.length === 0 ? (
                    <div className="py-12 text-center">
                      <CheckCircle2 className="h-10 w-10 text-green-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">今日没有待办</p>
                      <p className="text-xs text-slate-400 mt-1">所有事情都处理完了，享受片刻宁静</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workspace.todos.slice(0, 8).map((todo: any) => {
                        const priorityConfig = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
                        const isOverdue = todo.due_date && new Date(todo.due_date) < new Date();
                        return (
                          <div
                            key={todo.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                              isOverdue
                                ? "border-red-200 bg-red-50/50"
                                : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                            }`}
                          >
                            <button
                              onClick={() => handleCompleteTodo(todo.id)}
                              disabled={completingTodoId === todo.id}
                              className="flex-shrink-0 h-5 w-5 rounded border-2 border-slate-300 hover:border-green-500 hover:bg-green-50 transition-colors flex items-center justify-center group disabled:opacity-50"
                              title="标记完成"
                            >
                              {completingTodoId === todo.id ? (
                                <Loader2 className="h-3 w-3 animate-spin text-green-600" />
                              ) : (
                                <Check className="h-3 w-3 text-transparent group-hover:text-green-600" />
                              )}
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-medium text-slate-800 truncate">{todo.title}</p>
                                <Badge variant="outline" className={`text-[10px] h-4 ${priorityConfig.color}`}>
                                  {priorityConfig.label}
                                </Badge>
                                {isOverdue && (
                                  <Badge variant="destructive" className="text-[10px] h-4">
                                    逾期
                                  </Badge>
                                )}
                              </div>
                              {todo.description && (
                                <p className="text-xs text-slate-500 mt-0.5 truncate">{todo.description}</p>
                              )}
                              {todo.due_date && (
                                <p className={`text-xs mt-1 ${isOverdue ? "text-red-600" : "text-slate-400"}`}>
                                  <Clock className="h-3 w-3 inline mr-0.5" />
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

              {/* 4. 款式 7 阶段流水线 */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-indigo-500" />
                    款式流水线
                  </CardTitle>
                  <CardDescription className="text-xs">7 大阶段款式分布</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {PIPELINE_STAGES.map((stage) => {
                      const count = stageCounts[stage.key] || 0;
                      const colors = STAGE_COLOR_MAP[stage.color];
                      const Icon = stage.icon;
                      const max = Math.max(...Object.values(stageCounts), 1);
                      return (
                        <div
                          key={stage.key}
                          className="flex items-center gap-3 group cursor-pointer"
                        >
                          <div className={`p-1.5 rounded ${colors.bg}`}>
                            <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs text-slate-600">{stage.label}</span>
                              <span className={`text-xs font-semibold ${colors.text}`}>{count}</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${colors.bg} transition-all`}
                                style={{
                                  width: `${(count / max) * 100}%`,
                                  backgroundColor: "currentColor",
                                  opacity: 0.6,
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 5. 最近款式 */}
            <Card className="border-0 shadow-sm mb-6">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-500" />
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
                  <div className="py-12 text-center">
                    <Box className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                    <p className="text-sm text-slate-500">还没有款式</p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href="/styles">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        创建第一个款式
                      </Link>
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {workspace.recentStyles.map((style: any) => {
                      const stageInfo = PIPELINE_STAGES.find((s) => s.key === style.status);
                      const colors = stageInfo ? STAGE_COLOR_MAP[stageInfo.color] : STAGE_COLOR_MAP.slate;
                      return (
                        <Link
                          key={style.id}
                          href={`/styles/${style.id}`}
                          className="block p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm font-semibold text-slate-800 truncate">{style.name}</p>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                          </div>
                          <p className="text-xs text-slate-500 mb-2">款号: {style.style_no}</p>
                          <div className="flex items-center justify-between">
                            <Badge className={`${colors.bg} ${colors.text} border-0`}>
                              {stageInfo?.label || style.status}
                            </Badge>
                            <p className="text-xs text-slate-400">
                              {new Date(style.updated_at).toLocaleDateString("zh-CN", {
                                month: "numeric",
                                day: "numeric",
                              })}
                            </p>
                          </div>
                          {style.target_cost && (
                            <p className="text-xs text-slate-500 mt-2">
                              目标: <span className="font-medium">¥{style.target_cost}</span>
                              {style.actual_cost && (
                                <>
                                  {" / 实际: "}
                                  <span
                                    className={`font-medium ${
                                      style.actual_cost > style.target_cost
                                        ? "text-red-600"
                                        : "text-slate-700"
                                    }`}
                                  >
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

            {/* 6. 快捷入口 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <QuickLink href="/planning" icon={FileText} label="企划中心" desc="品牌季规划" color="blue" />
              <QuickLink href="/styles" icon={Package} label="款式开发" desc="款式 BOM/打样" color="amber" />
              <QuickLink href="/suppliers" icon={Factory} label="供应链" desc="供应商/采购" color="green" />
              <QuickLink href="/analytics" icon={BarChart3} label="经营反馈" desc="销售/复盘数据" color="purple" />
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

// 摘要卡组件
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
  color: "blue" | "amber" | "red" | "green";
  subtitle: string;
  highlight?: boolean;
  href?: string;
}) {
  const colorMap = {
    blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-200" },
    amber: { bg: "bg-amber-50", text: "text-amber-600", ring: "ring-amber-200" },
    red: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-200" },
    green: { bg: "bg-green-50", text: "text-green-600", ring: "ring-green-200" },
  };
  const c = colorMap[color];

  const content = (
    <Card
      className={`border-0 shadow-sm transition-all ${
        highlight ? `ring-2 ${c.ring} ${c.bg}/30` : ""
      } ${href ? "hover:shadow-md cursor-pointer" : ""}`}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg ${c.bg}`}>
            <Icon className={`h-4 w-4 ${c.text}`} />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-1">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

// 快捷入口
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
  color: "blue" | "amber" | "green" | "purple";
}) {
  const colorMap = {
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    amber: "bg-amber-50 text-amber-600 group-hover:bg-amber-100",
    green: "bg-green-50 text-green-600 group-hover:bg-green-100",
    purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
  };

  return (
    <Link
      href={href}
      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all group"
    >
      <div className={`p-2 rounded-lg ${colorMap[color]} transition-colors`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{desc}</p>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
    </Link>
  );
}
