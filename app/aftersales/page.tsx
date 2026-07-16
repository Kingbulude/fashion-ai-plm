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
  RotateCcw,
  RefreshCw,
  MessageSquareWarning,
  ShieldAlert,
} from "lucide-react";

export default function AftersalesPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    styleId: "",
    type: "return",
    reason: "",
    amount: "",
    resolution: "",
    customerInfo: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recordsRes, stylesRes] = await Promise.all([
        fetch("/api/aftersales"),
        fetch("/api/styles"),
      ]);
      const recordsData = await recordsRes.json();
      const stylesData = await stylesRes.json();
      setRecords(recordsData.records || []);
      setStyles(stylesData || []);
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
    if (!form.styleId || !form.reason) {
      showToast("error", "款式和原因不能为空");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/aftersales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId: form.styleId,
          type: form.type,
          reason: form.reason,
          amount: form.amount ? Number(form.amount) : null,
          resolution: form.resolution || null,
          customerInfo: form.customerInfo || null,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      showToast("success", "售后记录已添加");
      setDialogOpen(false);
      setForm({ styleId: "", type: "return", reason: "", amount: "", resolution: "", customerInfo: "" });
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const summary = {
    total: records.length,
    returns: records.filter((r) => r.type === "return").length,
    exchanges: records.filter((r) => r.type === "exchange").length,
    complaints: records.filter((r) => r.type === "complaint").length,
  };

  const typeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    return: { label: "退货", icon: RotateCcw, color: "text-red-600", bg: "bg-red-50" },
    exchange: { label: "换货", icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
    complaint: { label: "投诉", icon: MessageSquareWarning, color: "text-orange-600", bg: "bg-orange-50" },
  };

  const formatCurrency = (value: number) =>
    value ? `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">售后记录</h1>
            <p className="text-muted-foreground">退货、换货、投诉管理与复盘</p>
          </div>
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            录入售后
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">总记录</p>
              <p className="text-xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-red-500 mb-1">退货</p>
              <p className="text-xl font-bold">{summary.returns}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-blue-500 mb-1">换货</p>
              <p className="text-xl font-bold">{summary.exchanges}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-orange-500 mb-1">投诉</p>
              <p className="text-xl font-bold">{summary.complaints}</p>
            </CardContent>
          </Card>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : records.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <ShieldAlert className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">暂无售后记录</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              录入第一条售后
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => {
              const config = typeConfig[record.type] || typeConfig.complaint;
              const Icon = config.icon;
              return (
                <Card key={record.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full ${config.bg} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${config.color}`}>{config.label}</Badge>
                          <p className="font-medium">{record.styles?.name || "未知款式"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{record.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.amount > 0 && <p className="font-semibold text-red-500">-{formatCurrency(record.amount)}</p>}
                      <p className="text-xs text-muted-foreground">{record.resolution || "待处理"}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>录入售后记录</DialogTitle>
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
                  <Label className="text-xs">类型 *</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="return">退货</option>
                    <option value="exchange">换货</option>
                    <option value="complaint">投诉</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">金额</Label>
                  <Input type="number" placeholder="¥" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">原因 *</Label>
                <Input placeholder="如：尺码不合适、质量问题" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">处理方案</Label>
                <Input placeholder="如：已退款、已换货" value={form.resolution} onChange={(e) => setForm({ ...form, resolution: e.target.value })} />
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
