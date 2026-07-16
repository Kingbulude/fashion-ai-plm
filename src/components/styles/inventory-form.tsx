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
  Loader2,
  CheckCircle,
  AlertCircle,
  Package,
  TrendingUp,
} from "lucide-react";

interface InventoryFormProps {
  styleId: string;
}

export function InventoryForm({ styleId }: InventoryFormProps) {
  const [inventory, setInventory] = useState<any[]>([]);
  const [totalQuantity, setTotalQuantity] = useState(0);
  const [summary, setSummary] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    color: "",
    size: "",
    quantity: "",
    warehouse: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/styles/${styleId}/inventory`);
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setInventory(data.inventory || []);
      setTotalQuantity(data.totalQuantity || 0);
      setSummary(data.summary || []);
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
    setForm({ color: "", size: "", quantity: "", warehouse: "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.color || !form.size || !form.quantity) {
      showToast("error", "颜色、尺码和数量不能为空");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/styles/${styleId}/inventory`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          color: form.color,
          size: form.size,
          quantity: Number(form.quantity),
          warehouse: form.warehouse || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }

      showToast("success", "库存入库成功");
      setDialogOpen(false);
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const colorOptions = ["黑色", "白色", "灰色", "藏蓝", "酒红", "驼色", "米色", "绿色"];
  const sizeOptions = ["XS", "S", "M", "L", "XL", "XXL"];

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm bg-gradient-to-r from-green-50 to-emerald-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                <Package className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium text-sm">总库存</p>
                <p className="text-2xl font-bold text-green-600">{totalQuantity}</p>
              </div>
            </div>
            {totalQuantity > 0 && (
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <TrendingUp className="h-3 w-3 mr-1" />
                有库存
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">共 {inventory.length} 条库存记录</div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          入库
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      ) : inventory.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">暂无库存记录</p>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            首次入库
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {summary.map((item) => (
            <Card key={item.color} className="border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full" style={{ backgroundColor: item.color === "黑色" ? "#000" : item.color === "白色" ? "#fff" : item.color === "灰色" ? "#999" : item.color === "藏蓝" ? "#1a365d" : item.color === "酒红" ? "#722f37" : item.color === "驼色" ? "#c69c6d" : item.color === "米色" ? "#f5f5dc" : "#228b22" }} />
                    <span className="font-medium text-sm">{item.color}</span>
                  </div>
                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                    共 {item.total} 件
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.sizes.map((size: any) => (
                    <div key={size.size} className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-lg">
                      <span className="text-sm font-medium">{size.size}</span>
                      <span className="text-xs text-muted-foreground">{size.quantity}件</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>入库</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">颜色</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })}>
                  <option value="">请选择颜色</option>
                  {colorOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">尺码</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.size} onChange={(e) => setForm({ ...form, size: e.target.value })}>
                  <option value="">请选择尺码</option>
                  {sizeOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">数量</Label>
                <Input type="number" placeholder="入库数量" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">仓库</Label>
                <Input placeholder="仓库名称" value={form.warehouse} onChange={(e) => setForm({ ...form, warehouse: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              入库
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
