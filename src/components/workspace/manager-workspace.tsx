"use client";

// 管理层统筹工作台组件（BOSS/品牌主理人/管理员）
// 设计理念：统筹全局，一眼掌握每个工序环节的核心状态

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/auth/tenant-context";
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
  RefreshCw,
  Loader2,
  ChevronRight,
  ListTodo,
  ShieldAlert,
  Plus,
  Bot,
  Wand2,
  ArrowRight,
  Box,
  Layers,
  Truck,
} from "lucide-react";
import { RiskAlertCard } from "./shared-modules";

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

export function ManagerWorkspace({
  workspace,
  onCompleteTodo,
  completingTodoId,
}: {
  workspace: any;
  onCompleteTodo: (id: string) => void;
  completingTodoId: string | null;
}) {
  const { accessibleAISkills } = useTenant();
  const aiSkills = accessibleAISkills.slice(0, 8);
  const summary = workspace?.summary || {
    totalStyles: 0,
    pendingTodos: 0,
    overdueCount: 0,
    highRiskCount: 0,
  };

  // 计算各阶段款式数
  const stageCounts: Record<string, number> = {};
  const stylesByStatus = workspace?.stylesByStatus || {};
  for (const stage of PIPELINE_STAGES) {
    stageCounts[stage.key] = (stylesByStatus[stage.key] || []).length;
  }
  const totalActive = Object.values(stageCounts).reduce((sum, n) => sum + n, 0);

  // 各工序核心指标
  const designCount =
    (stylesByStatus["planning"] || []).length +
    (stylesByStatus["designing"] || []).length;
  const samplingCount = (stylesByStatus["sampling"] || []).length;
  const procurementCount = (stylesByStatus["sampled"] || []).length;
  const productionCount = (stylesByStatus["producing"] || []).length;
  const salesCount =
    (stylesByStatus["selling"] || []).length +
    (stylesByStatus["sold"] || []).length;
  const aftersalesCount = (stylesByStatus["reviewing"] || []).length;

  // 待审批 vs 普通待办
  const approvalTodos = (workspace?.todos || []).filter(
    (t: any) =>
      t.title?.includes("审批") ||
      t.title?.includes("审核") ||
      t.title?.includes("确认") ||
      t.title?.includes("决策")
  );

  const risks = workspace?.risks || [];
  const recentStyles = workspace?.recentStyles || [];

  return (
    <div className="space-y-6">
      {/* === 第一区：全局 KPI 总览 === */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* 款式概览（合并卡 + 迷你进度条） */}
        <Link href="/styles" className="block">
          <Card className="card-premium transition-all hover:shadow-lg cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-navy-100">
                    <TrendingUp className="h-5 w-5 text-navy-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">款式概览</p>
                    <p className="text-xs text-muted-foreground">全链路款式分布</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="data-value !text-2xl">{summary.totalStyles}</p>
                  <p className="text-xs text-muted-foreground">总款式</p>
                </div>
              </div>
              <div className="flex items-stretch h-3 rounded-full overflow-hidden bg-sand-100 gap-px">
                {PIPELINE_STAGES.map((stage) => {
                  const count = stageCounts[stage.key] || 0;
                  const pct = totalActive > 0 ? (count / totalActive) * 100 : 0;
                  const colors = STAGE_COLOR_MAP[stage.color];
                  return (
                    <div
                      key={stage.key}
                      className={`${colors.bar} transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                      title={`${stage.label}: ${count}款`}
                    />
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-xs text-muted-foreground">{totalActive} 款在途</span>
                <span className="text-xs font-medium text-navy-600">查看详情 →</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        {/* 待办/审批 */}
        <Link href="/todos" className="block">
          <Card
            className={`card-premium transition-all hover:shadow-lg cursor-pointer h-full ${
              summary.overdueCount > 0 ? "ring-2 ring-terracotta-200 bg-terracotta-50/40" : ""
            }`}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="p-2.5 rounded-xl bg-terracotta-100">
                  <ListTodo className="h-5 w-5 text-terracotta-600" />
                </div>
                <div className="text-right">
                  <p className="data-value">{summary.pendingTodos}</p>
                </div>
              </div>
              <p className="text-sm font-semibold text-foreground">待办事项</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {summary.overdueCount > 0 ? (
                  <span className="text-destructive font-medium">
                    {summary.overdueCount} 项逾期
                  </span>
                ) : (
                  "暂无逾期"
                )}
                {approvalTodos.length > 0 && (
                  <span className="ml-2 text-navy-600">
                    · {approvalTodos.length} 项待审批
                  </span>
                )}
              </p>
            </CardContent>
          </Card>
        </Link>

        {/* 高风险 */}
        <Card
          className={`card-premium transition-all h-full ${
            summary.highRiskCount > 0 ? "ring-2 ring-red-200 bg-red-50/40" : ""
          }`}
        >
          <CardContent className="p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2.5 rounded-xl bg-red-50">
                <ShieldAlert className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-right">
                <p className="data-value">{summary.highRiskCount}</p>
              </div>
            </div>
            <p className="text-sm font-semibold text-foreground">高风险</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {summary.highRiskCount > 0 ? (
                <span className="text-destructive font-medium">需立即处理</span>
              ) : (
                "当前无高风险"
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* === 第二区：风险预警 === */}
      {risks.length > 0 && <RiskAlertCard risks={risks} />}

      {/* === 第三区：各工序核心环节一览（管理层专属） === */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="h-4 w-4 text-navy-500" />
                各工序核心环节
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                一眼掌握每个工序的运行状态
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <ProcessNodeCard node="design" label="设计" count={designCount} icon={Palette} color="blue" href="/styles?status=planning,designing,designed" />
            <ProcessNodeCard node="sampling" label="打样" count={samplingCount} icon={Wrench} color="amber" href="/styles?status=sampling,sampled" />
            <ProcessNodeCard node="procurement" label="采购" count={procurementCount} icon={Truck} color="yellow" href="/suppliers" />
            <ProcessNodeCard node="stocking" label="生产" count={productionCount} icon={Factory} color="green" href="/styles?status=producing,produced" />
            <ProcessNodeCard node="sales" label="销售" count={salesCount} icon={ShoppingCart} color="purple" href="/styles?status=selling,sold" />
            <ProcessNodeCard node="aftersales" label="售后" count={aftersalesCount} icon={ShieldAlert} color="red" href="/styles?status=reviewing" />
          </div>
        </CardContent>
      </Card>

      {/* === 第四区：待审批 + 流水线 === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 待审批 */}
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-terracotta-500" />
                  待我审批
                  {approvalTodos.length > 0 && (
                    <Badge className="ml-1 bg-terracotta-100 text-terracotta-600">
                      {approvalTodos.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  需要您决策的事项
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/todos">查看全部</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {approvalTodos.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">暂无待审批事项</p>
              </div>
            ) : (
              <div className="space-y-2">
                {approvalTodos.slice(0, 6).map((todo: any) => {
                  const isOverdue =
                    todo.dueDate && new Date(todo.dueDate) < new Date();
                  return (
                    <div
                      key={todo.id}
                      className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                        isOverdue
                          ? "border-destructive/20 bg-destructive/5"
                          : "border-border hover:bg-sand-50"
                      }`}
                    >
                      <button
                        onClick={() => onCompleteTodo(todo.id)}
                        disabled={completingTodoId === todo.id}
                        className="flex-shrink-0 h-5 w-5 rounded-md border-2 border-border hover:border-emerald-500 transition-colors flex items-center justify-center"
                      >
                        {completingTodoId === todo.id ? (
                          <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                        ) : (
                          <CheckCircle2 className="h-3 w-3 text-transparent" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{todo.title}</p>
                        {todo.dueDate && (
                          <p
                            className={`text-xs mt-0.5 flex items-center gap-0.5 ${
                              isOverdue
                                ? "text-destructive"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Clock className="h-3 w-3" />
                            {new Date(todo.dueDate).toLocaleDateString("zh-CN", {
                              month: "numeric",
                              day: "numeric",
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

        {/* 款式流水线 */}
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-navy-500" />
                  款式流水线
                </CardTitle>
                <CardDescription className="text-xs">7 大阶段款式分布</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/styles">查看全部</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {PIPELINE_STAGES.map((stage) => {
              const count = stageCounts[stage.key] || 0;
              const colors = STAGE_COLOR_MAP[stage.color];
              const Icon = stage.icon;
              const pct = totalActive > 0 ? (count / totalActive) * 100 : 0;
              return (
                <div key={stage.key} className="flex items-center gap-3 mb-1.5">
                  <div className={`p-1.5 rounded-lg ${colors.bg} flex-shrink-0`}>
                    <Icon className={`h-3.5 w-3.5 ${colors.text}`} />
                  </div>
                  <span className="text-sm font-medium text-foreground flex-shrink-0 w-16">
                    {stage.label}
                  </span>
                  <div className="flex-1 h-2 bg-sand-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0 w-16 justify-end">
                    <span className={`text-sm font-bold ${colors.text}`}>{count}</span>
                    <span className="text-xs text-muted-foreground">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* === 第五区：最近款式 === */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-navy-500" />
                最近款式
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                最近更新的 6 个款式
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/styles">查看全部</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentStyles.length === 0 ? (
            <div className="py-14 text-center">
              <div className="w-14 h-14 rounded-2xl bg-sand-100 flex items-center justify-center mx-auto mb-3">
                <Box className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">还没有款式</p>
              <Button variant="outline" size="sm" className="mt-3" asChild>
                <Link href="/styles">
                  <Plus className="h-3.5 w-3.5 mr-1" />创建第一个款式
                </Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentStyles.map((style: any) => {
                const stageInfo = PIPELINE_STAGES.find((s) => s.key === style.status);
                const colors = stageInfo
                  ? STAGE_COLOR_MAP[stageInfo.color]
                  : STAGE_COLOR_MAP.slate;
                return (
                  <Link
                    key={style.id}
                    href={`/styles/${style.id}`}
                    className="block p-4 rounded-xl border border-border bg-card hover:border-terracotta-200 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {style.name}
                      </p>
                      <ArrowRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-terracotta-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </div>
                    <p className="text-xs text-muted-foreground mb-3">
                      款号: {style.styleNo}
                    </p>
                    <div className="flex items-center justify-between">
                      <Badge className={`${colors.bg} ${colors.text} border-0`}>
                        {stageInfo?.label || style.status}
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        {style.updatedAt
                          ? new Date(style.updatedAt).toLocaleDateString("zh-CN", {
                              month: "numeric",
                              day: "numeric",
                            })
                          : "-"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* === 第六区：AI 工具 === */}
      {aiSkills.length > 0 && (
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Bot className="h-4 w-4 text-navy-500" />
                  我的 AI 工具
                </CardTitle>
                <CardDescription className="text-xs">
                  根据当前角色自动分配的 AI 智能体
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/ai-workspace">查看全部</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {aiSkills.map((skill: any) => {
                const Icon = skill.entry_route ? Wand2 : Bot;
                return (
                  <Link
                    key={skill.id}
                    href={skill.entry_route || "#"}
                    className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-navy-200 hover:shadow-md transition-all group"
                  >
                    <div className="p-2.5 rounded-xl bg-navy-100 text-navy-600 group-hover:bg-navy-200 transition-colors flex-shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">
                        {skill.name}
                      </p>
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {skill.description || "AI 智能体"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// 工序节点卡片子组件
function ProcessNodeCard({
  label,
  count,
  icon: Icon,
  color,
  href,
}: {
  node: string;
  label: string;
  count: number;
  icon: any;
  color: string;
  href: string;
}) {
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
    yellow: { bg: "bg-yellow-50", text: "text-yellow-600" },
    green: { bg: "bg-green-50", text: "text-green-600" },
    purple: { bg: "bg-purple-50", text: "text-purple-600" },
    red: { bg: "bg-red-50", text: "text-red-600" },
  };
  const c = colorMap[color] || colorMap.blue;
  return (
    <Link
      href={href}
      className="block p-4 rounded-xl border border-border bg-card hover:shadow-md hover:border-terracotta-200 transition-all group"
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${c.bg}`}>
          <Icon className={`h-4 w-4 ${c.text}`} />
        </div>
        <span className={`text-xl font-bold ${c.text}`}>{count}</span>
      </div>
      <p className="text-sm font-medium text-foreground">{label}</p>
      <p className="text-xs text-muted-foreground mt-0.5 group-hover:text-terracotta-500 transition-colors">
        查看 →
      </p>
    </Link>
  );
}
