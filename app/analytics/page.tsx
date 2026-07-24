// 经营反馈中心 - 销售/复盘数据看板
// 完整数据闭环：企划 → 款式 → 销售 → 复盘

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
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  Calendar,
  Sparkles,
  AlertCircle,
  Lightbulb,
  DollarSign,
  PieChart,
  RefreshCw,
  Award,
  TrendingDown,
  ChevronRight,
} from "lucide-react";

const INSIGHT_CONFIG = {
  warning: {
    icon: AlertTriangle,
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
  },
  success: {
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
  },
  info: {
    icon: Lightbulb,
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
  },
};

const CATEGORY_COLORS = [
  "bg-pink-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-purple-500",
  "bg-red-500",
  "bg-cyan-500",
  "bg-yellow-500",
];

export default function AnalyticsPage() {
  const { currentBrand, currentSeason } = useTenant();
  const api = useApi();

  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trendDays, setTrendDays] = useState(30);

  const loadAnalytics = async (showRefreshing = false) => {
    try {
      if (showRefreshing) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const data = await api.get<any>(`/api/analytics?days=${trendDays}`);
      setAnalytics(data);
    } catch (err: any) {
      console.error("加载分析数据失败:", err);
      setError(err?.message || "加载失败");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.id, currentSeason?.id, trendDays]);

  const formatCurrency = (v: number) => {
    if (v >= 10000) {
      return `¥${(v / 10000).toFixed(2)}万`;
    }
    return `¥${v.toLocaleString("zh-CN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
  };

  const kpiCards = useMemo(() => {
    if (!analytics) return [];
    const k = analytics.kpi;
    const avgSt = analytics.sellthrough?.avgSellthroughRate || 0;
    const activeRate = k.activeSellRate || 0;
    return [
      {
        title: "总销售额",
        value: formatCurrency(k.totalRevenue),
        icon: DollarSign,
        color: "blue",
        desc: `${k.totalOrders} 笔订单`,
      },
      {
        title: "总销量",
        value: `${k.totalQuantity} 件`,
        icon: ShoppingCart,
        color: "amber",
        desc: `在售 ${k.stylesOnSale} 款`,
      },
      {
        title: "平均件单价",
        value: formatCurrency(k.avgSellingPrice),
        icon: TrendingUp,
        color: "green",
        desc: `客单价 ${formatCurrency(k.avgOrderValue)}`,
      },
      {
        title: "动销率",
        value: `${activeRate}%`,
        icon: Package,
        color: activeRate < 50 ? "red" : "green",
        desc: `有销售 ${activeRate > 0 ? Math.round((k.stylesOnSale * activeRate) / 100) : 0} 款`,
      },
      {
        title: "平均售罄率",
        value: `${avgSt}%`,
        icon: avgSt >= 50 ? TrendingUp : TrendingDown,
        color: avgSt >= 50 ? "green" : avgSt >= 30 ? "amber" : "red",
        desc:
          analytics.sellthrough?.distribution?.excellent > 0
            ? `${analytics.sellthrough.distribution.excellent} 款售罄超 80%`
            : "按目标产量计算",
      },
      {
        title: "退货率",
        value: `${k.returnRate}%`,
        icon: k.returnRate > 5 ? AlertTriangle : CheckCircle,
        color: k.returnRate > 5 ? "red" : "green",
        desc: k.returnRate > 5 ? "需关注" : "正常水平",
      },
    ];
  }, [analytics]);

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">经营反馈中心</h1>
            <p className="text-sm text-slate-500">
              {currentBrand ? (
                <>
                  <span className="font-medium text-slate-700">{currentBrand.name}</span>
                  {currentSeason && <span className="mx-2">·</span>}
                  {currentSeason && <span>{currentSeason.name}</span>}
                  <span className="mx-2">·</span>
                  <span>数据驱动决策</span>
                </>
              ) : (
                "加载中..."
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={trendDays}
              onChange={(e) => setTrendDays(parseInt(e.target.value))}
              className="h-9 px-3 rounded-md border border-slate-200 text-sm bg-white hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
            >
              <option value="7">近 7 天</option>
              <option value="30">近 30 天</option>
              <option value="90">近 90 天</option>
            </select>
            <Button variant="outline" size="sm" onClick={() => loadAnalytics(true)} disabled={refreshing}>
              <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载经营数据...
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
                <Button variant="outline" size="sm" onClick={() => loadAnalytics()} className="ml-auto">
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* 1. 4 大 KPI 卡片 */}
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-6">
              {kpiCards.map((card, i) => {
                const colorMap: Record<string, { bg: string; text: string }> = {
                  blue: { bg: "bg-blue-50", text: "text-blue-600" },
                  amber: { bg: "bg-amber-50", text: "text-amber-600" },
                  green: { bg: "bg-green-50", text: "text-green-600" },
                  red: { bg: "bg-red-50", text: "text-red-600" },
                };
                const c = colorMap[card.color];
                return (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className={`p-2 rounded-lg ${c.bg}`}>
                          <card.icon className={`h-4 w-4 ${c.text}`} />
                        </div>
                      </div>
                      <p className="text-2xl font-bold text-slate-900">{card.value}</p>
                      <p className="text-xs text-slate-500 mt-1">{card.title}</p>
                      <p className="text-xs text-slate-400 mt-0.5">{card.desc}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* 2. 复盘建议（数据驱动洞察） */}
            {analytics?.insights && analytics.insights.length > 0 && (
              <Card className="mb-6 border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500" />
                    数据洞察
                    <Badge variant="secondary" className="ml-1">
                      {analytics.insights.length}
                    </Badge>
                  </CardTitle>
                  <CardDescription className="text-xs">基于当前数据的自动分析建议</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {analytics.insights.map((insight: any, i: number) => {
                      const config = INSIGHT_CONFIG[insight.type as keyof typeof INSIGHT_CONFIG];
                      const Icon = config.icon;
                      return (
                        <div
                          key={i}
                          className={`flex items-start gap-3 p-3 rounded-lg border ${config.border} ${config.bg}`}
                        >
                          <div className={`p-1.5 rounded ${config.bg} flex-shrink-0`}>
                            <Icon className={`h-4 w-4 ${config.color}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${config.color}`}>{insight.title}</p>
                            <p className="text-xs text-slate-600 mt-0.5">{insight.description}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* 3. 销售趋势图 */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        销售趋势
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">近 {trendDays} 天日销售趋势</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <TrendChart trend={analytics?.trend || []} formatCurrency={formatCurrency} />
                </CardContent>
              </Card>

              {/* 4. 品类销售占比 */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-pink-500" />
                    品类销售占比
                  </CardTitle>
                  <CardDescription className="text-xs">按销售额排名</CardDescription>
                </CardHeader>
                <CardContent>
                  <CategoryBreakdown data={analytics?.categoryBreakdown || []} formatCurrency={formatCurrency} />
                </CardContent>
              </Card>
            </div>

            {/* 售罄率分析 + 滞销款分析 */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* 售罄率分布 */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                    售罄率分布
                  </CardTitle>
                  <CardDescription className="text-xs mt-1">
                    平均售罄率 {analytics?.sellthrough?.avgSellthroughRate || 0}%
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <SellthroughDistribution distribution={analytics?.sellthrough?.distribution} />
                </CardContent>
              </Card>

              {/* 滞销款预警 */}
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                        滞销款预警
                      </CardTitle>
                      <CardDescription className="text-xs mt-1">
                        售罄率低于 10% 的在售款式
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {analytics?.sellthrough?.deadStockStyles?.length || 0} 款
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <DeadStockList styles={analytics?.sellthrough?.deadStockStyles || []} />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* 5. 款式销售排行 - 按销售额 */}
              <StyleRanking
                title="款式销售排行（按销售额）"
                icon={Award}
                data={analytics?.topStylesByRevenue || []}
                valueKey="revenue"
                valueFormatter={formatCurrency}
                color="amber"
              />

              {/* 6. 款式销售排行 - 按销量 */}
              <StyleRanking
                title="款式销售排行（按销量）"
                icon={Package}
                data={analytics?.topStylesByQuantity || []}
                valueKey="quantity"
                valueFormatter={(v) => `${v} 件`}
                color="blue"
              />
            </div>

            {/* 7. 渠道分布 + 售后分析 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-green-500" />
                    销售渠道分布
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(!analytics?.channelBreakdown || analytics.channelBreakdown.length === 0) ? (
                    <p className="text-sm text-slate-400 py-6 text-center">暂无渠道数据</p>
                  ) : (
                    <div className="space-y-2.5">
                      {analytics.channelBreakdown.map((ch: any, i: number) => {
                        const total = analytics.kpi.totalRevenue || 1;
                        const pct = (ch.revenue / total) * 100;
                        return (
                          <div key={i}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-slate-700">{ch.channel}</span>
                              <span className="text-sm font-semibold text-slate-900">
                                {formatCurrency(ch.revenue)}
                                <span className="text-xs text-slate-500 ml-1">({pct.toFixed(1)}%)</span>
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    售后分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { key: "return", label: "退货", color: "bg-red-50 text-red-700" },
                      { key: "exchange", label: "换货", color: "bg-blue-50 text-blue-700" },
                      { key: "complaint", label: "投诉", color: "bg-amber-50 text-amber-700" },
                    ].map((t) => {
                      const count = analytics?.aftersales?.byType?.[t.key] || 0;
                      return (
                        <div key={t.key} className={`p-3 rounded-lg ${t.color}`}>
                          <p className="text-2xl font-bold">{count}</p>
                          <p className="text-xs mt-1 opacity-80">{t.label}</p>
                        </div>
                      );
                    })}
                  </div>
                  <div className="pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-600">售后总数</span>
                      <span className="font-semibold text-slate-900">
                        {analytics?.aftersales?.total || 0} 条
                      </span>
                    </div>
                    {analytics?.kpi?.returnRate > 0 && (
                      <div className="flex items-center justify-between text-sm mt-2">
                        <span className="text-slate-600">退货率</span>
                        <span
                          className={`font-semibold ${
                            analytics.kpi.returnRate > 5 ? "text-red-600" : "text-slate-900"
                          }`}
                        >
                          {analytics.kpi.returnRate}%
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}

// 趋势图组件（柱状图）
function TrendChart({ trend, formatCurrency }: { trend: any[]; formatCurrency: (v: number) => string }) {
  if (!trend || trend.length === 0 || trend.every((d) => d.revenue === 0)) {
    return (
      <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center text-sm text-slate-400">
        近 {trend.length} 天暂无销售数据
      </div>
    );
  }

  const maxRevenue = Math.max(...trend.map((d) => d.revenue), 1);

  // 根据天数决定 label 间隔
  const labelInterval = trend.length > 30 ? 5 : trend.length > 14 ? 3 : 2;

  return (
    <div>
      <div className="h-64 flex items-end gap-1 px-2">
        {trend.map((day, idx) => {
          const heightPct = (day.revenue / maxRevenue) * 100;
          const isToday = idx === trend.length - 1;
          return (
            <div
              key={day.date}
              className="flex-1 flex flex-col items-center justify-end group relative"
              style={{ minWidth: "8px" }}
            >
              <div
                className={`w-full rounded-t transition-all ${
                  isToday
                    ? "bg-gradient-to-t from-blue-500 to-blue-400"
                    : "bg-gradient-to-t from-slate-300 to-slate-200 hover:from-blue-400 hover:to-blue-300"
                }`}
                style={{ height: `${Math.max(heightPct, 1)}%` }}
              />
              {/* Tooltip */}
              <div className="opacity-0 group-hover:opacity-100 absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10 pointer-events-none transition-opacity">
                <div className="font-semibold">{day.date}</div>
                <div>{formatCurrency(day.revenue)}</div>
                <div className="text-slate-400">{day.quantity}件 / {day.orders}单</div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex justify-between mt-2 px-1 text-[10px] text-slate-400">
        {trend.filter((_, i) => i % labelInterval === 0).map((day) => (
          <span key={day.date}>{day.date.split("-").slice(1).join("/")}</span>
        ))}
      </div>
    </div>
  );
}

// 品类销售占比
function CategoryBreakdown({ data, formatCurrency }: { data: any[]; formatCurrency: (v: number) => string }) {
  if (!data || data.length === 0) {
    return <p className="text-sm text-slate-400 py-6 text-center">暂无品类数据</p>;
  }
  const total = data.reduce((sum, d) => sum + d.revenue, 0) || 1;
  return (
    <div className="space-y-3">
      {data.slice(0, 6).map((cat, i) => {
        const pct = (cat.revenue / total) * 100;
        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
        return (
          <div key={cat.category}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-slate-700">{cat.category}</span>
              <span className="text-sm font-semibold text-slate-900">
                {formatCurrency(cat.revenue)}
                <span className="text-xs text-slate-500 ml-1">({pct.toFixed(1)}%)</span>
              </span>
            </div>
            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={`h-full ${color} rounded-full transition-all`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">{cat.quantity} 件</p>
          </div>
        );
      })}
    </div>
  );
}

// 款式排行
function StyleRanking({
  title,
  icon: Icon,
  data,
  valueKey,
  valueFormatter,
  color,
}: {
  title: string;
  icon: any;
  data: any[];
  valueKey: "revenue" | "quantity";
  valueFormatter: (v: number) => string;
  color: "amber" | "blue";
}) {
  const colorMap = {
    amber: "text-amber-500",
    blue: "text-blue-500",
  };
  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className={`h-4 w-4 ${colorMap[color]}`} />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-slate-400 py-6 text-center">暂无数据</p>
        ) : (
          <div className="space-y-2">
            {data.slice(0, 8).map((item, i) => (
              <Link
                key={item.styleId}
                href={`/styles/${item.styleId}`}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors group"
              >
                <div
                  className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    i === 0
                      ? "bg-amber-100 text-amber-700"
                      : i === 1
                      ? "bg-slate-200 text-slate-700"
                      : i === 2
                      ? "bg-orange-100 text-orange-700"
                      : "bg-slate-50 text-slate-500"
                  }`}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-800 truncate">{item.name}</p>
                  <p className="text-xs text-slate-500">
                    {item.styleNo} · {item.category || "未分类"} · {item.orders} 单
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-slate-900">
                    {valueFormatter(item[valueKey])}
                  </p>
                  {valueKey === "revenue" && item.quantity > 0 && (
                    <p className="text-xs text-slate-500">{item.quantity}件</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SellthroughDistribution({
  distribution,
}: {
  distribution: { excellent: number; good: number; fair: number; low: number } | undefined;
}) {
  const tiers = [
    { key: "excellent", label: "优秀 (≥80%)", color: "bg-emerald-500", bg: "bg-emerald-50", text: "text-emerald-700" },
    { key: "good", label: "良好 (50-80%)", color: "bg-blue-500", bg: "bg-blue-50", text: "text-blue-700" },
    { key: "fair", label: "一般 (30-50%)", color: "bg-amber-500", bg: "bg-amber-50", text: "text-amber-700" },
    { key: "low", label: "滞销 (<30%)", color: "bg-red-500", bg: "bg-red-50", text: "text-red-700" },
  ];

  const total = distribution
    ? distribution.excellent + distribution.good + distribution.fair + distribution.low
    : 0;

  if (total === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        暂无目标产量数据，无法计算售罄率
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* 进度条堆叠 */}
      <div className="h-3 bg-slate-100 rounded-full overflow-hidden flex">
        {tiers.map((t) => {
          const count = distribution?.[t.key as keyof typeof distribution] || 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return <div key={t.key} className={`${t.color} transition-all`} style={{ width: `${pct}%` }} />;
        })}
      </div>
      {/* 详情列表 */}
      <div className="space-y-2 pt-1">
        {tiers.map((t) => {
          const count = distribution?.[t.key as keyof typeof distribution] || 0;
          const pct = total > 0 ? ((count / total) * 100).toFixed(0) : "0";
          return (
            <div key={t.key} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${t.color}`} />
                <span className="text-xs text-slate-600">{t.label}</span>
              </div>
              <span className="text-xs font-semibold text-slate-700">
                {count} 款 <span className="text-slate-400 font-normal">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DeadStockList({ styles }: { styles: any[] }) {
  if (!styles || styles.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        暂无滞销款，所有在售款式均有销售
      </div>
    );
  }

  return (
    <div className="max-h-64 overflow-y-auto">
      <div className="space-y-2">
        {styles.slice(0, 8).map((style) => (
          <Link
            key={style.styleId}
            href={`/styles/${style.styleId}`}
            className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors group"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-800 truncate">{style.name}</p>
                <Badge variant="outline" className="text-[10px] border-red-200 text-red-600 bg-red-50">
                  {style.sellthroughRate}%
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {style.styleNo} · {style.category} · 目标 {style.targetQuantity} / 在售 {style.soldQuantity}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  );
}
