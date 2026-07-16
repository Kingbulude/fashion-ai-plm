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
  Package,
  Clock,
  Truck,
} from "lucide-react";

interface BomItem {
  id: string;
  materialName: string;
  specification: string;
}

interface ProcurementRecord {
  id: string;
  bomItemId: string;
  supplierId: string | null;
  status: string;
  orderDate: string | null;
  expectedDate: string | null;
  actualDate: string | null;
  quantity: number;
  unitPrice: number | null;
  bomItems?: { materialName: string; specification: string };
  suppliers?: { name: string };
}

interface ProcurementFormProps {
  styleId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "待下单", color: "text-slate-600", bg: "bg-slate-100", icon: <Clock className="h-3 w-3" /> },
  ordered: { label: "已下单", color: "text-blue-600", bg: "bg-blue-100", icon: <Package className="h-3 w-3" /> },
  partial_received: { label: "部分到货", color: "text-amber-600", bg: "bg-amber-100", icon: <Truck className="h-3 w-3" /> },
  fully_received: { label: "全部到货", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle className="h-3 w-3" /> },
};

export function ProcurementForm({ styleId }: ProcurementFormProps) {
  const [records, setRecords] = useState<ProcurementRecord[]>([]);
  const [bomItems, setBomItems] = useState<BomItem[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [fulfillment, setFulfillment] = useState<any[]>([]);
  const [allFulfilled, setAllFulfilled] = useState(false);
  const [missingItems, setMissingItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ProcurementRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    bomItemId: "",
    supplierId: "",
    status: "pending",
    orderDate: "",
    expectedDate: "",
    quantity: "",
    unitPrice: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [procRes, bomRes, supRes] = await Promise.all([
        fetch(`/api/styles/${styleId}/procurement`),
        fetch(`/api/styles/${styleId}/bom-items`),
        fetch("/api/suppliers"),
      ]);

      if (procRes.ok) {
        const data = await procRes.json();
        setRecords(data.procurement || []);
        setFulfillment(data.fulfillment || []);
        setAllFulfilled(data.allFulfilled || false);
        setMissingItems(data.missingItems || 0);
      }
      if (bomRes.ok) {
        setBomItems((await bomRes.json()).items || []);
      }
      if (supRes.ok) {
        setSuppliers((await supRes.json()) || []);
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
    setEditingRecord(null);
    setForm({ bomItemId: "", supplierId: "", status: "pending", orderDate: "", expectedDate: "", quantity: "", unitPrice: "" });
    setDialogOpen(true);
  };

  const openEdit = (record: ProcurementRecord) => {
    setEditingRecord(record);
    setForm({
      bomItemId: record.bomItemId,
      supplierId: record.supplierId || "",
      status: record.status,
      orderDate: record.orderDate || "",
      expectedDate: record.expectedDate || "",
      quantity: String(record.quantity),
      unitPrice: record.unitPrice ? String(record.unitPrice) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.bomItemId || !form.quantity) {
      showToast("error", "物料项和数量不能为空");
      return;
    }
    setSaving(true);
    try {
      const url = editingRecord
        ? `/api/styles/${styleId}/procurement/${editingRecord.id}`
        : `/api/styles/${styleId}/procurement`;
      const method = editingRecord ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bomItemId: form.bomItemId,
          supplierId: form.supplierId || null,
          status: form.status,
          orderDate: form.orderDate || null,
          expectedDate: form.expectedDate || null,
          quantity: Number(form.quantity),
          unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }

      showToast("success", editingRecord ? "采购记录更新成功" : "采购记录创建成功");
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
    if (!confirm("确定删除这条采购记录？")) return;
    try {
      const res = await fetch(`/api/styles/${styleId}/procurement/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      showToast("success", "已删除");
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除失败";
      showToast("error", msg);
    }
  };

  const supplierOptions = suppliers.filter((s) => s.type === "fabric_supplier" || s.type === "accessory_supplier");

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${allFulfilled ? "bg-green-100" : "bg-amber-100"}`}>
                {allFulfilled ? <CheckCircle className="h-5 w-5 text-green-600" /> : <AlertCircle className="h-5 w-5 text-amber-600" />}
              </div>
              <div>
                <p className="font-medium text-sm">{allFulfilled ? "物料齐套" : "物料未齐套"}</p>
                <p className="text-xs text-muted-foreground">{bomItems.length} 种物料，{missingItems} 种待到货</p>
              </div>
            </div>
            {missingItems > 0 && (
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                <AlertCircle className="h-3 w-3 mr-1" />
                缺料预警
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">共 {records.length} 条采购记录</div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          新增采购
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">暂无采购记录</p>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            创建采购单
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const status = STATUS_CONFIG[record.status] || STATUS_CONFIG.pending;
            const bom = bomItems.find((b) => b.id === record.bomItemId);
            const materialName = record.bomItems?.materialName || bom?.materialName || "未知物料";
            const supplier = supplierOptions.find((s) => s.id === record.supplierId);
            return (
              <Card key={record.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${status.bg} ${status.color} border-0`}>
                          <span className="mr-1">{status.icon}</span>
                          {status.label}
                        </Badge>
                        <span className="text-sm font-medium">{materialName}</span>
                        {supplier && <span className="text-xs text-muted-foreground">· {supplier.name}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {record.orderDate && <span>下单：{record.orderDate}</span>}
                        {record.expectedDate && <span>预计：{record.expectedDate}</span>}
                        {record.actualDate && <span>到货：{record.actualDate}</span>}
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-muted-foreground">数量：{record.quantity}</span>
                        {record.unitPrice && <span className="text-muted-foreground">单价：¥{record.unitPrice}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon-xs" onClick={() => openEdit(record)} className="text-slate-500">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(record.id)} className="text-red-500">
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
            <DialogTitle>{editingRecord ? "编辑采购记录" : "新增采购"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">物料项</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.bomItemId} onChange={(e) => setForm({ ...form, bomItemId: e.target.value })}>
                <option value="">请选择物料</option>
                {bomItems.map((b) => (
                  <option key={b.id} value={b.id}>{b.materialName} {b.specification ? `(${b.specification})` : ""}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">供应商</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
                <option value="">请选择供应商</option>
                {supplierOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
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
                <Input type="number" placeholder="采购数量" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">下单日期</Label>
                <Input type="date" value={form.orderDate} onChange={(e) => setForm({ ...form, orderDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">预计到货</Label>
                <Input type="date" value={form.expectedDate} onChange={(e) => setForm({ ...form, expectedDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">单价</Label>
                <Input type="number" placeholder="单价" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} />
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
