// 款式开发中心 - 商品开发协同核心
// 支持三视图：网格 / 看板 / 表格
// 多品牌上下文自动隔离数据

"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/auth/tenant-context";
import { useApi } from "@/lib/api/use-api";
import {
  Plus,
  Loader2,
  Search,
  Shirt,
  Image as ImageIcon,
  LayoutGrid,
  Kanban,
  Table as TableIcon,
  ChevronRight,
  AlertCircle,
  AlertTriangle,
  Filter,
  Sparkles,
  RefreshCw,
  Target,
  BarChart3,
  TrendingUp,
  Clock,
  Layers,
  Zap,
  Factory,
} from "lucide-react";

// 11 个状态配置（对应 state machine）
const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; progress: number }> = {
  planning: { label: "企划中", bg: "bg-sand-100", text: "text-slate-700", border: "border-sand-200", progress: 10 },
  designing: { label: "设计中", bg: "bg-navy-100", text: "text-navy-700", border: "border-navy-200", progress: 25 },
  designed: { label: "设计定稿", bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200", progress: 35 },
  sampling: { label: "打样中", bg: "bg-terracotta-100", text: "text-terracotta-600", border: "border-terracotta-200", progress: 50 },
  sampled: { label: "封样", bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200", progress: 65 },
  producing: { label: "生产中", bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200", progress: 80 },
  produced: { label: "已生产", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", progress: 90 },
  selling: { label: "销售中", bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200", progress: 95 },
  sold: { label: "销售结束", bg: "bg-gray-50", text: "text-gray-700", border: "border-gray-200", progress: 100 },
  reviewing: { label: "复盘中", bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200", progress: 100 },
  archived: { label: "已归档", bg: "bg-sand-100", text: "text-slate-500", border: "border-sand-200", progress: 100 },
};

// 看板视图展示的核心 7 个状态（精简版）
const KANBAN_STAGES = [
  { key: "planning", label: "企划中", color: "slate" },
  { key: "designing", label: "设计中", color: "navy" },
  { key: "sampling", label: "打样中", color: "terracotta" },
  { key: "sampled", label: "封样", color: "amber" },
  { key: "producing", label: "生产中", color: "emerald" },
  { key: "produced", label: "已生产", color: "emerald" },
  { key: "selling", label: "销售中", color: "purple" },
];

const KANBAN_COLOR_MAP: Record<string, { header: string; border: string; accent: string }> = {
  slate: { header: "bg-sand-100 border-sand-200", border: "border-sand-200", accent: "bg-slate-400" },
  navy: { header: "bg-navy-100 border-navy-200", border: "border-navy-200", accent: "bg-navy-700" },
  terracotta: { header: "bg-terracotta-100 border-terracotta-200", border: "border-terracotta-200", accent: "bg-terracotta-400" },
  amber: { header: "bg-amber-100 border-amber-200", border: "border-amber-200", accent: "bg-amber-400" },
  emerald: { header: "bg-emerald-100 border-emerald-200", border: "border-emerald-200", accent: "bg-success" },
  purple: { header: "bg-purple-100 border-purple-200", border: "border-purple-200", accent: "bg-purple-400" },
};

type ViewMode = "grid" | "kanban" | "table";

export default function StylesPage() {
  const { currentBrand, currentSeason } = useTenant();
  const api = useApi();
  const router = useRouter();

  const [allStyles, setAllStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<ViewMode>("kanban");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"updatedAt" | "createdAt" | "styleNo">("updatedAt");

  // 加载款式数据
  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get<any>("/api/styles");
      // 兼容两种返回格式
      const styles = Array.isArray(res) ? res : res.data || [];
      setAllStyles(styles);
    } catch (err: any) {
      console.error("获取款式失败:", err);
      setError(err?.message || "加载款式失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.id, currentSeason?.id]);

  // 分类选项
  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const s of allStyles) {
      if (s.category) set.add(s.category);
    }
    return Array.from(set);
  }, [allStyles]);

  // 阶段统计
  const stageStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const s of allStyles) {
      stats[s.status] = (stats[s.status] || 0) + 1;
    }
    return stats;
  }, [allStyles]);

  // 过滤后的款式
  const filteredStyles = useMemo(() => {
    let result = allStyles;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (s) => (s.name || "").toLowerCase().includes(q) || (s.styleNo || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (categoryFilter) {
      result = result.filter((s) => s.category === categoryFilter);
    }
    // 排序
    result = [...result].sort((a, b) => {
      if (sortBy === "styleNo") {
        return (a.styleNo || "").localeCompare(b.styleNo || "");
      }
      const av = new Date(a[sortBy] || 0).getTime();
      const bv = new Date(b[sortBy] || 0).getTime();
      return bv - av;
    });
    return result;
  }, [allStyles, search, statusFilter, categoryFilter, sortBy]);

  const handleStyleClick = (id: string) => {
    router.push(`/styles/${id}`);
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center shadow-premium">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">款式开发中心</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              {currentBrand ? (
                <>
                  <span className="font-medium text-foreground">{currentBrand.name}</span>
                  {currentSeason && <span className="mx-2">·</span>}
                  {currentSeason && <span>{currentSeason.name}</span>}
                  <span className="mx-2">·</span>
                  <span>共 {allStyles.length} 个款式</span>
                </>
              ) : (
                "加载中..."
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* 视图切换 */}
            <div className="flex items-center bg-card rounded-xl p-0.5 border border-border shadow-sm">
              <button
                onClick={() => setView("kanban")}
                className={`p-1.5 rounded-lg transition-all ${
                  view === "kanban" ? "bg-navy-700 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                title="看板视图"
              >
                <Kanban className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("grid")}
                className={`p-1.5 rounded-lg transition-all ${
                  view === "grid" ? "bg-navy-700 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                title="网格视图"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
              <button
                onClick={() => setView("table")}
                className={`p-1.5 rounded-lg transition-all ${
                  view === "table" ? "bg-navy-700 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
                title="表格视图"
              >
                <TableIcon className="h-4 w-4" />
              </button>
            </div>
            <Button asChild className="bg-navy-700 hover:bg-navy-800 text-white">
              <Link href="/styles/new">
                <Plus className="h-4 w-4 mr-1.5" />
                新建款式
              </Link>
            </Button>
          </div>
        </div>

        {/* 开发进度概览 */}
        {!loading && allStyles.length > 0 && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 整体开发进度 */}
            <Card className="card-premium">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    整体开发完成率
                  </span>
                  <Badge variant="secondary" className="bg-navy-100 text-navy-700 hover:bg-navy-100">
                    {allStyles.length} 款
                  </Badge>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-navy-700">
                    {(() => {
                      const completed = allStyles.filter(
                        (s) => s.status === "produced" || s.status === "selling" || s.status === "sold" || s.status === "archived"
                      ).length;
                      return allStyles.length > 0 ? ((completed / allStyles.length) * 100).toFixed(0) : 0;
                    })()}
                  </span>
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
                <div className="h-2 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-navy-700 to-terracotta-400 transition-all"
                    style={{
                      width: `${(() => {
                        const completed = allStyles.filter(
                          (s) => s.status === "produced" || s.status === "selling" || s.status === "sold" || s.status === "archived"
                        ).length;
                        return allStyles.length > 0 ? (completed / allStyles.length) * 100 : 0;
                      })()}%`,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span>已完成 {allStyles.filter((s) => s.status === "produced" || s.status === "selling" || s.status === "sold" || s.status === "archived").length} 款</span>
                  <span>开发中 {allStyles.filter((s) => s.status !== "produced" && s.status !== "selling" && s.status !== "sold" && s.status !== "archived").length} 款</span>
                </div>
              </CardContent>
            </Card>

            {/* 关键阶段统计 */}
            <Card className="card-premium lg:col-span-2">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" />
                    关键阶段分布
                  </span>
                  <button
                    onClick={() => setStatusFilter(null)}
                    className="text-xs text-navy-700 hover:underline"
                  >
                    查看全部
                  </button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {[
                    { key: "designing", label: "设计中", icon: Sparkles, color: "navy" },
                    { key: "sampling", label: "打样中", icon: Shirt, color: "terracotta" },
                    { key: "producing", label: "生产中", icon: Factory, color: "emerald" },
                    { key: "selling", label: "销售中", icon: TrendingUp, color: "purple" },
                  ].map((stage) => {
                    const count = stageStats[stage.key] || 0;
                    const pct = allStyles.length > 0 ? (count / allStyles.length) * 100 : 0;
                    const bgColor = stage.color === "navy" ? "bg-navy-50" : stage.color === "terracotta" ? "bg-terracotta-50" : stage.color === "emerald" ? "bg-emerald-50" : "bg-purple-50";
                    const textColor = stage.color === "navy" ? "text-navy-700" : stage.color === "terracotta" ? "text-terracotta-700" : stage.color === "emerald" ? "text-emerald-700" : "text-purple-700";
                    const Icon = stage.icon;
                    return (
                      <div
                        key={stage.key}
                        className={`p-3 rounded-xl ${bgColor} border border-transparent hover:border-current/20 cursor-pointer transition-all`}
                        onClick={() => setStatusFilter(stage.key)}
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <Icon className={`h-3.5 w-3.5 ${textColor}`} />
                          <span className={`text-xs font-medium ${textColor}`}>{stage.label}</span>
                        </div>
                        <div className="text-xl font-bold text-foreground">{count}</div>
                        <div className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% 占比</div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 品类分布 + 阶段转化 */}
        {!loading && allStyles.length > 0 && categories.length > 0 && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* 品类分布 */}
            <Card className="card-premium">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <BarChart3 className="h-3.5 w-3.5" />
                    品类分布
                  </span>
                  <span className="text-xs text-muted-foreground">共 {categories.length} 个品类</span>
                </div>
                <div className="space-y-2.5">
                  {categories.slice(0, 6).map((cat, i) => {
                    const count = allStyles.filter((s) => s.category === cat).length;
                    const pct = allStyles.length > 0 ? (count / allStyles.length) * 100 : 0;
                    const colors = [
                      "bg-navy-500",
                      "bg-terracotta-500",
                      "bg-emerald-500",
                      "bg-purple-500",
                      "bg-amber-500",
                      "bg-pink-500",
                    ];
                    const color = colors[i % colors.length];
                    return (
                      <div
                        key={cat}
                        className="flex items-center gap-3 cursor-pointer hover:bg-slate-50 -mx-1 px-1 py-0.5 rounded-md transition-colors"
                        onClick={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                      >
                        <div className="w-20 text-xs text-muted-foreground truncate flex-shrink-0">
                          {cat}
                        </div>
                        <div className="flex-1 h-4 bg-slate-100 rounded-md overflow-hidden">
                          <div
                            className={`h-full rounded-md ${color} transition-all`}
                            style={{ width: `${Math.max(pct, count > 0 ? 5 : 0)}%` }}
                          />
                        </div>
                        <div className="w-16 text-right text-xs flex-shrink-0">
                          <span className="font-semibold text-foreground">{count}</span>
                          <span className="text-muted-foreground ml-1">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {categories.length > 6 && (
                  <div className="text-xs text-muted-foreground mt-2">
                    还有 {categories.length - 6} 个品类，使用上方品类筛选查看
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 阶段转化漏斗 */}
            <Card className="card-premium">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    阶段转化概览
                  </span>
                  <span className="text-xs text-muted-foreground">各阶段数量</span>
                </div>
                <div className="space-y-1.5">
                  {[
                    { key: "planning", label: "企划", color: "from-slate-300 to-slate-400" },
                    { key: "designing", label: "设计", color: "from-navy-400 to-navy-600" },
                    { key: "sampling", label: "打样", color: "from-terracotta-400 to-terracotta-600" },
                    { key: "producing", label: "生产", color: "from-emerald-400 to-emerald-600" },
                    { key: "selling", label: "销售", color: "from-purple-400 to-purple-600" },
                  ].map((stage) => {
                    const count = stageStats[stage.key] || 0;
                    const maxCount = Math.max(...Object.values(stageStats), 1);
                    const widthPct = maxCount > 0 ? (count / maxCount) * 100 : 0;
                    return (
                      <div key={stage.key} className="flex items-center gap-2">
                        <div className="w-10 text-[10px] text-muted-foreground flex-shrink-0">
                          {stage.label}
                        </div>
                        <div className="flex-1 h-6 bg-slate-50 rounded-md overflow-hidden relative">
                          <div
                            className={`h-full rounded-md bg-gradient-to-r ${stage.color} flex items-center justify-end px-2 transition-all`}
                            style={{ width: `${Math.max(widthPct, count > 0 ? 10 : 0)}%` }}
                          >
                            {count > 0 && (
                              <span className="text-[10px] font-bold text-white">{count}</span>
                            )}
                          </div>
                        </div>
                        <div className="w-10" />
                      </div>
                    );
                  })}
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border text-xs">
                  <div className="text-muted-foreground">
                    <Clock className="h-3 w-3 inline mr-1" />
                    平均周期
                  </div>
                  <div className="font-semibold text-foreground">
                    {allStyles.filter((s) => s.createdAt && (s.status === "produced" || s.status === "selling")).length > 0
                      ? (() => {
                          const completed = allStyles.filter(
                            (s) => s.createdAt && (s.status === "produced" || s.status === "selling")
                          );
                          if (completed.length === 0) return "—";
                          const totalDays = completed.reduce((sum: number, s: any) => {
                            const start = new Date(s.createdAt).getTime();
                            const end = new Date().getTime();
                            return sum + Math.ceil((end - start) / (1000 * 60 * 60 * 24));
                          }, 0);
                          return `${Math.round(totalDays / completed.length)} 天`;
                        })()
                      : "—"}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 阶段快速筛选条 */}
        <div className="mb-5 flex items-center gap-2.5 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !statusFilter
                ? "bg-navy-700 text-white border-navy-700"
                : "bg-card text-muted-foreground border-border hover:border-navy-200"
            }`}
          >
            全部 ({allStyles.length})
          </button>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
            const count = stageStats[key] || 0;
            if (count === 0) return null;
            const isActive = statusFilter === key;
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  isActive
                    ? `${cfg.bg} ${cfg.text} ${cfg.border} ring-2 ring-offset-1 ring-navy-200`
                    : `${cfg.bg} ${cfg.text} ${cfg.border} hover:shadow-sm`
                }`}
              >
                {cfg.label} ({count})
              </button>
            );
          })}
        </div>

        {/* 搜索和筛选栏 */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索款号或名称..."
              className="pl-10 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {categories.length > 0 && (
            <select
              value={categoryFilter || ""}
              onChange={(e) => setCategoryFilter(e.target.value || null)}
              className="h-9 px-3 rounded-lg border border-border text-sm bg-card hover:border-navy-200 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">全品类</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          )}

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="h-9 px-3 rounded-lg border border-border text-sm bg-card hover:border-navy-200 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="updatedAt">按更新时间</option>
            <option value="createdAt">按创建时间</option>
            <option value="styleNo">按款号</option>
          </select>

          {(statusFilter || categoryFilter || search) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setStatusFilter(null);
                setCategoryFilter(null);
                setSearch("");
              }}
            >
              清除筛选
            </Button>
          )}

          <div className="ml-auto text-sm text-muted-foreground bg-card px-3 py-1.5 rounded-lg border border-border">
            显示 <span className="font-semibold text-foreground">{filteredStyles.length}</span> / {allStyles.length}
          </div>
        </div>

        {/* 主体内容 */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2 card-premium">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载款式数据...
          </div>
        ) : error ? (
          <Card className="card-premium border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-destructive">加载失败</p>
                  <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchData()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : allStyles.length === 0 ? (
          <EmptyState onCreate={() => router.push("/styles/new")} hasBrand={!!currentBrand} />
        ) : filteredStyles.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-xl border border-dashed border-border card-premium">
            <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">没有匹配的款式</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => {
                setStatusFilter(null);
                setCategoryFilter(null);
                setSearch("");
              }}
            >
              清除筛选
            </Button>
          </div>
        ) : view === "kanban" ? (
          <KanbanView
            styles={statusFilter ? filteredStyles : allStyles}
            onStyleClick={handleStyleClick}
            activeStatus={statusFilter}
          />
        ) : view === "grid" ? (
          <GridView styles={filteredStyles} onStyleClick={handleStyleClick} />
        ) : (
          <TableView styles={filteredStyles} onStyleClick={handleStyleClick} />
        )}
      </div>
    </SidebarLayout>
  );
}

// ============== 看板视图 ==============
function KanbanView({
  styles,
  onStyleClick,
  activeStatus,
}: {
  styles: any[];
  onStyleClick: (id: string) => void;
  activeStatus: string | null;
}) {
  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-max">
        {KANBAN_STAGES.map((stage) => {
          const stageStyles = styles.filter((s) => s.status === stage.key);
          const colors = KANBAN_COLOR_MAP[stage.color];
          const isActiveColumn = activeStatus === stage.key;
          return (
            <div
              key={stage.key}
              className={`w-80 flex-shrink-0 rounded-2xl border ${colors.border} bg-card ${
                isActiveColumn ? "ring-2 ring-offset-1 ring-navy-200" : ""
              }`}
            >
              {/* 列头 */}
              <div className={`px-4 py-3 border-b ${colors.header} rounded-t-2xl flex items-center justify-between`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-1.5 h-5 rounded-full ${colors.accent}`} />
                  <span className="text-sm font-semibold text-foreground">{stage.label}</span>
                  <Badge variant="secondary" className="h-5 px-2 text-xs bg-card">
                    {stageStyles.length}
                  </Badge>
                </div>
              </div>

              {/* 卡片列表 */}
              <div className="p-3 space-y-3 max-h-[calc(100vh-260px)] overflow-y-auto">
                {stageStyles.length === 0 ? (
                  <div className="py-8 text-center text-xs text-muted-foreground">无款式</div>
                ) : (
                  stageStyles.map((style) => (
                    <StyleCardMini key={style.id} style={style} onClick={() => onStyleClick(style.id)} />
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// 看板小卡片
function StyleCardMini({ style, onClick }: { style: any; onClick: () => void }) {
  const cfg = STATUS_CONFIG[style.status] || STATUS_CONFIG.planning;
  const costOverrun = style.targetCost && style.actualCost && style.actualCost > style.targetCost;
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl border border-border hover:border-navy-200 hover:shadow-premium transition-all cursor-pointer p-3 group"
    >
      <div className="flex items-start justify-between mb-2">
        <p className="text-sm font-semibold text-foreground truncate flex-1 leading-tight">{style.name}</p>
        <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-navy-700 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
      </div>
      <p className="text-xs text-muted-foreground mb-2.5">{style.styleNo}</p>
      {style.coverImage ? (
        <div className="aspect-[4/3] bg-sand-100 rounded-lg mb-3 overflow-hidden">
          <img
            src={style.coverImage}
            alt={style.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-sand-100 rounded-lg mb-3 flex items-center justify-center">
          <ImageIcon className="h-8 w-8 text-muted-foreground/30" />
        </div>
      )}
      <div className="flex items-center justify-between gap-2">
        {style.category ? (
          <Badge variant="outline" className="text-[11px] h-5 px-1.5 border-border">
            {style.category}
          </Badge>
        ) : (
          <span />
        )}
        {style.targetCost ? (
          <span className={`text-xs font-medium ${costOverrun ? "text-destructive" : "text-foreground"}`}>
            ¥{style.targetCost}
            {style.actualCost && (
              <span className={costOverrun ? "text-destructive/80" : "text-muted-foreground/70 font-normal ml-1"}>
                / ¥{style.actualCost}
              </span>
            )}
          </span>
        ) : (
          <span />
        )}
      </div>
    </div>
  );
}

// ============== 网格视图 ==============
function GridView({ styles, onStyleClick }: { styles: any[]; onStyleClick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-5">
      {styles.map((style) => (
        <StyleCardLarge key={style.id} style={style} onClick={() => onStyleClick(style.id)} />
      ))}
    </div>
  );
}

function StyleCardLarge({ style, onClick }: { style: any; onClick: () => void }) {
  const cfg = STATUS_CONFIG[style.status] || STATUS_CONFIG.planning;
  const costOverrun = style.targetCost && style.actualCost && style.actualCost > style.targetCost;
  return (
    <Card className="card-premium cursor-pointer hover:shadow-premium transition-all overflow-hidden group" onClick={onClick}>
      <div className="aspect-[3/4] bg-gradient-to-br from-sand-100 to-sand-200 flex items-center justify-center relative overflow-hidden">
        {style.coverImage ? (
          <img
            src={style.coverImage}
            alt={style.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <ImageIcon className="h-12 w-12 text-muted-foreground/30" />
        )}
        <Badge className={`absolute top-3 left-3 ${cfg.bg} ${cfg.text} border-0 shadow-sm`}>{cfg.label}</Badge>
        {costOverrun && (
          <div className="absolute top-3 right-3 bg-destructive text-white rounded-full p-1 shadow-sm" title="成本超支">
            <AlertCircle className="h-3 w-3" />
          </div>
        )}
      </div>
      <CardContent className="p-4">
        <p className="font-semibold text-sm text-foreground truncate">{style.name}</p>
        <p className="text-xs text-muted-foreground mt-1 mb-3">{style.styleNo}</p>
        <div className="flex items-center justify-between">
          {style.category ? (
            <Badge variant="outline" className="text-[11px] h-5 px-1.5 border-border">
              {style.category}
            </Badge>
          ) : (
            <span />
          )}
          {style.targetCost ? (
            <span className={`text-xs font-medium ${costOverrun ? "text-destructive" : "text-foreground"}`}>
              ¥{style.targetCost}
              {style.actualCost && (
                <span className={costOverrun ? "text-destructive/80" : "text-muted-foreground/70 font-normal ml-1"}>
                  / ¥{style.actualCost}
                </span>
              )}
            </span>
          ) : (
            <span />
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ============== 表格视图 ==============
function TableView({ styles, onStyleClick }: { styles: any[]; onStyleClick: (id: string) => void }) {
  return (
    <Card className="card-premium overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-sand-50 border-b border-border">
            <tr className="text-left text-xs text-muted-foreground">
              <th className="px-5 py-3.5 font-medium">款号</th>
              <th className="px-5 py-3.5 font-medium">名称</th>
              <th className="px-5 py-3.5 font-medium">品类</th>
              <th className="px-5 py-3.5 font-medium">状态</th>
              <th className="px-5 py-3.5 font-medium text-right">目标成本</th>
              <th className="px-5 py-3.5 font-medium text-right">实际成本</th>
              <th className="px-5 py-3.5 font-medium">更新时间</th>
              <th className="px-5 py-3.5"></th>
            </tr>
          </thead>
          <tbody>
            {styles.map((style) => {
              const cfg = STATUS_CONFIG[style.status] || STATUS_CONFIG.planning;
              const costOverrun =
                style.targetCost && style.actualCost && style.actualCost > style.targetCost;
              return (
                <tr
                  key={style.id}
                  onClick={() => onStyleClick(style.id)}
                  className="border-b border-border hover:bg-sand-50/50 cursor-pointer transition-colors"
                >
                  <td className="px-5 py-3.5 font-mono text-xs text-foreground">{style.styleNo}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-lg bg-sand-100 flex-shrink-0 overflow-hidden">
                        {style.coverImage ? (
                          <img
                            src={style.coverImage}
                            alt={style.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="h-5 w-5 text-muted-foreground/40 m-2" />
                        )}
                      </div>
                      <span className="font-medium text-foreground truncate">{style.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-foreground">{style.category || "-"}</td>
                  <td className="px-5 py-3.5">
                    <Badge className={`${cfg.bg} ${cfg.text} border-0`}>{cfg.label}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right text-foreground">
                    {style.targetCost ? `¥${style.targetCost}` : "-"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {style.actualCost ? (
                      <span className={costOverrun ? "text-destructive font-semibold" : "text-foreground"}>
                        ¥{style.actualCost}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-muted-foreground text-xs">
                    {style.updatedAt ? new Date(style.updatedAt).toLocaleDateString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "numeric",
                      minute: "numeric",
                    }) : "-"}
                  </td>
                  <td className="px-5 py-3.5">
                    <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ============== 空状态 ==============
function EmptyState({ onCreate, hasBrand }: { onCreate: () => void; hasBrand: boolean }) {
  return (
    <div className="text-center py-16 bg-card rounded-2xl border border-dashed border-border card-premium">
      <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
        <Shirt className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-2">
        {hasBrand ? "还没有款式" : "请先选择品牌"}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {hasBrand
          ? "从第一个款式开始你的产品开发"
          : "在右上角的品牌切换器中选择一个品牌"}
      </p>
      {hasBrand && (
        <Button onClick={onCreate} className="bg-navy-700 hover:bg-navy-800 text-white">
          <Plus className="h-4 w-4 mr-2" />
          创建第一个款式
        </Button>
      )}
    </div>
  );
}
