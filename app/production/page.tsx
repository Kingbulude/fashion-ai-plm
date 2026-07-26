// 生产管理 - 订单列表 + 进度看板 + 创建流程

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Plus,
  Factory,
  Clock,
  AlertTriangle,
  CheckCircle,
  Scissors,
  CircleDot,
  Package,
  Calendar,
  TrendingUp,
  Search,
  X,
  BarChart3,
  Shirt,
  List,
  LayoutGrid,
  RefreshCw,
  Info,
  ChevronRight,
  DollarSign,
  Layers,
  GanttChart,
  TrendingDown,
  ShieldCheck,
  Activity,
  Zap,
} from "lucide-react";
import { useTenant } from "@/lib/auth/tenant-context";
import { AIAssistantPanel } from "@/components/ai/ai-assistant-panel";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "待排产", color: "text-slate-600", bg: "bg-slate-100", icon: Clock },
  cutting: { label: "裁剪中", color: "text-navy-700", bg: "bg-navy-100", icon: Scissors },
  sewing: { label: "缝制中", color: "text-terracotta-600", bg: "bg-terracotta-100", icon: CircleDot },
  finishing: { label: "后整中", color: "text-purple-700", bg: "bg-purple-100", icon: Package },
  completed: { label: "已完成", color: "text-success", bg: "bg-emerald-50", icon: CheckCircle },
};

const STATUS_ORDER = ["pending", "cutting", "sewing", "finishing", "completed"];

const KPI_COLORS: Record<string, { bg: string; text: string; gradient: string }> = {
  navy: { bg: "bg-navy-100", text: "text-navy-700", gradient: "from-navy-700 to-navy-900" },
  terracotta: { bg: "bg-terracotta-100", text: "text-terracotta-600", gradient: "from-terracotta-400 to-terracotta-600" },
  slate: { bg: "bg-slate-100", text: "text-slate-600", gradient: "from-slate-500 to-slate-700" },
  success: { bg: "bg-emerald-50", text: "text-success", gradient: "from-success to-emerald-600" },
  destructive: { bg: "bg-red-50", text: "text-destructive", gradient: "from-destructive to-red-600" },
};

export default function ProductionPage() {
  const { currentBrand } = useTenant();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [view, setView] = useState<"list" | "kanban" | "gantt">("list");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    styleId: "",
    quantity: "",
    factoryName: "",
    startDate: "",
    expectedDate: "",
    totalCost: "",
  });
  const [styles, setStyles] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [materialAlerts, setMaterialAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [detailOrder, setDetailOrder] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  useEffect(() => {
    fetchData();
    fetchStyles();
    fetchMaterialAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.id]);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/production");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setError("加载生产数据失败，请稍后重试");
        setData({ orders: [], summary: {}, factoryStats: [] });
      }
    } catch (err) {
      console.error(err);
      setError("网络异常，加载生产数据失败");
      setData({ orders: [], summary: {}, factoryStats: [] });
    } finally {
      setLoading(false);
    }
  };

  const fetchStyles = async () => {
    try {
      const res = await fetch("/api/styles");
      if (res.ok) {
        const data = await res.json();
        setStyles(data.styles || data || []);
      }
    } catch (err) {
      console.error("获取款式列表失败:", err);
    }
  };

  const fetchMaterialAlerts = async () => {
    setAlertsLoading(true);
    try {
      const res = await fetch("/api/production/material-alerts");
      if (res.ok) {
        const data = await res.json();
        setMaterialAlerts(data.alerts || []);
      }
    } catch (err) {
      console.error("获取物料预警失败:", err);
    } finally {
      setAlertsLoading(false);
    }
  };

  const createMaterialAlert = async (styleId: string) => {
    try {
      const res = await fetch(`/api/styles/${styleId}/material-alerts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "check_and_alert" }),
      });
      if (res.ok) {
        const data = await res.json();
        alert(data.message || "操作成功");
        fetchMaterialAlerts();
      }
    } catch (err) {
      console.error("创建预警失败:", err);
    }
  };

  const handleCreate = async () => {
    if (!form.styleId || !form.quantity) {
      alert("请选择款式并输入数量");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/styles/${form.styleId}/production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: Number(form.quantity),
          factoryName: form.factoryName || null,
          startDate: form.startDate || null,
          expectedDate: form.expectedDate || null,
          totalCost: form.totalCost ? Number(form.totalCost) : null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "创建失败");
        return;
      }
      setShowAdd(false);
      setForm({ styleId: "", quantity: "", factoryName: "", startDate: "", expectedDate: "", totalCost: "" });
      fetchData();
    } catch (err: any) {
      alert(err.message || "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewDetail = (order: any) => {
    setDetailOrder(order);
    setDetailOpen(true);
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/production/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        fetchData();
        if (detailOrder?.id === orderId) {
          setDetailOrder({ ...detailOrder, status: newStatus });
        }
      }
    } catch (err) {
      console.error("更新状态失败:", err);
    }
  };

  const filtered = (data?.orders || []).filter((o: any) => {
    if (statusFilter && o.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (
        !(o.styleName || "").toLowerCase().includes(q) &&
        !(o.styleNo || "").toLowerCase().includes(q) &&
        !(o.factoryName || "").toLowerCase().includes(q)
      )
        return false;
    }
    return true;
  });

  const summary = data?.summary || {};
  const factoryStats = data?.factoryStats || [];

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1800px] mx-auto">
        {/* 顶部 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center shadow-premium">
                <Factory className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">生产管理</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">跟踪所有款式的生产订单进度与加工厂协同</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-border bg-card p-0.5 shadow-sm">
              <button
                onClick={() => setView("list")}
                className={`px-3 h-8 text-xs font-medium flex items-center gap-1 rounded-lg transition-all ${
                  view === "list" ? "bg-navy-700 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                列表
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`px-3 h-8 text-xs font-medium flex items-center gap-1 rounded-lg transition-all ${
                  view === "kanban" ? "bg-navy-700 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                看板
              </button>
              <button
                onClick={() => setView("gantt")}
                className={`px-3 h-8 text-xs font-medium flex items-center gap-1 rounded-lg transition-all ${
                  view === "gantt" ? "bg-navy-700 text-white shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GanttChart className="h-3.5 w-3.5" />
                甘特图
              </button>
            </div>
            <Button onClick={() => setShowAdd(true)} className="bg-navy-700 hover:bg-navy-800 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              创建生产订单
            </Button>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 min-w-0">

        {/* 4 大 KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <KpiCard
            title="生产订单"
            value={summary.total || 0}
            sub={`${summary.totalQuantity || 0} 件`}
            icon={Factory}
            color="navy"
          />
          <KpiCard
            title="进行中"
            value={summary.inProgress || 0}
            sub="裁剪/缝制/后整"
            icon={TrendingUp}
            color="terracotta"
          />
          <KpiCard
            title="本月产量"
            value={summary.thisMonthQuantity || 0}
            sub="件/本月"
            icon={Package}
            color="green"
          />
          <KpiCard
            title="逾期订单"
            value={summary.overdue || 0}
            sub={summary.overdue > 0 ? "需关注" : "全部按期"}
            icon={AlertTriangle}
            color={summary.overdue > 0 ? "destructive" : "success"}
          />
        </div>

        {/* 生产趋势 + 效率分析 */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* 生产趋势图 */}
          <Card className="card-premium lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                <Activity className="h-4 w-4 text-navy-700" />
                生产趋势
                <Badge variant="secondary" className="ml-1 bg-navy-100 text-navy-700 hover:bg-navy-100">
                  近14天
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[220px] flex items-end gap-1.5 px-2">
                {(data?.dailyTrend || []).map((d: any) => {
                  const maxVal = Math.max(...(data?.dailyTrend || []).map((x: any) => x.completed || 0), 1);
                  const h = ((d.completed || 0) / maxVal) * 100;
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                      <div className="text-[10px] font-medium text-navy-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        {d.completed || 0}
                      </div>
                      <div
                        className="w-full rounded-t-md bg-gradient-to-t from-navy-700 to-terracotta-400 transition-all min-h-[4px] hover:from-terracotta-500 hover:to-terracotta-400"
                        style={{ height: `${Math.max(h, 2)}%` }}
                      />
                      <div className="text-[10px] text-muted-foreground">{d.dateLabel}</div>
                    </div>
                  );
                })}
                {(data?.dailyTrend || []).length === 0 && (
                  <div className="w-full h-full flex items-center justify-center text-sm text-muted-foreground">
                    暂无生产数据
                  </div>
                )}
              </div>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-gradient-to-t from-navy-700 to-terracotta-400" />
                  <span>完成订单</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-sm bg-slate-300" />
                  <span>新开工</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 效率分析 */}
          <Card className="card-premium">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                <Zap className="h-4 w-4 text-amber-500" />
                生产效率
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 平均生产周期 */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-navy-50 to-navy-100/50 border border-navy-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-navy-700">平均生产周期</span>
                  <Clock className="h-3.5 w-3.5 text-navy-600" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-navy-800">{summary.avgProductionDays || 0}</span>
                  <span className="text-sm text-navy-600">天</span>
                </div>
              </div>

              {/* 按期交付率 */}
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-50 to-emerald-100/50 border border-green-200">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs text-green-700">按期交付率</span>
                  <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-green-800">{summary.onTimeDeliveryRate || 0}</span>
                  <span className="text-sm text-green-600">%</span>
                </div>
                <div className="h-1.5 bg-green-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-500"
                    style={{ width: `${summary.onTimeDeliveryRate || 0}%` }}
                  />
                </div>
              </div>

              {/* 其他指标 */}
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-muted-foreground mb-0.5">完成订单</div>
                  <div className="text-lg font-semibold text-foreground">{summary.completed || 0}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] text-muted-foreground mb-0.5">待排产</div>
                  <div className="text-lg font-semibold text-foreground">{summary.pending || 0}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 缺料预警看板 */}
        <Card className="card-premium mb-6 border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between section-title !before:hidden">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                缺料预警看板
                <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
                  {materialAlerts.length} 款缺料
                </Badge>
              </div>
              <Button variant="outline" size="xs" onClick={fetchMaterialAlerts} disabled={alertsLoading}>
                <RefreshCw className={`h-3 w-3 mr-1 ${alertsLoading ? "animate-spin" : ""}`} />
                刷新
              </Button>
            </CardTitle>
            <CardDescription>
              物料未齐套的款式列表，带生产中的款式优先显示
            </CardDescription>
          </CardHeader>
          <CardContent>
            {alertsLoading ? (
              <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中...
              </div>
            ) : materialAlerts.length === 0 ? (
              <div className="py-8 text-center">
                <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">所有款式物料齐套</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[320px] overflow-y-auto">
                {materialAlerts.map((alert: any) => (
                  <div
                    key={alert.styleId}
                    className={`p-3 rounded-xl border ${
                      alert.alertLevel === "urgent"
                        ? "border-red-200 bg-red-50/50"
                        : alert.alertLevel === "high"
                        ? "border-amber-200 bg-amber-50/50"
                        : "border-slate-200 bg-slate-50/50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-sm font-medium truncate">
                            {alert.styleNo || "款式"} {alert.styleName && `· ${alert.styleName}`}
                          </span>
                          {alert.hasActiveProduction && (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                              生产中
                            </Badge>
                          )}
                          <Badge
                            variant="outline"
                            className={`text-[10px] ${
                              alert.alertLevel === "urgent"
                                ? "bg-red-100 text-red-700 border-red-200"
                                : alert.alertLevel === "high"
                                ? "bg-amber-100 text-amber-700 border-amber-200"
                                : "bg-slate-100 text-slate-600 border-slate-200"
                            }`}
                          >
                            {alert.missingItems} 种缺料
                          </Badge>
                          {alert.delayedItems > 0 && (
                            <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200 text-[10px]">
                              {alert.delayedItems} 种延迟
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1">
                          缺料：{alert.missingMaterials.join("、")}
                          {alert.missingItems > alert.missingMaterials.length &&
                            ` 等 ${alert.missingItems} 种`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Link href={`/styles/${alert.styleId}?tab=procurement`}>
                          <Button variant="outline" size="xs">
                            查看
                          </Button>
                        </Link>
                        <Button
                          variant="outline"
                          size="xs"
                          className="text-amber-600 border-amber-200 hover:bg-amber-50"
                          onClick={() => createMaterialAlert(alert.styleId)}
                        >
                          预警
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* 质检统计 */}
        {data?.qcStats && data.qcStats.total > 0 && (
          <Card className="card-premium mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                质检统计
                <Badge variant="secondary" className="ml-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                  合格率 {data.qcStats.passRate?.toFixed(1) || 0}%
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-xs text-muted-foreground mb-1">质检总数</div>
                  <div className="text-xl font-bold text-foreground">{data.qcStats.total}</div>
                </div>
                <div className="p-3 rounded-xl bg-green-50 border border-green-200">
                  <div className="text-xs text-green-700 mb-1">合格</div>
                  <div className="text-xl font-bold text-green-700">{data.qcStats.passed}</div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="text-xs text-red-700 mb-1">不合格</div>
                  <div className="text-xl font-bold text-red-700">{data.qcStats.failed}</div>
                </div>
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200">
                  <div className="text-xs text-amber-700 mb-1">待检</div>
                  <div className="text-xl font-bold text-amber-700">{data.qcStats.pending}</div>
                </div>
              </div>

              {/* 合格率进度条 */}
              <div className="mb-4">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">一次合格率</span>
                  <span className="font-semibold text-emerald-700">{data.qcStats.passRate?.toFixed(1) || 0}%</span>
                </div>
                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                    style={{ width: `${data.qcStats.passRate || 0}%` }}
                  />
                </div>
              </div>

              {/* 质检类型分布 */}
              {data.qcStats.byType && Object.keys(data.qcStats.byType).length > 0 && (
                <div>
                  <div className="text-xs font-medium text-muted-foreground mb-2">质检类型分布</div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(data.qcStats.byType).map(([type, count]) => (
                      <Badge key={type} variant="outline" className="bg-slate-50">
                        {type}: {count as number}次
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* 工厂分布 */}
        {factoryStats.length > 0 && (
          <Card className="card-premium mb-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between section-title !before:hidden">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-navy-700" />
                  加工厂产能排名
                  <Badge variant="secondary" className="ml-1 bg-navy-100 text-navy-700 hover:bg-navy-100">
                    {factoryStats.length} 家
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {factoryStats.slice(0, 6).map((f: any, idx: number) => {
                  const totalCost = summary.totalCost || 1;
                  const pct = (f.cost / totalCost) * 100;
                  const onTimeRate = f.onTimeRate || 100;
                  const isTop = idx < 3;
                  return (
                    <div
                      key={f.name}
                      className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                        isTop
                          ? "border-navy-200 bg-gradient-to-r from-navy-50/50 to-transparent"
                          : "border-border bg-sand-50/30"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm ${
                              idx === 0
                                ? "bg-gradient-to-br from-amber-400 to-amber-600"
                                : idx === 1
                                  ? "bg-gradient-to-br from-slate-400 to-slate-600"
                                  : idx === 2
                                    ? "bg-gradient-to-br from-amber-600 to-amber-800"
                                    : "bg-slate-300"
                            }`}
                          >
                            {idx + 1}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">{f.name}</span>
                              {isTop && (
                                <Badge
                                  variant="outline"
                                  className="h-5 text-[10px] bg-amber-50 text-amber-700 border-amber-200"
                                >
                                  TOP {idx + 1}
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {f.orders} 单 · {f.quantity} 件
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-semibold text-foreground">
                            ¥{(f.cost / 10000).toFixed(1)}万
                          </div>
                          <div className="text-xs text-muted-foreground">
                            占比 {pct.toFixed(1)}%
                          </div>
                        </div>
                      </div>

                      {/* 成本占比进度条 */}
                      <div className="h-1.5 bg-sand-200 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-navy-700 to-terracotta-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>

                      {/* 准期率 + 完成数 */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-muted-foreground">
                              完成 <span className="font-medium text-foreground">{f.completed}</span> 单
                            </span>
                          </div>
                          {f.overdue > 0 && (
                            <div className="flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3 text-amber-600" />
                              <span className="text-amber-700">{f.overdue} 单逾期</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <ShieldCheck className="h-3 w-3 text-emerald-600" />
                          <span
                            className={`font-medium ${
                              onTimeRate >= 90
                                ? "text-emerald-700"
                                : onTimeRate >= 70
                                  ? "text-amber-700"
                                  : "text-red-700"
                            }`}
                          >
                            准期率 {onTimeRate.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 筛选条 */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索款式、工厂..."
              className="pl-10 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setStatusFilter(null)}
              className={`px-3 h-8 rounded-full text-xs font-medium border transition-all ${
                !statusFilter
                  ? "bg-navy-700 text-white border-navy-700"
                  : "bg-card text-muted-foreground border-border hover:border-navy-200"
              }`}
            >
              全部
            </button>
            {STATUS_ORDER.map((s) => {
              const config = STATUS_CONFIG[s];
              const isActive = statusFilter === s;
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(isActive ? null : s)}
                  className={`px-3 h-8 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
                    isActive
                      ? `${config.bg} ${config.color} border-current`
                      : "bg-card text-muted-foreground border-border hover:border-navy-200"
                  }`}
                >
                  <config.icon className="h-3 w-3" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 错误提示 */}
        {error && !loading && (
          <Card className="card-premium border-destructive/30 bg-destructive/5 mb-6">
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
        )}

        {/* 内容区 */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2 card-premium">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载生产数据...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="card-premium border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
                <Factory className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-2">
                {data?.orders?.length === 0 ? "暂无生产订单" : "没有匹配的生产订单"}
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                {data?.orders?.length === 0
                  ? "创建款式后即可在款式详情页生成生产订单"
                  : "尝试调整筛选条件"}
              </p>
              <Button onClick={() => setShowAdd(true)} className="bg-navy-700 hover:bg-navy-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                创建第一个生产订单
              </Button>
            </CardContent>
          </Card>
        ) : view === "list" ? (
          <ProductionList orders={filtered} onViewDetail={handleViewDetail} />
        ) : view === "kanban" ? (
          <ProductionKanban orders={filtered} onViewDetail={handleViewDetail} />
        ) : (
          <ProductionGantt orders={filtered} onViewDetail={handleViewDetail} />
        )}
          </div>

          <div className="w-80 flex-shrink-0 hidden xl:block">
            <AIAssistantPanel processNode="stocking" title="生产 AI 助手" />
          </div>
        </div>
      </div>

      {/* 创建订单弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto card-premium">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">创建生产订单</CardTitle>
                <CardDescription className="text-xs">为款式创建生产订单并指定加工厂</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">关联款式 *</Label>
                <select
                  value={form.styleId}
                  onChange={(e) => setForm({ ...form, styleId: e.target.value })}
                  className="h-9 w-full rounded-lg border border-border bg-card text-sm px-3 focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">请选择款式</option>
                  {styles.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.styleNo} - {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">生产数量 *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="件"
                  />
                </div>
                <div>
                  <Label className="text-xs">总成本</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.totalCost}
                    onChange={(e) => setForm({ ...form, totalCost: e.target.value })}
                    placeholder="元"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">加工厂</Label>
                <Input
                  value={form.factoryName}
                  onChange={(e) => setForm({ ...form, factoryName: e.target.value })}
                  placeholder="如：广州恒丰制衣厂"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">开始日期</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">预计完成</Label>
                  <Input
                    type="date"
                    value={form.expectedDate}
                    onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
                <Button onClick={handleCreate} disabled={submitting} className="bg-navy-700 hover:bg-navy-800 text-white">
                  {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  创建
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 订单详情弹窗 */}
      {detailOpen && detailOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDetailOpen(false)}>
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto card-premium" onClick={(e) => e.stopPropagation()}>
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">生产订单详情</CardTitle>
                <CardDescription className="text-xs">{detailOrder.styleNo} · {detailOrder.styleName}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setDetailOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* 基本信息 */}
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-navy-100 flex-shrink-0">
                    <Shirt className="h-4 w-4 text-navy-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">款式</p>
                    <p className="text-sm font-medium">{detailOrder.styleName}</p>
                    <p className="text-xs text-muted-foreground">{detailOrder.styleNo}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-purple-100 flex-shrink-0">
                    <Layers className="h-4 w-4 text-purple-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">状态</p>
                    <p className="text-sm font-medium">
                      {STATUS_CONFIG[detailOrder.status]?.label || detailOrder.status}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-amber-100 flex-shrink-0">
                    <Factory className="h-4 w-4 text-amber-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">加工厂</p>
                    <p className="text-sm font-medium">{detailOrder.factoryName || "未指定"}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-green-100 flex-shrink-0">
                    <Package className="h-4 w-4 text-green-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">生产数量</p>
                    <p className="text-sm font-medium">{detailOrder.quantity || 0} 件</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-terracotta-100 flex-shrink-0">
                    <DollarSign className="h-4 w-4 text-terracotta-600" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">总成本</p>
                    <p className="text-sm font-medium">
                      {detailOrder.totalCost ? `¥${detailOrder.totalCost.toLocaleString("zh-CN")}` : "未设置"}
                    </p>
                    {detailOrder.totalCost && detailOrder.quantity > 0 && (
                      <p className="text-xs text-muted-foreground">
                        单件 ¥{(detailOrder.totalCost / detailOrder.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-100 flex-shrink-0">
                    <Calendar className="h-4 w-4 text-blue-700" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">工期</p>
                    <p className="text-sm font-medium">
                      {detailOrder.startDate?.split("T")[0] || "-"} → {detailOrder.expectedDate?.split("T")[0] || "-"}
                    </p>
                    {detailOrder.startDate && detailOrder.expectedDate && (() => {
                      const start = new Date(detailOrder.startDate);
                      const end = new Date(detailOrder.expectedDate);
                      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
                      return <p className="text-xs text-muted-foreground">共 {days} 天</p>;
                    })()}
                  </div>
                </div>
              </div>

              {/* 进度节点时间线 */}
              <div>
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-navy-700" />
                  生产进度节点
                </p>
                <div className="relative">
                  <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-slate-200" />
                  <div className="space-y-3">
                    {STATUS_ORDER.map((s, idx) => {
                      const config = STATUS_CONFIG[s];
                      const currentIdx = STATUS_ORDER.indexOf(detailOrder.status);
                      const isCompleted = idx <= currentIdx;
                      const isCurrent = idx === currentIdx;
                      return (
                        <div key={s} className="flex items-center gap-3 relative">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 ${
                            isCompleted
                              ? isCurrent
                                ? "bg-navy-700 ring-4 ring-navy-100"
                                : "bg-success"
                              : "bg-slate-200"
                          }`}>
                            <config.icon className={`h-3 w-3 ${isCompleted ? "text-white" : "text-slate-400"}`} />
                          </div>
                          <div className="flex-1 flex items-center justify-between py-1">
                            <div>
                              <p className={`text-sm ${isCompleted ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                                {config.label}
                              </p>
                            </div>
                            {isCurrent && detailOrder.status !== "completed" && (
                              <Button
                                variant="ghost"
                                size="xs"
                                className="h-7 text-xs"
                                onClick={() => {
                                  const nextIdx = idx + 1;
                                  if (nextIdx < STATUS_ORDER.length) {
                                    handleUpdateStatus(detailOrder.id, STATUS_ORDER[nextIdx]);
                                  }
                                }}
                              >
                                推进到下一阶段
                                <ChevronRight className="h-3 w-3 ml-1" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* 逾期提醒 */}
              {detailOrder.expectedDate && detailOrder.status !== "completed" && new Date(detailOrder.expectedDate) < new Date() && (
                <div className="p-3 rounded-xl bg-red-50 border border-red-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-red-700">订单已逾期</p>
                      <p className="text-xs text-red-600 mt-0.5">
                        预计完成日期 {detailOrder.expectedDate.split("T")[0]}，请关注生产进度
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* 备注 */}
              {detailOrder.notes && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <p className="text-xs text-muted-foreground mb-1">备注</p>
                  <p className="text-sm text-slate-700">{detailOrder.notes}</p>
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setDetailOpen(false)}>
                  关闭
                </Button>
                <Link href={`/styles/${detailOrder.styleId}`} className="flex-1">
                  <Button className="w-full bg-navy-700 hover:bg-navy-800">
                    查看款式详情
                    <ChevronRight className="h-4 w-4 ml-1.5" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </SidebarLayout>
  );
}

// KPI 卡片
function KpiCard({ title, value, sub, icon: Icon, color }: { title: string; value: any; sub: string; icon: any; color: string }) {
  const c = KPI_COLORS[color] || KPI_COLORS.slate;
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

// 列表视图
function ProductionList({ orders, onViewDetail }: { orders: any[]; onViewDetail: (o: any) => void }) {
  return (
    <Card className="card-premium overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-sand-50 text-xs text-muted-foreground uppercase">
                <th className="px-4 py-3 text-left font-medium">款式</th>
                <th className="px-4 py-3 text-left font-medium">状态</th>
                <th className="px-4 py-3 text-left font-medium">数量</th>
                <th className="px-4 py-3 text-left font-medium">加工厂</th>
                <th className="px-4 py-3 text-left font-medium">总成本</th>
                <th className="px-4 py-3 text-left font-medium">预计完成</th>
                <th className="px-4 py-3 text-left font-medium">进度</th>
                <th className="px-4 py-3 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => {
                const status = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                const progressPct = (STATUS_ORDER.indexOf(o.status) + 1) / STATUS_ORDER.length * 100;
                const isOverdue =
                  o.expectedDate && o.status !== "completed" && new Date(o.expectedDate) < new Date();
                return (
                  <tr key={o.id} className="border-t border-border hover:bg-sand-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/styles/${o.styleId}`} className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-sand-200 to-sand-100 flex items-center justify-center">
                          <Shirt className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="font-medium text-sm text-foreground group-hover:text-navy-700 transition-colors">
                            {o.styleName}
                          </p>
                          <p className="text-xs text-muted-foreground">{o.styleNo}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className={`${status.bg} ${status.color} border-0 gap-1`}>
                        <status.icon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 font-medium">{o.quantity}件</td>
                    <td className="px-4 py-3 text-foreground">
                      {o.factoryName || <span className="text-muted-foreground">未指定</span>}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {o.totalCost ? `¥${o.totalCost.toLocaleString("zh-CN")}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={isOverdue ? "text-destructive font-medium" : "text-foreground"}>
                        {o.expectedDate?.split("T")[0] || "-"}
                        {isOverdue && (
                          <AlertTriangle className="h-3 w-3 inline ml-1" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-sand-200 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              o.status === "completed"
                                ? "bg-success"
                                : "bg-gradient-to-r from-navy-700 to-terracotta-400"
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground w-9 text-right">
                          {progressPct.toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="ghost" size="xs" onClick={() => onViewDetail(o)}>
                        <Info className="h-3.5 w-3.5 mr-1" />
                        详情
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

// 甘特图视图
function ProductionGantt({ orders, onViewDetail }: { orders: any[]; onViewDetail: (o: any) => void }) {
  const validOrders = orders.filter((o) => o.startDate && o.expectedDate);

  if (validOrders.length === 0) {
    return (
      <Card className="card-premium border-dashed">
        <CardContent className="py-16 text-center">
          <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
            <GanttChart className="h-8 w-8 text-muted-foreground" />
          </div>
          <p className="text-foreground font-medium mb-2">暂无甘特图数据</p>
          <p className="text-sm text-muted-foreground">
            为生产订单设置开始日期和预计完成日期后即可查看甘特图
          </p>
        </CardContent>
      </Card>
    );
  }

  const sortedOrders = [...validOrders].sort(
    (a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );

  const allDates = sortedOrders.flatMap((o) => [new Date(o.startDate), new Date(o.expectedDate)]);
  const minDate = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const maxDate = new Date(Math.max(...allDates.map((d) => d.getTime())));
  const totalDays = Math.ceil(
    (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  const getBarPosition = (order: any) => {
    const start = new Date(order.startDate);
    const end = new Date(order.expectedDate);
    const offset = Math.floor(
      (start.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    const duration = Math.max(
      1,
      Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    );
    const leftPct = (offset / totalDays) * 100;
    const widthPct = (duration / totalDays) * 100;
    return { left: `${leftPct}%`, width: `${widthPct}%` };
  };

  const isOverdue = (order: any) => {
    if (order.status === "completed") return false;
    return new Date(order.expectedDate) < new Date();
  };

  const todayOffset = () => {
    const today = new Date();
    if (today < minDate) return 0;
    if (today > maxDate) return 100;
    return (
      ((today.getTime() - minDate.getTime()) / (maxDate.getTime() - minDate.getTime())) *
      100
    );
  };

  return (
    <Card className="card-premium overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* 时间轴头部 */}
            <div className="flex border-b border-border">
              <div className="w-48 flex-shrink-0 p-3 bg-sand-50 border-r border-border">
                <p className="text-xs font-medium text-muted-foreground">款式</p>
              </div>
              <div className="flex-1 relative h-12 bg-sand-50">
                <div className="absolute inset-0 flex">
                  {Array.from({ length: Math.min(totalDays, 31) }).map((_, i) => {
                    const date = new Date(minDate);
                    date.setDate(date.getDate() + Math.floor((i * totalDays) / Math.min(totalDays, 31)));
                    const isMonthStart = date.getDate() === 1 || i === 0;
                    return (
                      <div
                        key={i}
                        className="flex-1 border-r border-sand-200 last:border-r-0 flex items-end pb-1 px-1"
                      >
                        {isMonthStart && (
                          <span className="text-[10px] text-muted-foreground font-medium">
                            {date.getMonth() + 1}/{date.getDate()}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* 今天标记线 */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-red-400 z-10"
                  style={{ left: `${todayOffset()}%` }}
                >
                  <div className="absolute -top-0.5 -left-1.5 w-3 h-3 rounded-full bg-red-500" />
                </div>
              </div>
            </div>

            {/* 甘特图行 */}
            <div className="divide-y divide-border">
              {sortedOrders.map((order) => {
                const pos = getBarPosition(order);
                const overdue = isOverdue(order);
                const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                const barColor =
                  order.status === "completed"
                    ? "bg-gradient-to-r from-emerald-500 to-green-600"
                    : overdue
                    ? "bg-gradient-to-r from-red-400 to-red-600"
                    : "bg-gradient-to-r from-navy-600 to-terracotta-500";
                return (
                  <div
                    key={order.id}
                    className="flex hover:bg-sand-50/50 transition-colors cursor-pointer"
                    onClick={() => onViewDetail(order)}
                  >
                    <div className="w-48 flex-shrink-0 p-3 border-r border-border">
                      <p className="text-sm font-medium truncate">{order.styleName}</p>
                      <p className="text-xs text-muted-foreground truncate">{order.styleNo}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <status.icon className={`h-3 w-3 ${status.color}`} />
                        <span className={`text-xs ${status.color}`}>{status.label}</span>
                      </div>
                    </div>
                    <div className="flex-1 relative h-14">
                      <div
                        className={`absolute top-1/2 -translate-y-1/2 h-7 rounded-md ${barColor} shadow-sm flex items-center px-2 overflow-hidden cursor-pointer hover:shadow-md transition-shadow`}
                        style={{ left: pos.left, width: pos.width, minWidth: "60px" }}
                      >
                        <span className="text-xs text-white font-medium truncate">
                          {order.quantity}件
                        </span>
                      </div>
                      {overdue && (
                        <div
                          className="absolute top-1 right-1 text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-medium"
                          style={{ left: `calc(${pos.left} + ${pos.width} + 4px)` }}
                        >
                          逾期
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// 看板视图
function ProductionKanban({ orders, onViewDetail }: { orders: any[]; onViewDetail: (o: any) => void }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {STATUS_ORDER.map((s) => {
        const config = STATUS_CONFIG[s];
        const stageOrders = orders.filter((o) => o.status === s);
        return (
          <div key={s} className="bg-sand-50 rounded-xl p-3 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] h-5 bg-card">
                {stageOrders.length}
              </Badge>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {stageOrders.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">无</p>
              ) : (
                stageOrders.map((o: any) => (
                  <div
                    key={o.id}
                    onClick={() => onViewDetail(o)}
                    className="block p-3 bg-card rounded-xl border border-border hover:border-navy-200 hover:shadow-md transition-all cursor-pointer"
                  >
                    <p className="text-sm font-medium text-foreground truncate">{o.styleName}</p>
                    <p className="text-xs text-muted-foreground mb-2">{o.styleNo}</p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{o.quantity}件</span>
                      {o.factoryName && (
                        <span className="truncate ml-2 max-w-[80px]" title={o.factoryName}>
                          {o.factoryName}
                        </span>
                      )}
                    </div>
                    {o.expectedDate && (
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {o.expectedDate.split("T")[0]}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
