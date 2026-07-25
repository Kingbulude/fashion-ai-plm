"use client";

// 管理层统筹工作台组件（BOSS/品牌主理人/管理员）
// 设计理念：统筹全局，一眼掌握每个工序环节的核心状态

import { useState } from "react";
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
  History,
  X as XIcon,
  Check,
  FileText,
} from "lucide-react";
import { RiskAlertCard, AISuggestionBanner } from "./shared-modules";

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
    pendingApprovals: 0,
  };

  // 真实审批流数据 + 操作日志（来自 /api/workspace 聚合）
  const pendingApprovals = (workspace?.pendingApprovals || []) as Array<{
    id: string;
    table_name: string;
    record_id: string;
    action: string;
    proposed_data: any;
    submitted_by: string;
    created_at: string;
  }>;
  const recentLogs = (workspace?.recentLogs || []) as Array<{
    id: string;
    user_id: string;
    action: string;
    target_table: string;
    target_id: string;
    after_data: any;
    created_at: string;
  }>;
  const [processingApprovalId, setProcessingApprovalId] = useState<string | null>(null);

  // 处理审批（通过/驳回）
  const handleProcessApproval = async (approvalId: string, status: "approved" | "rejected") => {
    setProcessingApprovalId(approvalId);
    try {
      const res = await fetch("/api/approvals", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: approvalId,
          status,
          reviewComment: status === "approved" ? "通过" : "驳回",
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "审批处理失败");
      }
      // 重新加载工作台数据
      window.location.reload();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "审批处理失败";
      alert(msg);
    } finally {
      setProcessingApprovalId(null);
    }
  };

  // AI 建议审核
  const handleApproveSuggestion = async (suggestionId: string) => {
    try {
      const res = await fetch("/api/ai-suggestions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: suggestionId, status: "approved", reviewComment: "已采纳" }),
      });
      if (!res.ok) throw new Error("采纳失败");
    } catch {
      // 忽略错误
    }
  };
  const handleRejectSuggestion = async (suggestionId: string) => {
    try {
      const res = await fetch("/api/ai-suggestions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: suggestionId, status: "rejected", reviewComment: "不采纳" }),
      });
      if (!res.ok) throw new Error("驳回失败");
    } catch {
      // 忽略错误
    }
  };

  // 格式化操作日志描述
  const formatLogAction = (log: typeof recentLogs[number]) => {
    const actionMap: Record<string, string> = {
      create: "创建",
      update: "更新",
      delete: "删除",
      approval_approved: "审批通过",
      approval_rejected: "审批驳回",
    };
    const actionLabel = actionMap[log.action] || log.action;
    const tableMap: Record<string, string> = {
      styles: "款式",
      todos: "待办",
      suppliers: "供应商",
      brands: "品牌",
      seasons: "季节",
      approval_flows: "审批",
      bom_items: "BOM",
      sampling_records: "打样",
      production_orders: "生产订单",
      material_procurement: "采购",
    };
    const tableLabel = tableMap[log.target_table] || log.target_table;
    let detail = "";
    if (log.after_data) {
      if (typeof log.after_data === "object" && log.after_data.name) {
        detail = `「${log.after_data.name}」`;
      } else if (typeof log.after_data === "object" && log.after_data.style_no) {
        detail = `「${log.after_data.style_no}」`;
      } else if (typeof log.after_data === "object" && log.after_data.title) {
        detail = `「${log.after_data.title}」`;
      }
    }
    return `${actionLabel} ${tableLabel}${detail}`;
  };

  // 格式化相对时间
  const formatRelativeTime = (isoString: string) => {
    const diff = Date.now() - new Date(isoString).getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    if (minutes < 1) return "刚刚";
    if (minutes < 60) return `${minutes} 分钟前`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} 小时前`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} 天前`;
    return new Date(isoString).toLocaleDateString("zh-CN", { month: "numeric", day: "numeric" });
  };

  // 审批目标展示信息
  const formatApprovalTarget = (approval: typeof pendingApprovals[number]) => {
    const tableMap: Record<string, string> = {
      styles: "款式",
      suppliers: "供应商",
      brands: "品牌",
      seasons: "季节",
      bom_items: "BOM",
      production_orders: "生产订单",
    };
    const tableLabel = tableMap[approval.table_name] || approval.table_name;
    const actionMap: Record<string, string> = {
      create: "新建",
      update: "修改",
      delete: "删除",
    };
    const actionLabel = actionMap[approval.action] || approval.action;
    let detail = "";
    if (approval.proposed_data) {
      if (typeof approval.proposed_data === "object") {
        if (approval.proposed_data.name) detail = `「${approval.proposed_data.name}」`;
        else if (approval.proposed_data.style_no) detail = `「${approval.proposed_data.style_no}」`;
        else if (approval.proposed_data.title) detail = `「${approval.proposed_data.title}」`;
      }
    }
    return `${actionLabel} ${tableLabel}${detail}`;
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

  // 旧逻辑（基于文本匹配）已弃用，改用真实审批流 pendingApprovals
  // 仅保留 fallback：当无真实审批数据时，从 todos 文本匹配作为兜底
  const approvalTodosFallback = (workspace?.todos || []).filter(
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
      {/* AI 智能建议横幅 */}
      <AISuggestionBanner
        suggestions={workspace?.aiSuggestions || []}
        onApprove={handleApproveSuggestion}
        onReject={handleRejectSuggestion}
      />

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
                {approvalTodosFallback.length > 0 && (
                  <span className="ml-2 text-navy-600">
                    · {approvalTodosFallback.length} 项待审批
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

      {/* === 第四区：待审批 + 款式流水线 === */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 待我审批（真实审批流） */}
        <Card className="card-premium">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-terracotta-500" />
                  待我审批
                  {pendingApprovals.length > 0 && (
                    <Badge className="ml-1 bg-terracotta-100 text-terracotta-600">
                      {pendingApprovals.length}
                    </Badge>
                  )}
                </CardTitle>
                <CardDescription className="text-xs mt-1">
                  基于审批流的待处理事项
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {pendingApprovals.length === 0 ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-300 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">暂无待审批事项</p>
                {approvalTodosFallback.length > 0 && (
                  <p className="text-xs text-muted-foreground mt-1">
                    另有 {approvalTodosFallback.length} 项文本匹配的待办
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingApprovals.slice(0, 5).map((approval) => {
                  const target = formatApprovalTarget(approval);
                  const submittedAt = formatRelativeTime(approval.created_at);
                  const isProcessing = processingApprovalId === approval.id;
                  return (
                    <div
                      key={approval.id}
                      className="p-3 rounded-xl border border-border hover:bg-sand-50 transition-all"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-1">
                            <FileText className="h-3.5 w-3.5 text-navy-600 flex-shrink-0" />
                            <p className="text-sm font-medium truncate">{target}</p>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            提交于 {submittedAt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          onClick={() => handleProcessApproval(approval.id, "approved")}
                          disabled={isProcessing}
                          className="h-7 flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Check className="h-3 w-3 mr-1" />
                          )}
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleProcessApproval(approval.id, "rejected")}
                          disabled={isProcessing}
                          className="h-7 flex-1 border-destructive/30 text-destructive hover:bg-destructive/5"
                        >
                          {isProcessing ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <XIcon className="h-3 w-3 mr-1" />
                          )}
                          驳回
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {pendingApprovals.length > 5 && (
                  <p className="text-xs text-center text-muted-foreground pt-1">
                    还有 {pendingApprovals.length - 5} 项待审批...
                  </p>
                )}
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

      {/* === 第五区：最近活动时间线 === */}
      <Card className="card-premium">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-navy-500" />
                最近活动
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                团队最近 10 条操作记录
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="py-10 text-center">
              <History className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">暂无活动记录</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.slice(0, 8).map((log, idx) => {
                const action = formatLogAction(log);
                const time = formatRelativeTime(log.created_at);
                const isApprovalAction = log.action.startsWith("approval_");
                const isCreateAction = log.action === "create";
                const isUpdateAction = log.action === "update";
                const isDeleteAction = log.action === "delete";

                // 图标和颜色映射
                let Icon = FileText;
                let iconBg = "bg-slate-100";
                let iconColor = "text-slate-600";
                if (isApprovalAction) {
                  Icon = log.action === "approval_approved" ? Check : XIcon;
                  iconBg = log.action === "approval_approved" ? "bg-emerald-100" : "bg-red-100";
                  iconColor = log.action === "approval_approved" ? "text-emerald-600" : "text-red-600";
                } else if (isCreateAction) {
                  Icon = Plus;
                  iconBg = "bg-blue-100";
                  iconColor = "text-blue-600";
                } else if (isUpdateAction) {
                  Icon = RefreshCw;
                  iconBg = "bg-amber-100";
                  iconColor = "text-amber-600";
                } else if (isDeleteAction) {
                  Icon = XIcon;
                  iconBg = "bg-red-100";
                  iconColor = "text-red-600";
                }

                return (
                  <div key={log.id} className="flex items-start gap-3">
                    {/* 时间线圆点 */}
                    <div className="flex flex-col items-center">
                      <div className={`p-1.5 rounded-full ${iconBg}`}>
                        <Icon className={`h-3 w-3 ${iconColor}`} />
                      </div>
                      {idx < Math.min(recentLogs.length, 8) - 1 && (
                        <div className="w-px h-6 bg-border mt-1" />
                      )}
                    </div>
                    {/* 内容 */}
                    <div className="flex-1 min-w-0 pb-1">
                      <p className="text-sm text-foreground">{action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* === 第六区：最近款式 === */}
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
