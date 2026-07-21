// 款式销售 Tab - 销售数据录入 + 销售统计
// 款式维度的销售明细，与 /analytics 联动

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart,
  Plus,
  Loader2,
  TrendingUp,
  Package,
  DollarSign,
  Calendar,
  Trash2,
  X,
  Hash,
  ChevronRight,
} from "lucide-react";

const CHANNELS = [
  { value: "线上", label: "线上", color: "bg-blue-50 text-blue-700" },
  { value: "线下直营", label: "线下直营", color: "bg-green-50 text-green-700" },
  { value: "经销", label: "经销", color: "bg-amber-50 text-amber-700" },
  { value: "批发", label: "批发", color: "bg-purple-50 text-purple-700" },
  { value: "电商平台", label: "电商平台", color: "bg-pink-50 text-pink-700" },
  { value: "其他", label: "其他", color: "bg-slate-50 text-slate-700" },
];

export function StyleSalesTab({ styleId, styleName }: { styleId: string; styleName: string }) {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    saleDate: new Date().toISOString().split("T")[0],
    quantity: "",
    amount: "",
    channel: "线上",
    customerInfo: "",
  });

  useEffect(() => {
    fetchSales();
  }, [styleId]);

  const fetchSales = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/styles/${styleId}/sales`);
      if (res.ok) {
        const data = await res.json();
        setSales(data.sales || []);
      }
    } catch (err) {
      console.error("获取销售数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.quantity || !form.amount) {
      alert("请填写数量和金额");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId,
          saleDate: form.saleDate,
          quantity: Number(form.quantity),
          amount: Number(form.amount),
          channel: form.channel,
          customerInfo: form.customerInfo || null,
        }),
      });
      if (!res.ok) throw new Error("创建失败");
      setShowAdd(false);
      setForm({
        saleDate: new Date().toISOString().split("T")[0],
        quantity: "",
        amount: "",
        channel: "线上",
        customerInfo: "",
      });
      fetchSales();
    } catch (err: any) {
      alert(err.message || "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 统计
  const stats = {
    total: sales.length,
    quantity: sales.reduce((s, r) => s + (r.quantity || 0), 0),
    revenue: sales.reduce((s, r) => s + (r.amount || 0), 0),
    avgPrice: sales.length > 0 ? sales.reduce((s, r) => s + (r.amount || 0), 0) / sales.reduce((s, r) => s + (r.quantity || 0), 0) : 0,
  };

  // 按渠道分组
  const channelStats: Record<string, { quantity: number; revenue: number; orders: number }> = {};
  for (const s of sales) {
    const ch = s.channel || "其他";
    if (!channelStats[ch]) channelStats[ch] = { quantity: 0, revenue: 0, orders: 0 };
    channelStats[ch].quantity += s.quantity || 0;
    channelStats[ch].revenue += s.amount || 0;
    channelStats[ch].orders += 1;
  }
  const channelList = Object.entries(channelStats).sort((a, b) => b[1].revenue - a[1].revenue);

  // 渠道颜色
  const channelColorMap: Record<string, string> = CHANNELS.reduce((m, c) => ({ ...m, [c.value]: c.color }), {});

  return (
    <div className="space-y-4">
      {/* 顶部统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">总订单数</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-amber-50">
                <Package className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.quantity}</p>
            <p className="text-xs text-slate-500 mt-0.5">总销量（件）</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-green-50">
                <DollarSign className="h-4 w-4 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats.revenue >= 10000 ? `¥${(stats.revenue / 10000).toFixed(2)}万` : `¥${stats.revenue}`}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">总销售额</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-purple-50">
                <TrendingUp className="h-4 w-4 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">
              {stats.avgPrice > 0 ? `¥${stats.avgPrice.toFixed(0)}` : "-"}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">平均件单价</p>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">销售明细</h3>
          <p className="text-xs text-slate-500 mt-0.5">款式「{styleName}」的销售记录</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          录入销售
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* 销售明细列表 */}
        <div className="lg:col-span-2">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-0">
              {loading ? (
                <div className="py-16 text-center text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  加载中...
                </div>
              ) : sales.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingCart className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500">暂无销售记录</p>
                  <p className="text-sm text-slate-400 mt-1">点击右上角录入第一笔销售</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {sales.map((s) => {
                    const ch = s.channel || "其他";
                    const colorClass = channelColorMap[ch] || channelColorMap["其他"];
                    return (
                      <div key={s.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                        <div className={`px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
                          {ch}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="font-medium text-slate-800 text-sm">
                              ¥{s.amount?.toLocaleString("zh-CN")}
                            </span>
                            <span className="text-xs text-slate-400">×</span>
                            <span className="text-sm text-slate-700">{s.quantity}件</span>
                            {s.customerInfo && (
                              <Badge variant="outline" className="text-[10px] h-4">
                                {s.customerInfo}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {s.saleDate}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-700">
                            ¥{s.quantity > 0 ? (s.amount / s.quantity).toFixed(0) : 0}
                          </p>
                          <p className="text-[10px] text-slate-400">件单价</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* 渠道分布 */}
        <div>
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">渠道分布</CardTitle>
              <CardDescription className="text-xs">各销售渠道的销售贡献</CardDescription>
            </CardHeader>
            <CardContent>
              {channelList.length === 0 ? (
                <p className="text-sm text-slate-400 py-8 text-center">暂无数据</p>
              ) : (
                <div className="space-y-3">
                  {channelList.map(([channel, stat]) => {
                    const pct = stats.revenue > 0 ? (stat.revenue / stats.revenue) * 100 : 0;
                    const colorClass = channelColorMap[channel] || channelColorMap["其他"];
                    return (
                      <div key={channel}>
                        <div className="flex items-center justify-between mb-1">
                          <span className={`px-2 py-0.5 rounded text-xs ${colorClass}`}>{channel}</span>
                          <span className="text-sm font-semibold text-slate-800">
                            {pct.toFixed(1)}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                          <div
                            className="h-full bg-gradient-to-r from-blue-400 to-indigo-400 rounded-full"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-500">
                          ¥{stat.revenue.toLocaleString("zh-CN")} · {stat.quantity}件 · {stat.orders}单
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 录入销售弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">录入销售记录</CardTitle>
                <CardDescription className="text-xs">{styleName}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">销售日期 *</Label>
                  <Input
                    type="date"
                    value={form.saleDate}
                    onChange={(e) => setForm({ ...form, saleDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">销售数量 *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="件"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">销售金额 *</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="元"
                />
              </div>
              <div>
                <Label className="text-xs">销售渠道</Label>
                <select
                  value={form.channel}
                  onChange={(e) => setForm({ ...form, channel: e.target.value })}
                  className="h-9 px-3 rounded-md border border-slate-200 text-sm w-full"
                >
                  {CHANNELS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">客户信息（可选）</Label>
                <Input
                  value={form.customerInfo}
                  onChange={(e) => setForm({ ...form, customerInfo: e.target.value })}
                  placeholder="如：客户名/订单号"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
                <Button onClick={handleAdd} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
