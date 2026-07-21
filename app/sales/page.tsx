"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  ShoppingCart,
  TrendingUp,
  Calendar,
} from "lucide-react";

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    styleId: "",
    saleDate: new Date().toISOString().split("T")[0],
    quantity: "",
    amount: "",
    channel: "",
    customerInfo: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [salesRes, stylesRes] = await Promise.all([
        fetch("/api/sales"),
        fetch("/api/styles"),
      ]);
      const salesData = salesRes.ok ? await salesRes.json() : { sales: [] };
      const stylesData = stylesRes.ok ? await stylesRes.json() : [];
      setSales(salesData.sales || []);
      // 防御：确保 styles 始终是数组
      setStyles(Array.isArray(stylesData) ? stylesData : stylesData.data || []);
    } catch {
      showToast("error", "获取数据失败");
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

  const totalRevenue = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalQuantity = sales.reduce((sum, s) => sum + (s.quantity || 0), 0);

  const formatCurrency = (value: number) =>
    `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const channelOptions = ["天猫", "淘宝", "抖音", "拼多多", "微信小程序", "线下门店", "其他"];

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">销售记录</h1>
            <p className="text-muted-foreground">销售数据录入与查询</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            录入销售
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-50">
                <TrendingUp className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总销售额</p>
                <p className="text-xl font-bold">{formatCurrency(totalRevenue)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-50">
                <ShoppingCart className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">总销量</p>
                <p className="text-xl font-bold">{totalQuantity} 件</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-5 flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-50">
                <Calendar className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">记录数</p>
                <p className="text-xl font-bold">{sales.length} 笔</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : sales.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <ShoppingCart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">暂无销售记录</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              录入第一笔销售
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {sales.map((sale) => (
              <Card key={sale.id} className="border-0 shadow-sm">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-blue-50 flex items-center justify-center">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">{sale.styles?.name || "未知款式"}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(sale.saleDate).toLocaleDateString("zh-CN")}
                        {sale.channel && ` · ${sale.channel}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-green-600">+{formatCurrency(sale.amount)}</p>
                    <p className="text-xs text-muted-foreground">{sale.quantity} 件</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>录入销售记录</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">关联款式 *</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.styleId} onChange={(e) => setForm({ ...form, styleId: e.target.value })}>
                  <option value="">请选择款式</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">销售日期 *</Label>
                  <Input type="date" value={form.saleDate} onChange={(e) => setForm({ ...form, saleDate: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">销售渠道</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })}>
                    <option value="">请选择</option>
                    {channelOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">数量 *</Label>
                  <Input type="number" placeholder="件数" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">金额 *</Label>
                  <Input type="number" placeholder="¥" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">客户信息</Label>
                <Input placeholder="可选" value={form.customerInfo} onChange={(e) => setForm({ ...form, customerInfo: e.target.value })} />
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
