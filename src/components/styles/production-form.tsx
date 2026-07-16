"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Factory,
  Clock,
  Calendar,
} from "lucide-react";

interface ProductionOrder {
  id: string;
  factoryId: string | null;
  status: string;
  quantity: number;
  colorSizeRatio: any;
  materialReady: boolean;
  startDate: string | null;
  expectedEndDate: string | null;
  actualEndDate: string | null;
  suppliers?: { name: string };
}

interface ProductionFormProps {
  styleId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "待下单", color: "text-slate-600", bg: "bg-slate-100", icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: "生产中", color: "text-blue-600", bg: "bg-blue-100", icon: <Factory className="h-3 w-3" /> },
  partial_completed: { label: "部分完成", color: "text-amber-600", bg: "bg-amber-100", icon: <AlertCircle className="h-3 w-3" /> },
  completed: { label: "已完成", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle className="h-3 w-3" /> },
};

export function ProductionForm({ styleId }: ProductionFormProps) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [factories, setFactories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<ProductionOrder | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    factoryId: "",
    status: "pending",
    quantity: "",
    colorSizeRatio: "",
    materialReady: false,
    startDate: "",
    expectedEndDate: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [prodRes, supRes] = await Promise.all([
        fetch(`/api/styles/${styleId}/production`),
        fetch("/api/suppliers"),
      ]);

      if (prodRes.ok) {
        setOrders((await prodRes.json()) || []);
      }
      if (supRes.ok) {
        setFactories((await prodRes.json()).filter((s: any) => s.type === "factory") || []);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "获取失败";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }, [styleId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openAdd = () => {
    setEditingOrder(null);
    setForm({ factoryId: "", status: "pending", quantity: "", colorSizeRatio: "", materialReady: false, startDate: "", expectedEndDate: "" });
    setDialogOpen(true);
  };

  const openEdit = (order: ProductionOrder) => {
    setEditingOrder(order);
    setForm({
      factoryId: order.factoryId || "",
      status: order.status,
      quantity: String(order.quantity),
      colorSizeRatio: typeof order.colorSizeRatio === "string" ? order.colorSizeRatio : JSON.stringify(order.colorSizeRatio || {}),
      materialReady: order.materialReady,
      startDate: order.startDate || "",
      expectedEndDate: order.expectedEndDate || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.quantity) {
      showToast("error", "订单数量不能为空");
      return;
    }
    setSaving(true);
    try {
      const url = editingOrder
        ? `/api/styles/${styleId}/production/${editingOrder.id}`
        : `/api/styles/${styleId}/production`;
      const method = editingOrder ? "PUT" : "POST";

      const colorSizeRatio = form.colorSizeRatio
        ? (() => { try { return JSON.parse(form.colorSizeRatio); } catch { return null; } })()
        : null;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          factoryId: form.factoryId || null,
          status: form.status,
          quantity: Number(form.quantity),
          colorSizeRatio,
          materialReady: form.materialReady,
          startDate: form.startDate || null,
          expectedEndDate: form.expectedEndDate || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }

      showToast("success", editingOrder ? "生产订单更新成功" : "生产订单创建成功");
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这条生产订单？")) return;
    try {
      const res = await fetch(`/api/styles/${styleId}/production/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      showToast("success", "已删除");
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除失败";
      showToast("error", msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">共 {orders.length} 条生产订单</div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          新增订单
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Factory className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">暂无生产订单</p>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            创建生产订单
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const status = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
            const factory = factories.find((f: any) => f.id === order.factoryId);
            return (
              <Card key={order.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${status.bg} ${status.color} border-0`}>
                          <span className="mr-1">{status.icon}</span>
                          {status.label}
                        </Badge>
                        <span className="text-sm font-medium">数量：{order.quantity}</span>
                        {factory && <span className="text-xs text-muted-foreground">· {factory.name}</span>}
                        {order.materialReady && (
                          <Badge variant="secondary" className="bg-green-50 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            物料齐套
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {order.startDate && <span>开工：{order.startDate}</span>}
                        {order.expectedEndDate && <span>预计完成：{order.expectedEndDate}</span>}
                        {order.actualEndDate && <span>实际完成：{order.actualEndDate}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(order)} className="text-slate-500">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(order.id)} className="text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
            <DialogTitle>{editingOrder ? "编辑生产订单" : "新增生产订单"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">工厂</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })}>
                <option value="">请选择工厂</option>
                {factories.map((f: any) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">状态</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">数量</Label>
                <Input type="number" placeholder="生产数量" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">色码配比（JSON格式）</Label>
              <textarea className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" placeholder='{"黑色": {"S": 10, "M": 20}}' value={form.colorSizeRatio} onChange={(e) => setForm({ ...form, colorSizeRatio: e.target.value })} />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="materialReady" checked={form.materialReady} onChange={(e) => setForm({ ...form, materialReady: e.target.checked })} />
              <Label htmlFor="materialReady" className="text-xs">物料已齐套</Label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">开工日期</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">预计完成</Label>
                <Input type="date" value={form.expectedEndDate} onChange={(e) => setForm({ ...form, expectedEndDate: e.target.value })} />
              </div>
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
  );
}
