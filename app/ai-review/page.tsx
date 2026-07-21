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
  Sparkles,
  ArrowRight,
  Lightbulb,
  AlertCircle,
  ChevronRight,
  Clock,
  Layers,
  Wand2,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  design: { label: "设计稿", icon: Palette, color: "text-blue-600", bg: "bg-blue-50" },
  bom: { label: "BOM 清单", icon: Package, color: "text-amber-600", bg: "bg-amber-50" },
  techpack: { label: "工艺包", icon: FileText, color: "text-purple-600", bg: "bg-purple-50" },
  sampling: { label: "打样", icon: Scissors, color: "text-pink-600", bg: "bg-pink-50" },
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  urgent: { label: "紧急", color: "text-red-700", bg: "bg-red-50", border: "border-red-300" },
  high: { label: "高", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-300" },
  medium: { label: "中", color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-300" },
  low: { label: "低", color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-300" },
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
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Brain className="h-6 w-6 text-indigo-500" />
              AI 审核中心
            </h1>
            <p className="text-sm text-slate-500">自动检测设计稿、BOM、工艺包、打样中的潜在问题</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchReviews(true)} disabled={refreshing}>
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
            重新扫描
          </Button>
        </div>

        {/* 4 大统计卡 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="待审核项"
            value={(data?.reviewItems || []).length}
            sub={`${stats.urgent || 0} 项紧急`}
            icon={Brain}
            color="indigo"
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
          <span className="text-xs text-slate-500">类型：</span>
          <button
            onClick={() => setTypeFilter(null)}
            className={`px-3 h-7 rounded-full text-xs font-medium border ${
              !typeFilter
                ? "bg-indigo-500 text-white border-indigo-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
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
                className={`px-3 h-7 rounded-full text-xs font-medium border flex items-center gap-1 ${
                  isActive
                    ? `${v.bg} ${v.color} border-current`
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                <v.icon className="h-3 w-3" />
                {v.label}
                <Badge variant="secondary" className="text-[10px] h-4">
                  {count}
                </Badge>
              </button>
            );
          })}

          <span className="text-xs text-slate-500 ml-4">优先级：</span>
          {["urgent", "high", "medium"].map((p) => {
            const config = PRIORITY_CONFIG[p];
            const isActive = priorityFilter === p;
            return (
              <button
                key={p}
                onClick={() => setPriorityFilter(isActive ? null : p)}
                className={`px-3 h-7 rounded-full text-xs font-medium border ${
                  isActive
                    ? `${config.bg} ${config.color} ${config.border}`
                    : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                }`}
              >
                {config.label}
              </button>
            );
          })}
        </div>

        {/* 审核项列表 */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            AI 扫描中...
          </div>
        ) : error ? (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error}</p>
              </div>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="border-dashed border-slate-200">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-100 to-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <p className="text-slate-700 font-medium mb-1">所有项目已通过审核</p>
              <p className="text-sm text-slate-500 mb-4">
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
  const colorMap: Record<string, { bg: string; text: string }> = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600" },
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
    orange: { bg: "bg-orange-50", text: "text-orange-600" },
  };
  const c = colorMap[color];
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <div className={`p-2 rounded-lg ${c.bg}`}>
            <Icon className={`h-4 w-4 ${c.text}`} />
          </div>
        </div>
        <p className="text-2xl font-bold text-slate-900">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{title}</p>
        <p className="text-xs text-slate-400 mt-0.5">{sub}</p>
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
    <Card className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden">
      <div className="flex">
        {/* 左侧类型条 */}
        <div className={`w-1 ${typeConfig.bg.replace("bg-", "bg-")} bg-gradient-to-b`} />
        <div className="flex-1 p-4">
          <div className="flex items-start gap-4">
            <div className={`p-2 rounded-lg ${typeConfig.bg} flex-shrink-0`}>
              <TypeIcon className={`h-5 w-5 ${typeConfig.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="outline" className={`${typeConfig.bg} ${typeConfig.color} border-0`}>
                  {typeConfig.label}
                </Badge>
                <Badge variant="outline" className={`${priorityConfig.bg} ${priorityConfig.color} ${priorityConfig.border}`}>
                  {priorityConfig.label}
                </Badge>
                <h3 className="font-semibold text-slate-800 truncate">{item.title}</h3>
              </div>

              {/* 问题列表 */}
              {item.issues?.length > 0 && (
                <div className="mb-3 space-y-1">
                  {item.issues.map((issue: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-slate-700">
                      <AlertTriangle className={`h-3.5 w-3.5 mt-0.5 flex-shrink-0 ${
                        item.priority === "urgent" ? "text-red-500" :
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
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-500">
                      <Lightbulb className="h-3 w-3 mt-0.5 text-indigo-500 flex-shrink-0" />
                      <span>{suggestion}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* 底部操作 */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center gap-3 text-xs text-slate-400">
                  {item.totalCost && item.targetCost && (
                    <span className="text-amber-600 font-medium">
                      成本：¥{item.totalCost.toLocaleString("zh-CN")} / 目标 ¥{item.targetCost.toLocaleString("zh-CN")}
                    </span>
                  )}
                </div>
                <Link href={`/styles/${item.styleId}`}>
                  <Button size="sm" variant="ghost" className="h-7 text-xs">
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
