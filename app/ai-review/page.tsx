// AI 审核中心 - 自动检测设计稿/BOM/工艺包/打样问题

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent } from "@/components/ui/card";
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

  const items = (data?.reviewItems || []).filter((item: any) => {
    if (typeFilter && item.type !== typeFilter) return false;
    if (priorityFilter && item.priority !== priorityFilter) return false;
    return true;
  });

  const stats = data?.stats || {};

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

        {/* 4 大统计卡 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-8">
          <StatCard
            title="待审核项"
            value={(data?.reviewItems || []).length}
            sub={`${stats.urgent || 0} 项紧急`}
            icon={Brain}
            color="navy"
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
          <div className="space-y-3">
            {items.map((item: any) => (
              <ReviewCard key={item.id} item={item} />
            ))}
          </div>
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
function ReviewCard({ item }: { item: any }) {
  const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.design;
  const priorityConfig = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.medium;
  const TypeIcon = typeConfig.icon;

  return (
    <Card className="card-premium hover:shadow-lg transition-all overflow-hidden">
      <div className="flex">
        {/* 左侧类型条 */}
        <div className={`w-1 ${typeConfig.bg} bg-gradient-to-b`} />
        <div className="flex-1 p-4">
          <div className="flex items-start gap-4">
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

              {/* 底部操作 */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {item.totalCost && item.targetCost && (
                    <span className="text-terracotta-600 font-medium">
                      成本：¥{item.totalCost.toLocaleString("zh-CN")} / 目标 ¥{item.targetCost.toLocaleString("zh-CN")}
                    </span>
                  )}
                </div>
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
    </Card>
  );
}
