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
  DollarSign,
  Search,
  Filter,
  X,
  ChevronRight,
  BarChart3,
  Shirt,
  List,
  LayoutGrid,
} from "lucide-react";
import { useTenant } from "@/lib/auth/tenant-context";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  pending: { label: "待排产", color: "text-slate-600", bg: "bg-slate-100", icon: Clock },
  cutting: { label: "裁剪中", color: "text-blue-600", bg: "bg-blue-50", icon: Scissors },
  sewing: { label: "缝制中", color: "text-amber-600", bg: "bg-amber-50", icon: CircleDot },
  finishing: { label: "后整中", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
  completed: { label: "已完成", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
};

const STATUS_ORDER = ["pending", "cutting", "sewing", "finishing", "completed"];

export default function ProductionPage() {
  const { currentBrand } = useTenant();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("list");
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

  useEffect(() => {
    fetchData();
    fetchStyles();
  }, [currentBrand?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/production");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      } else {
        setData({ orders: [], summary: {}, factoryStats: [] });
      }
    } catch (err) {
      console.error(err);
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
        // 防御：确保 styles 始终是数组
        setStyles(Array.isArray(data) ? data : data.data || []);
      }
    } catch (err) {
      console.error("获取款式失败:", err);
      setStyles([]);
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
      <div className="p-6 lg:p-8 max-w-[1500px] mx-auto">
        {/* 顶部 */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">生产管理</h1>
            <p className="text-sm text-slate-500">跟踪所有款式的生产订单进度与加工厂协同</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-md border border-slate-200 overflow-hidden">
              <button
                onClick={() => setView("list")}
                className={`px-3 h-8 text-xs font-medium flex items-center gap-1 ${
                  view === "list" ? "bg-blue-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <List className="h-3.5 w-3.5" />
                列表
              </button>
              <button
                onClick={() => setView("kanban")}
                className={`px-3 h-8 text-xs font-medium flex items-center gap-1 ${
                  view === "kanban" ? "bg-blue-500 text-white" : "bg-white text-slate-600 hover:bg-slate-50"
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                看板
              </button>
            </div>
            <Button onClick={() => setShowAdd(true)}>
              <Plus className="h-4 w-4 mr-1.5" />
              创建生产订单
            </Button>
          </div>
        </div>

        {/* 4 大 KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <KpiCard
            title="生产订单"
            value={summary.total || 0}
            sub={`${summary.totalQuantity || 0} 件`}
            icon={Factory}
            color="blue"
          />
          <KpiCard
            title="进行中"
            value={summary.inProgress || 0}
            sub="裁剪/缝制/后整"
            icon={TrendingUp}
            color="amber"
          />
          <KpiCard
            title="待排产"
            value={summary.pending || 0}
            sub="需安排生产"
            icon={Clock}
            color="slate"
          />
          <KpiCard
            title="逾期订单"
            value={summary.overdue || 0}
            sub={summary.overdue > 0 ? "需关注" : "全部按期"}
            icon={AlertTriangle}
            color={summary.overdue > 0 ? "red" : "green"}
          />
        </div>

        {/* 工厂分布 */}
        {factoryStats.length > 0 && (
          <Card className="mb-6 border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                加工厂分布
                <Badge variant="secondary" className="ml-1">
                  {factoryStats.length} 家
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {factoryStats.slice(0, 6).map((f: any) => {
                  const totalCost = summary.totalCost || 1;
                  const pct = (f.cost / totalCost) * 100;
                  return (
                    <div key={f.name} className="p-3 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                            <Factory className="h-3.5 w-3.5 text-white" />
                          </div>
                          <span className="font-medium text-sm">{f.name}</span>
                        </div>
                        <span className="text-xs font-semibold text-slate-700">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-2">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-400 to-purple-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span>{f.orders} 单</span>
                        <span>{f.quantity} 件</span>
                        <span className="font-semibold text-slate-700">
                          ¥{(f.cost / 10000).toFixed(1)}万
                        </span>
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
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="搜索款式、工厂..."
              className="pl-10"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setStatusFilter(null)}
              className={`px-3 h-8 rounded-full text-xs font-medium border ${
                !statusFilter
                  ? "bg-blue-500 text-white border-blue-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
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
                  className={`px-3 h-8 rounded-full text-xs font-medium border flex items-center gap-1.5 ${
                    isActive
                      ? `${config.bg} ${config.color} border-current`
                      : "bg-white text-slate-600 border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <config.icon className="h-3 w-3" />
                  {config.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* 内容区 */}
        {loading ? (
          <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载生产数据...
          </div>
        ) : filtered.length === 0 ? (
          <Card className="border-dashed border-slate-200">
            <CardContent className="py-16 text-center">
              <Factory className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-500 mb-2">
                {data?.orders?.length === 0 ? "暂无生产订单" : "没有匹配的生产订单"}
              </p>
              <p className="text-sm text-slate-400 mb-4">
                {data?.orders?.length === 0
                  ? "创建款式后即可在款式详情页生成生产订单"
                  : "尝试调整筛选条件"}
              </p>
              <Button onClick={() => setShowAdd(true)}>
                <Plus className="h-4 w-4 mr-2" />
                创建第一个生产订单
              </Button>
            </CardContent>
          </Card>
        ) : view === "list" ? (
          <ProductionList orders={filtered} />
        ) : (
          <ProductionKanban orders={filtered} />
        )}
      </div>

      {/* 创建订单弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
                  className="h-9 w-full rounded-md border border-slate-200 text-sm px-3"
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
                <Button onClick={handleCreate} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  创建
                </Button>
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
  const colorMap: Record<string, { bg: string; text: string }> = {
    blue: { bg: "bg-blue-50", text: "text-blue-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-600" },
    slate: { bg: "bg-slate-50", text: "text-slate-600" },
    red: { bg: "bg-red-50", text: "text-red-600" },
    green: { bg: "bg-green-50", text: "text-green-600" },
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

// 列表视图
function ProductionList({ orders }: { orders: any[] }) {
  return (
    <Card className="border-0 shadow-sm overflow-hidden">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-xs text-slate-500 uppercase">
                <th className="px-4 py-3 text-left">款式</th>
                <th className="px-4 py-3 text-left">状态</th>
                <th className="px-4 py-3 text-left">数量</th>
                <th className="px-4 py-3 text-left">加工厂</th>
                <th className="px-4 py-3 text-left">总成本</th>
                <th className="px-4 py-3 text-left">预计完成</th>
                <th className="px-4 py-3 text-left">进度</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o: any) => {
                const status = STATUS_CONFIG[o.status] || STATUS_CONFIG.pending;
                const progressPct = (STATUS_ORDER.indexOf(o.status) + 1) / STATUS_ORDER.length * 100;
                const isOverdue =
                  o.expectedDate && o.status !== "completed" && new Date(o.expectedDate) < new Date();
                return (
                  <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link href={`/styles/${o.styleId}`} className="flex items-center gap-2 group">
                        <div className="w-8 h-8 rounded bg-gradient-to-br from-slate-200 to-slate-100 flex items-center justify-center">
                          <Shirt className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 text-sm group-hover:text-blue-600">
                            {o.styleName}
                          </p>
                          <p className="text-xs text-slate-500">{o.styleNo}</p>
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
                    <td className="px-4 py-3 text-slate-600">
                      {o.factoryName || <span className="text-slate-400">未指定</span>}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {o.totalCost ? `¥${o.totalCost.toLocaleString("zh-CN")}` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={isOverdue ? "text-red-600 font-medium" : "text-slate-600"}>
                        {o.expectedDate?.split("T")[0] || "-"}
                        {isOverdue && (
                          <AlertTriangle className="h-3 w-3 inline ml-1" />
                        )}
                      </span>
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              o.status === "completed"
                                ? "bg-green-500"
                                : "bg-gradient-to-r from-blue-400 to-indigo-500"
                            }`}
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-xs text-slate-500 w-9 text-right">
                          {progressPct.toFixed(0)}%
                        </span>
                      </div>
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

// 看板视图
function ProductionKanban({ orders }: { orders: any[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
      {STATUS_ORDER.map((s) => {
        const config = STATUS_CONFIG[s];
        const stageOrders = orders.filter((o) => o.status === s);
        return (
          <div key={s} className="bg-slate-50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5">
                <config.icon className={`h-3.5 w-3.5 ${config.color}`} />
                <span className={`text-sm font-semibold ${config.color}`}>{config.label}</span>
              </div>
              <Badge variant="secondary" className="text-[10px] h-4">
                {stageOrders.length}
              </Badge>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto">
              {stageOrders.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">无</p>
              ) : (
                stageOrders.map((o: any) => (
                  <Link
                    key={o.id}
                    href={`/styles/${o.styleId}`}
                    className="block p-2.5 bg-white rounded-md border border-slate-200 hover:border-slate-300 hover:shadow-sm transition-all"
                  >
                    <p className="text-sm font-medium text-slate-800 truncate">{o.styleName}</p>
                    <p className="text-xs text-slate-500 mb-2">{o.styleNo}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>{o.quantity}件</span>
                      {o.factoryName && (
                        <span className="truncate ml-2 max-w-[80px]" title={o.factoryName}>
                          {o.factoryName}
                        </span>
                      )}
                    </div>
                    {o.expectedDate && (
                      <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {o.expectedDate.split("T")[0]}
                      </p>
                    )}
                  </Link>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
