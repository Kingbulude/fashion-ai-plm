// AI 审核中心 - 自动检测设计稿/BOM/工艺包/打样问题

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  AlertTriangle,
  CheckCircle,
  Brain,
  Palette,
  Package,
  FileText,
  Scissors,
  RefreshCw,
  Lightbulb,
  AlertCircle,
  ChevronRight,
  TrendingUp,
  Clock,
  History,
  CheckSquare,
  Square,
  Trash2,
  Calendar,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  design: { label: "设计稿", icon: Palette, color: "text-navy-700", bg: "bg-navy-100", border: "border-navy-200" },
  bom: { label: "BOM 清单", icon: Package, color: "text-terracotta-600", bg: "bg-terracotta-100", border: "border-terracotta-200" },
  techpack: { label: "工艺包", icon: FileText, color: "text-purple-700", bg: "bg-purple-100", border: "border-purple-200" },
  sampling: { label: "打样", icon: Scissors, color: "text-amber-700", bg: "bg-amber-100", border: "border-amber-200" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  urgent: { label: "紧急", color: "text-destructive", bg: "bg-red-50", border: "border-red-200" },
  high: { label: "高", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200" },
  medium: { label: "中", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200" },
  low: { label: "低", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-200" },
};

const STAT_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  navy: { bg: "bg-navy-100", text: "text-navy-700", gradient: "from-navy-700 to-navy-900" },
  blue: { bg: "bg-navy-100", text: "text-navy-700", gradient: "from-navy-600 to-navy-800" },
  terracotta: { bg: "bg-terracotta-100", text: "text-terracotta-600", gradient: "from-terracotta-400 to-terracotta-600" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", gradient: "from-amber-400 to-amber-600" },
  orange: { bg: "bg-orange-100", text: "text-orange-700", gradient: "from-orange-400 to-orange-600" },
};

export default function AIReviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);

  useEffect(() => {
    fetchReviews();
  }, []);

  const fetchReviews = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError("");
      const res = await fetch("/api/ai-review");
      if (!res.ok) throw new Error("加载失败");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const filtered = items;
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((i: any) => i.id)));
    }
  };

  const handleBatchAction = async (status: string) => {
    if (selectedIds.size === 0) return;
    setBatchProcessing(true);
    try {
      const res = await fetch("/api/ai-review", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status }),
      });
      if (res.ok) {
        setSelectedIds(new Set());
        await fetchReviews(true);
      }
    } catch (err) {
      console.error("批量操作失败:", err);
    } finally {
      setBatchProcessing(false);
    }
  };

  const items = (data?.reviewItems || []).filter((item: any) => {
    if (typeFilter && item.type !== typeFilter) return false;
    if (priorityFilter && item.priority !== priorityFilter) return false;
    return true;
  });

  const stats = data?.stats || {};
  const overallStats = data?.overallStats || {};

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1800px] mx-auto">
        {/* 顶部 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center shadow-premium">
                <Brain className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">AI 审核中心</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">自动检测设计稿、BOM、工艺包、打样中的潜在问题</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchReviews(true)} disabled={refreshing} className="border-border hover:border-navy-200 hover:bg-navy-50">
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            重新扫描
          </Button>
        </div>

        {/* 6 大统计卡 */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <StatCard
            title="待审核项"
            value={(data?.reviewItems || []).length}
            sub={`${stats.urgent || 0} 项紧急`}
            icon={Brain}
            color="navy"
          />
          <StatCard
            title="已审核"
            value={overallStats.totalReviewed || 0}
            sub={`解决率 ${(overallStats.resolvedRate || 0).toFixed(0)}%`}
            icon={CheckCircle}
            color="blue"
          />
          <StatCard
            title="设计稿"
            value={stats.design || 0}
            sub="需 AI 标签分析"
            icon={Palette}
            color="blue"
          />
          <StatCard
            title="BOM 问题"
            value={stats.bom || 0}
            sub="成本/缺漏检测"
            icon={Package}
            color="terracotta"
          />
          <StatCard
            title="工艺包"
            value={stats.techpack || 0}
            sub="参数完整性检测"
            icon={FileText}
            color="amber"
          />
          <StatCard
            title="高优先级"
            value={stats.high || 0}
            sub="需优先处理"
            icon={AlertTriangle}
            color="orange"
          />
        </div>

        {/* 筛选条 */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">类型：</span>
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-3 h-7 rounded-full text-xs font-medium border transition-all ${
              !typeFilter
                ? "bg-navy-700 text-white border-navy-700"
                : "bg-card text-muted-foreground border-border hover:border-navy-200"
            }`}
          >
            全部
          </button>
          {Object.entries(TYPE_CONFIG).map(([k, v]) => {
            const count = stats[k] || 0;
            if (count === 0) return null;
            const isActive = typeFilter === k;
            return (
              <button
                key={k}
                onClick={() => setTypeFilter(isActive ? null : k)}
                className={`px-3 h-7 rounded-full text-xs font-medium border flex items-center gap-1 transition-all ${
                  isActive
                    ? `${v.bg} ${v.color} ${v.border}`
                    : "bg-card text-muted-foreground border-border hover:border-navy-200"
                }`}
              >
                <v.icon className="h-3 w-3" />
                {v.label}
                <Badge variant="secondary" className="text-[10px] h-4 bg-white/80">
                  {count}
                </Badge>
              </button>
            );
          })}

          <span className="text-xs text-muted-foreground ml-4">优先级：</span>
          {["urgent", "high", "medium"].map((p) => {
            const config = PRIORITY_CONFIG[p];
            const isActive = priorityFilter === p;
            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(isActive ? null : p)}
                className={`px-3 h-7 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? `${config.bg} ${config.color} ${config.border}`
                    : "bg-card text-muted-foreground border-border hover:border-navy-200"
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* 批量操作栏 */}
        {selectedIds.size > 0 && (
          <div className="mb-4 p-3 rounded-lg bg-navy-50 border border-navy-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-navy-700">已选择 {selectedIds.size} 项</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchAction("resolved")}
                disabled={batchProcessing}
                className="h-7 text-xs border-green-200 text-green-700 hover:bg-green-50"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                批量通过
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleBatchAction("rejected")}
                disabled={batchProcessing}
                className="h-7 text-xs border-red-200 text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                批量驳回
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedIds(new Set())}
                className="h-7 text-xs text-slate-600"
              >
                取消选择
              </Button>
            </div>
          </div>
        )}

        {/* 审核趋势图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <Card className="card-premium lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-navy-600" />
                审核趋势（近 7 天）
              </CardTitle>
              <CardDescription className="text-xs">每日审核处理量统计</CardDescription>
            </CardHeader>
            <CardContent>
              <ReviewTrendChart trend={data?.dailyTrend || []} />
            </CardContent>
          </Card>

          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Clock className="h-4 w-4 text-amber-600" />
                审核概览
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span className="text-sm text-emerald-700">已解决</span>
                  </div>
                  <span className="text-xl font-bold text-emerald-700">{overallStats.resolvedCount || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span className="text-sm text-red-700">已驳回</span>
                  </div>
                  <span className="text-xl font-bold text-red-700">{overallStats.rejectedCount || 0}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-amber-600" />
                    <span className="text-sm text-amber-700">待审核</span>
                  </div>
                  <span className="text-xl font-bold text-amber-700">{overallStats.pendingCount || 0}</span>
                </div>
                <div className="pt-3 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">解决率</span>
                    <span className="font-medium text-foreground">{(overallStats.resolvedRate || 0).toFixed(1)}%</span>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-green-500 rounded-full"
                      style={{ width: `${overallStats.resolvedRate || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 审核项列表 */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2 card-premium">
            <Loader2 className="h-5 w-5 animate-spin" />
            AI 扫描中...
          </div>
        ) : error ? (
          <Card className="card-premium border-destructive/30 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <p className="text-destructive">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="card-premium border-dashed border-border">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-100 to-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-success" />
              </div>
              <p className="text-foreground font-medium mb-1">所有项目已通过审核</p>
              <p className="text-sm text-muted-foreground mb-4">
                {typeFilter || priorityFilter
                  ? "尝试调整筛选条件查看其他审核项"
                  : "当前没有发现需要处理的问题"}
              </p>
              <Button variant="outline" onClick={() => { setTypeFilter(null); setPriorityFilter(null); }}>
                清除筛选
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 全选按钮 */}
            <div className="flex items-center gap-2 mb-3 p-2 rounded-lg bg-slate-50">
              <button
                onClick={selectAll}
                className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-800"
              >
                {selectedIds.size === items.length && items.length > 0 ? (
                  <CheckSquare className="h-4 w-4 text-navy-600" />
                ) : (
                  <Square className="h-4 w-4 text-slate-400" />
                )}
                全选 ({items.length})
              </button>
            </div>
            <div className="space-y-3">
              {items.map((item: any) => (
                <ReviewCard key={item.id} item={item} selected={selectedIds.has(item.id)} onToggle={() => toggleSelect(item.id)} />
              ))}
            </div>
          </>
        )}

        {/* 审核历史记录 */}
        {data?.recentHistory?.length > 0 && (
          <Card className="card-premium mt-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-4 w-4 text-slate-600" />
                审核历史
              </CardTitle>
              <CardDescription className="text-xs">最近处理的审核记录</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data.recentHistory.slice(0, 10).map((record: any) => (
                  <div key={record.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${record.status === "resolved" ? "bg-emerald-500" : "bg-red-500"}`} />
                      <span className="text-sm text-slate-700">审核项 #{record.reviewItemId?.slice(-8) || record.id}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {record.status === "resolved" ? "已解决" : "已驳回"}
                      </Badge>
                    </div>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {record.processedAt ? new Date(record.processedAt).toLocaleDateString("zh-CN") : "-"}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </SidebarLayout>
  );
}

// 统计卡
function StatCard({ title, value, sub, icon: Icon, color }: { title: string; value: number; sub: string; icon: any; color: string }) {
  const c = STAT_COLORS[color] || STAT_COLORS.navy;
  return (
    <Card className="metric-card">
      <CardContent className="p-0">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2 rounded-xl ${c.bg}`}>
            <Icon className={`h-4 w-4 ${c.text}`} />
          </div>
          <div className={`w-6 h-1 rounded-full bg-gradient-to-r ${c.gradient} opacity-60`} />
        </div>
        <p className="data-value">{value}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{title}</p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

// 审核卡片
function ReviewCard({ item, selected, onToggle }: { item: any; selected?: boolean; onToggle?: () => void }) {
  const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.design;
  const priorityConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
  const TypeIcon = typeConfig.icon;

  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState("");

  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalysisError("");
    try {
      const res = await fetch("/api/ai-review/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewItem: item }),
      });
      if (!res.ok) throw new Error("AI 分析失败");
      const json = await res.json();
      setAnalysis(json.analysis);
    } catch (err: any) {
      setAnalysisError(err.message || "AI 分析失败");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <Card className={`card-premium hover:shadow-lg transition-all overflow-hidden ${selected ? "ring-2 ring-navy-500" : ""}`}>
      <div className="flex">
        {/* 左侧类型条 */}
        <div className={`w-1 ${typeConfig.bg} bg-gradient-to-b`} />
        <div className="flex-1 p-4">
          <div className="flex items-start gap-3">
            {/* 选择框 */}
            {onToggle && (
              <button
                onClick={onToggle}
                className="mt-2 flex-shrink-0"
              >
                {selected ? (
                  <CheckSquare className="h-4 w-4 text-navy-600" />
                ) : (
                  <Square className="h-4 w-4 text-slate-300 hover:text-slate-500" />
                )}
              </button>
            )}
            <div className={`p-2.5 rounded-xl ${typeConfig.bg} flex-shrink-0 border ${typeConfig.border}`}>
              <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant="outline" className={`${typeConfig.bg} ${typeConfig.color} border-0`}>
                  {typeConfig.label}
                </Badge>
                <Badge variant="outline" className={`${priorityConfig.bg} ${priorityConfig.color} ${priorityConfig.border}`}>
                  {priorityConfig.label}
                </Badge>
                <h3 className="font-semibold text-foreground truncate">{item.title}</h3>
              </div>

              {/* 问题列表 */}
              {item.issues?.length > 0 && (
                <div className="mb-3 space-y-1">
                  {item.issues.map((issue: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                        item.priority === "urgent" ? "text-destructive" :
                        item.priority === "high" ? "text-orange-500" : "text-amber-500"
                      }`} />
                      <span>{issue}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 建议列表 */}
              {item.suggestions?.length > 0 && (
                <div className="mb-3 space-y-1">
                  {item.suggestions.map((suggestion: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Lightbulb className="h-3 w-3 mt-0.5 text-navy-700 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* AI 深度分析结果 */}
              {analysis && (
                <div className="mb-3 p-3 rounded-lg bg-gradient-to-br from-navy-50 to-purple-50 border border-navy-100 space-y-2">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-navy-700" />
                    <span className="text-sm font-semibold text-navy-800">AI 深度分析</span>
                    <Badge variant="outline" className={`text-[10px] ${
                      analysis.riskLevel === "high" ? "bg-red-50 text-destructive border-red-200" :
                      analysis.riskLevel === "medium" ? "bg-orange-50 text-orange-700 border-orange-200" :
                      "bg-emerald-50 text-success border-emerald-200"
                    }`}>
                      {analysis.riskLevel === "high" ? "高风险" : analysis.riskLevel === "medium" ? "中风险" : "低风险"}
                    </Badge>
                  </div>
                  <p className="text-xs text-foreground leading-relaxed">{analysis.aiSummary}</p>
                  {analysis.rootCauses?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">根本原因：</p>
                      {analysis.rootCauses.map((cause: string, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                          <span className="text-navy-600 mt-0.5">•</span>
                          <span>{cause}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {analysis.recommendations?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">改进建议：</p>
                      {analysis.recommendations.map((rec: any, i: number) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-foreground">
                          <Lightbulb className="h-3 w-3 mt-0.5 text-terracotta-600 flex-shrink-0" />
                          <span>{rec.action} <span className="text-muted-foreground">（{rec.expectedImpact}）</span></span>
                        </div>
                      ))}
                    </div>
                  )}
                  {analysis.estimatedCostImpact && (
                    <p className="text-xs text-terracotta-600 font-medium pt-1 border-t border-navy-100">
                      {analysis.estimatedCostImpact}
                    </p>
                  )}
                </div>
              )}

              {analysisError && (
                <div className="mb-3 flex items-center gap-2 text-xs text-destructive">
                  <AlertCircle className="h-3 w-3" />
                  {analysisError}
                </div>
              )}

              {/* 底部操作 */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.totalCost && item.targetCost && (
                    <span className="text-terracotta-600 font-medium">
                      成本：¥{item.totalCost.toLocaleString("zh-CN")} / 目标 ¥{item.targetCost.toLocaleString("zh-CN")}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleAnalyze}
                    disabled={analyzing}
                    className="h-7 text-xs border-navy-200 text-navy-700 hover:bg-navy-50"
                  >
                    {analyzing ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Brain className="h-3 w-3 mr-1" />
                    )}
                    {analysis ? "重新分析" : "AI 深度分析"}
                  </Button>
                  <Link href={`/styles/${item.styleId}`}>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-navy-700 hover:text-navy-800 hover:bg-navy-50">
                      查看款式
                      <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}

// 审核趋势图表组件
function ReviewTrendChart({ trend }: { trend: any[] }) {
  if (!trend || trend.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-sm text-slate-400">
        暂无审核趋势数据
      </div>
    );
  }

  const maxValue = Math.max(...trend.map((d) => d.total), 1);

  return (
    <div className="h-48">
      <div className="flex items-end gap-1 h-full px-2">
        {trend.map((day, idx) => {
          const totalHeight = (day.total / maxValue) * 100;
          const resolvedHeight = day.total > 0 ? (day.resolved / day.total) * 100 : 0;
          return (
            <div key={day.date} className="flex-1 flex flex-col items-center gap-1 group relative" style={{ minWidth: "20px" }}>
              <div className="w-full h-[85%] flex flex-col-reverse rounded-t-md overflow-hidden">
                {day.resolved > 0 && (
                  <div
                    className="w-full bg-gradient-to-t from-emerald-500 to-emerald-400 transition-all"
                    style={{ height: `${resolvedHeight}%` }}
                  />
                )}
                {day.rejected > 0 && (
                  <div
                    className="w-full bg-gradient-to-t from-red-500 to-red-400 transition-all"
                    style={{ height: `${day.total > 0 ? ((day.rejected / day.total) * 100) : 0}%` }}
                  />
                )}
              </div>
              <span className="text-[10px] text-slate-500">{day.dateLabel}</span>
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none transition-opacity">
                <div className="font-semibold">{day.dateLabel}</div>
                <div className="text-emerald-400">通过 {day.resolved}</div>
                <div className="text-red-400">驳回 {day.rejected}</div>
              </div>
            </div>
          );
        })}
      </div>
      {/* 图例 */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-t from-emerald-500 to-emerald-400" />
          <span className="text-xs text-slate-500">通过</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-gradient-to-t from-red-500 to-red-400" />
          <span className="text-xs text-slate-500">驳回</span>
        </div>
      </div>
    </div>
  );
}
