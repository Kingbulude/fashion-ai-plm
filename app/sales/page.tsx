"use client";

import { useState, useEffect, useMemo } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  BarChart3,
  PieChart,
  Award,
  Package,
  DollarSign,
  Search,
} from "lucide-react";

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

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [activeTab, setActiveTab] = useState("records");
  const [trendDays, setTrendDays] = useState(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  const [form, setForm] = useState({
    styleId: "",
    saleDate: new Date().toISOString().split("T")[0],
    quantity: "",
    amount: "",
    unitPrice: "",
    color: "",
    size: "",
    channel: "",
    customerInfo: "",
  });

  const channelOptions = ["天猫", "淘宝", "抖音", "拼多多", "微信小程序", "线下门店", "其他"];

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [salesRes, stylesRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/styles"),
      ]);
      const salesData = salesRes.ok ? await salesRes.json() : { sales: [] };
      const stylesData = stylesRes.ok ? await stylesRes.json() : [];
      if (!salesRes.ok && !stylesRes.ok) {
        setError("加载销售数据失败，请稍后重试");
      }
      setSales(salesData.sales || []);
      setStyles(Array.isArray(stylesData) ? stylesData : stylesData.data || []);
    } catch (err) {
      console.error("获取销售数据失败:", err);
      setError("网络异常，加载销售数据失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!form.styleId || !form.quantity || !form.amount) {
      showToast("error", "款式、数量和金额不能为空");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId: form.styleId,
          saleDate: form.saleDate,
          quantity: Number(form.quantity),
          amount: Number(form.amount),
          unitPrice: form.unitPrice ? Number(form.unitPrice) : undefined,
          color: form.color || null,
          size: form.size || null,
          channel: form.channel || null,
          customerInfo: form.customerInfo || null,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      showToast("success", "销售记录已添加");
      setDialogOpen(false);
      setForm({
        styleId: "",
        saleDate: new Date().toISOString().split("T")[0],
        quantity: "",
        amount: "",
        unitPrice: "",
        color: "",
        size: "",
        channel: "",
        customerInfo: "",
      });
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const styleMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const s of styles) map[s.id] = s;
    return map;
  }, [styles]);

  const filteredSales = useMemo(() => {
    let result = [...sales];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((s) => {
        const styleName = styleMap[s.styleId]?.name?.toLowerCase() || "";
        const styleNo = styleMap[s.styleId]?.styleNo?.toLowerCase() || "";
        return styleName.includes(q) || styleNo.includes(q) || (s.color && s.color.toLowerCase().includes(q)) || (s.channel && s.channel.toLowerCase().includes(q));
      });
    }
    if (channelFilter) {
      result = result.filter((s) => s.channel === channelFilter);
    }
    return result;
  }, [sales, searchQuery, channelFilter, styleMap]);

  const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
  const totalQuantity = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);
  const totalOrders = sales.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const avgSellingPrice = totalQuantity > 0 ? totalRevenue / totalQuantity : 0;

  const formatCurrency = (value: number) => {
    if (value >= 10000) {
      return `¥${(value / 10000).toFixed(2)}万`;
    }
    return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const trendData = useMemo(() => {
    const days = trendDays;
    const dailyMap: Record<string, { revenue: number; quantity: number; orders: number }> = {};
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i + 1);
      const key = d.toISOString().split("T")[0];
      dailyMap[key] = { revenue: 0, quantity: 0, orders: 0 };
    }
    for (const s of sales) {
      if (!s.saleDate) continue;
      const day = s.saleDate.split("T")[0];
      if (dailyMap[day]) {
        dailyMap[day].revenue += s.totalAmount || 0;
        dailyMap[day].quantity += s.quantity || 0;
        dailyMap[day].orders += 1;
      }
    }
    return Object.entries(dailyMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, v]) => ({ date, ...v }));
  }, [sales, trendDays]);

  const channelBreakdown = useMemo(() => {
    const channelMap: Record<string, { revenue: number; quantity: number; orders: number }> = {};
    for (const s of sales) {
      const ch = s.channel || "其他";
      if (!channelMap[ch]) channelMap[ch] = { revenue: 0, quantity: 0, orders: 0 };
      channelMap[ch].revenue += s.totalAmount || 0;
      channelMap[ch].quantity += s.quantity || 0;
      channelMap[ch].orders += 1;
    }
    return Object.entries(channelMap)
      .map(([channel, v]) => ({ channel, ...v }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [sales]);

  const styleRanking = useMemo(() => {
    const styleMapData: Record<string, { revenue: number; quantity: number; orders: number }> = {};
    for (const s of sales) {
      if (!styleMapData[s.styleId]) {
        styleMapData[s.styleId] = { revenue: 0, quantity: 0, orders: 0 };
      }
      styleMapData[s.styleId].revenue += s.totalAmount || 0;
      styleMapData[s.styleId].quantity += s.quantity || 0;
      styleMapData[s.styleId].orders += 1;
    }
    return Object.entries(styleMapData)
      .map(([id, v]) => ({
        styleId: id,
        styleNo: styleMap[id]?.styleNo || "",
        name: styleMap[id]?.name || "未知款式",
        category: styleMap[id]?.category || "未分类",
        ...v,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }, [sales, styleMap]);

  const colorAnalysis = useMemo(() => {
    const colorMap: Record<string, { revenue: number; quantity: number }> = {};
    for (const s of sales) {
      const color = s.color || "未注明";
      if (!colorMap[color]) colorMap[color] = { revenue: 0, quantity: 0 };
      colorMap[color].revenue += s.totalAmount || 0;
      colorMap[color].quantity += s.quantity || 0;
    }
    return Object.entries(colorMap)
      .map(([color, v]) => ({ color, ...v }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [sales]);

  const sizeAnalysis = useMemo(() => {
    const sizeMap: Record<string, { revenue: number; quantity: number }> = {};
    for (const s of sales) {
      const size = s.size || "均码";
      if (!sizeMap[size]) sizeMap[size] = { revenue: 0, quantity: 0 };
      sizeMap[size].revenue += s.totalAmount || 0;
      sizeMap[size].quantity += s.quantity || 0;
    }
    return Object.entries(sizeMap)
      .map(([size, v]) => ({ size, ...v }))
      .sort((a, b) => b.quantity - a.quantity);
  }, [sales]);

  const kpiCards = [
    { title: "总销售额", value: formatCurrency(totalRevenue), icon: DollarSign, color: "blue", desc: `${totalOrders} 笔订单` },
    { title: "总销量", value: `${totalQuantity} 件`, icon: ShoppingCart, color: "green", desc: `客单价 ${formatCurrency(avgOrderValue)}` },
    { title: "平均件单价", value: formatCurrency(avgSellingPrice), icon: TrendingUp, color: "amber", desc: `件数 ${totalQuantity} 件` },
    { title: "在售款式", value: `${styles.length} 款`, icon: Package, color: "purple", desc: `有销售 ${styleRanking.length} 款` },
  ];

  return (
    <SidebarLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">销售管理</h1>
            <p className="text-muted-foreground">销售数据录入、查询与分析</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              录入销售
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="records">销售记录</TabsTrigger>
            <TabsTrigger value="analysis">数据分析</TabsTrigger>
            <TabsTrigger value="styles">款式排行</TabsTrigger>
            <TabsTrigger value="inventory">色码分析</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {kpiCards.map((card, i) => {
                const colorMap: Record<string, { bg: string; text: string; light: string }> = {
                  blue: { bg: "bg-blue-50", text: "text-blue-600", light: "bg-blue-100" },
                  green: { bg: "bg-green-50", text: "text-green-600", light: "bg-green-100" },
                  amber: { bg: "bg-amber-50", text: "text-amber-600", light: "bg-amber-100" },
                  purple: { bg: "bg-purple-50", text: "text-purple-600", light: "bg-purple-100" },
                };
                const c = colorMap[card.color];
                return (
                  <Card key={i} className="border-0 shadow-sm">
                    <CardContent className="p-5">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-lg ${c.bg}`}>
                          <card.icon className={`h-5 w-5 ${c.text}`} />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{card.value}</p>
                          <p className="text-sm text-muted-foreground">{card.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{card.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索款式名称、款号、颜色、渠道..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">全部渠道</option>
                {channelOptions.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中...
              </div>
            ) : error ? (
              <Card className="border-destructive/30 bg-destructive/5">
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
            ) : filteredSales.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ShoppingCart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery || channelFilter ? "没有匹配的销售记录" : "暂无销售记录"}
                </p>
                {!searchQuery && !channelFilter && (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    录入第一笔销售
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredSales.map((sale) => (
                  <Card key={sale.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                          <ShoppingCart className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{styleMap[sale.styleId]?.name || "未知款式"}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(sale.saleDate).toLocaleDateString("zh-CN")}
                            {sale.channel && ` · ${sale.channel}`}
                            {(sale.color || sale.size) && ` · ${[sale.color, sale.size].filter(Boolean).join(" / ")}`}
                            {sale.orderNo && ` · ${sale.orderNo}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-600">+{formatCurrency(sale.totalAmount)}</p>
                        <p className="text-xs text-muted-foreground">{sale.quantity} 件 · 单价 {formatCurrency(sale.unitPrice || 0)}</p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-semibold">销售数据分析</h2>
              </div>
              <select
                value={trendDays}
                onChange={(e) => setTrendDays(parseInt(e.target.value))}
                className="h-9 px-3 rounded-md border border-slate-200 text-sm bg-white"
              >
                <option value="7">近 7 天</option>
                <option value="30">近 30 天</option>
                <option value="90">近 90 天</option>
              </select>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2 border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    销售趋势
                  </CardTitle>
                  <CardDescription className="text-xs">近 {trendDays} 天日销售趋势</CardDescription>
                </CardHeader>
                <CardContent>
                  <TrendChart trend={trendData} formatCurrency={formatCurrency} />
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <PieChart className="h-4 w-4 text-pink-500" />
                    渠道销售占比
                  </CardTitle>
                  <CardDescription className="text-xs">按销售额排名</CardDescription>
                </CardHeader>
                <CardContent>
                  {channelBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">暂无渠道数据</p>
                  ) : (
                    <div className="space-y-3">
                      {channelBreakdown.map((ch, i) => {
                        const total = totalRevenue || 1;
                        const pct = (ch.revenue / total) * 100;
                        const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                        return (
                          <div key={ch.channel}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-slate-700">{ch.channel}</span>
                              <span className="text-sm font-semibold text-slate-900">
                                {formatCurrency(ch.revenue)}
                                <span className="text-xs text-slate-500 ml-1">({pct.toFixed(1)}%)</span>
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{ch.quantity} 件 · {ch.orders} 单</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* 渠道效率对比 + 销售汇总 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* 渠道效率对比 */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    渠道效率对比
                  </CardTitle>
                  <CardDescription className="text-xs">客单价 · 件单价 · 转化效率</CardDescription>
                </CardHeader>
                <CardContent>
                  {channelBreakdown.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">暂无渠道数据</p>
                  ) : (
                    <div className="space-y-2.5">
                      {channelBreakdown.slice(0, 5).map((ch, i) => {
                        const avgOrder = ch.orders > 0 ? ch.revenue / ch.orders : 0;
                        const avgPrice = ch.quantity > 0 ? ch.revenue / ch.quantity : 0;
                        const maxAvgOrder = Math.max(...channelBreakdown.map((c) => (c.orders > 0 ? c.revenue / c.orders : 0)), 1);
                        const efficiencyPct = (avgOrder / maxAvgOrder) * 100;
                        return (
                          <div key={ch.channel} className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]}`}>
                                  {i + 1}
                                </div>
                                <span className="text-sm font-medium">{ch.channel}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">{ch.orders} 单</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                              <div>
                                <div className="text-muted-foreground">客单价</div>
                                <div className="font-semibold text-slate-900">{formatCurrency(avgOrder)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">件单价</div>
                                <div className="font-semibold text-slate-900">{formatCurrency(avgPrice)}</div>
                              </div>
                              <div>
                                <div className="text-muted-foreground">件/单</div>
                                <div className="font-semibold text-slate-900">{ch.quantity > 0 ? (ch.quantity / ch.orders).toFixed(1) : "0"}</div>
                              </div>
                            </div>
                            <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
                                style={{ width: `${efficiencyPct}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* 销售汇总 */}
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-emerald-500" />
                    销售汇总
                  </CardTitle>
                  <CardDescription className="text-xs">核心指标一览</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100">
                      <div className="text-xs text-blue-600 mb-1">总销售额</div>
                      <div className="text-lg font-bold text-blue-700">{formatCurrency(totalRevenue)}</div>
                      <div className="text-[10px] text-blue-500 mt-0.5">{totalOrders} 笔订单</div>
                    </div>
                    <div className="p-3 rounded-xl bg-green-50 border border-green-100">
                      <div className="text-xs text-green-600 mb-1">总销量</div>
                      <div className="text-lg font-bold text-green-700">{totalQuantity} 件</div>
                      <div className="text-[10px] text-green-500 mt-0.5">平均件单价 {formatCurrency(avgSellingPrice)}</div>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="text-xs text-amber-600 mb-1">客单价</div>
                      <div className="text-lg font-bold text-amber-700">{formatCurrency(avgOrderValue)}</div>
                      <div className="text-[10px] text-amber-500 mt-0.5">每单平均金额</div>
                    </div>
                    <div className="p-3 rounded-xl bg-purple-50 border border-purple-100">
                      <div className="text-xs text-purple-600 mb-1">渠道数</div>
                      <div className="text-lg font-bold text-purple-700">{channelBreakdown.length}</div>
                      <div className="text-[10px] text-purple-500 mt-0.5">活跃销售渠道</div>
                    </div>
                  </div>

                  {/* 最佳渠道 */}
                  {channelBreakdown.length > 0 && (
                    <div className="mt-3 p-3 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200">
                      <div className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-700">最佳渠道</span>
                      </div>
                      <div className="mt-1 flex items-baseline justify-between">
                        <span className="text-sm font-bold text-amber-800">{channelBreakdown[0].channel}</span>
                        <span className="text-xs text-amber-600">{formatCurrency(channelBreakdown[0].revenue)}</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="styles" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Award className="h-4 w-4 text-amber-500" />
                  款式销售排行（按销售额）
                </CardTitle>
                <CardDescription className="text-xs">共 {styleRanking.length} 款有销售记录</CardDescription>
              </CardHeader>
              <CardContent>
                {styleRanking.length === 0 ? (
                  <p className="text-sm text-slate-400 py-8 text-center">暂无销售数据</p>
                ) : (
                  <div className="space-y-2">
                    {styleRanking.map((item, i) => (
                      <div key={item.styleId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 transition-colors">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
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
                            {item.styleNo} · {item.category} · {item.orders} 单
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-900">{formatCurrency(item.revenue)}</p>
                          <p className="text-xs text-slate-500">{item.quantity} 件</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-pink-500" />
                    颜色销售分析
                  </CardTitle>
                  <CardDescription className="text-xs">按销量排名</CardDescription>
                </CardHeader>
                <CardContent>
                  {colorAnalysis.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">暂无颜色数据</p>
                  ) : (
                    <div className="space-y-2.5">
                      {colorAnalysis.map((item, i) => {
                        const maxQty = Math.max(...colorAnalysis.map((c) => c.quantity), 1);
                        const pct = (item.quantity / maxQty) * 100;
                        return (
                          <div key={item.color}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-slate-700">{item.color}</span>
                              <span className="text-sm font-semibold text-slate-900">
                                {item.quantity} 件
                                <span className="text-xs text-slate-500 ml-1">({formatCurrency(item.revenue)})</span>
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${CATEGORY_COLORS[i % CATEGORY_COLORS.length]} rounded-full`}
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
                    <BarChart3 className="h-4 w-4 text-blue-500" />
                    尺码销售分析
                  </CardTitle>
                  <CardDescription className="text-xs">按销量排名</CardDescription>
                </CardHeader>
                <CardContent>
                  {sizeAnalysis.length === 0 ? (
                    <p className="text-sm text-slate-400 py-6 text-center">暂无尺码数据</p>
                  ) : (
                    <div className="space-y-2.5">
                      {sizeAnalysis.map((item, i) => {
                        const maxQty = Math.max(...sizeAnalysis.map((s) => s.quantity), 1);
                        const pct = (item.quantity / maxQty) * 100;
                        return (
                          <div key={item.size}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-slate-700">{item.size}</span>
                              <span className="text-sm font-semibold text-slate-900">
                                {item.quantity} 件
                                <span className="text-xs text-slate-500 ml-1">({formatCurrency(item.revenue)})</span>
                              </span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${CATEGORY_COLORS[(i + 2) % CATEGORY_COLORS.length]} rounded-full`}
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
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>录入销售记录</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">关联款式 *</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.styleId}
                  onChange={(e) => setForm({ ...form, styleId: e.target.value })}
                >
                  <option value="">请选择款式</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">销售日期 *</Label>
                  <Input
                    type="date"
                    value={form.saleDate}
                    onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">销售渠道</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={form.channel}
                    onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  >
                    <option value="">请选择</option>
                    {channelOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">数量 *</Label>
                  <Input
                    type="number"
                    placeholder="件数"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">单价</Label>
                  <Input
                    type="number"
                    placeholder="¥"
                    value={form.unitPrice}
                    onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">金额 *</Label>
                  <Input
                    type="number"
                    placeholder="¥"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">颜色</Label>
                  <Input
                    placeholder="如：黑色"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">尺码</Label>
                  <Input
                    placeholder="如：M"
                    value={form.size}
                    onChange={(e) => setForm({ ...form, size: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">客户信息</Label>
                <Input
                  placeholder="可选"
                  value={form.customerInfo}
                  onChange={(e) => setForm({ ...form, customerInfo: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                保存
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {toast && (
          <div className="fixed top-6 right-6 z-50 max-w-sm">
            <div className={`px-4 py-3 rounded-lg shadow-lg border flex items-start gap-3 bg-white ${toast.type === "success" ? "border-green-200" : "border-red-200"}`}>
              {toast.type === "success" ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />}
              <div className="flex-1">
                <p className="text-sm font-medium">{toast.type === "success" ? "操作成功" : "操作失败"}</p>
                <p className="text-xs text-muted-foreground">{toast.message}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

function TrendChart({ trend, formatCurrency }: { trend: any[]; formatCurrency: (v: number) => string }) {
  if (!trend || trend.length === 0 || trend.every((d) => d.revenue === 0)) {
    return (
      <div className="h-64 bg-slate-50 rounded-lg flex items-center justify-center text-sm text-slate-400">
        暂无销售数据
      </div>
    );
  }

  const maxRevenue = Math.max(...trend.map((d) => d.revenue), 1);
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
