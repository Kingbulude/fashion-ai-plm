"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Package,
  Shirt,
  Sparkles,
  AlertCircle,
} from "lucide-react";

interface BomItem {
  id: string;
  materialName: string;
  materialType: "fabric" | "accessory" | "packaging";
  specification: string | null;
  unitConsumption: number;
  lossRate: number;
  unitPrice: number | null;
  totalCost: number | null;
  aiSuggested: boolean;
}

interface BomSummary {
  totalCost: number;
  fabricCost: number;
  accessoryCost: number;
  packagingCost: number;
  itemCount: number;
}

interface BomItemFormProps {
  styleId: string;
  targetCost?: number | null;
  onCostUpdated?: () => void;
}

const MATERIAL_TYPES = [
  { value: "fabric", label: "面料", color: "bg-blue-50 text-blue-700" },
  { value: "accessory", label: "辅料", color: "bg-amber-50 text-amber-700" },
  { value: "packaging", label: "包装", color: "bg-green-50 text-green-700" },
];

function formatCurrency(n: number | null | undefined): string {
  if (n === null || n === undefined) return "-";
  return `¥${Number(n).toFixed(2)}`;
}

export function BomItemForm({ styleId, targetCost, onCostUpdated }: BomItemFormProps) {
  const [items, setItems] = useState<BomItem[]>([]);
  const [summary, setSummary] = useState<BomSummary>({
    totalCost: 0,
    fabricCost: 0,
    accessoryCost: 0,
    packagingCost: 0,
    itemCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BomItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // 表单状态
  const [form, setForm] = useState({
    materialName: "",
    materialType: "fabric" as "fabric" | "accessory" | "packaging",
    specification: "",
    unitConsumption: "",
    lossRate: "",
    unitPrice: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/styles/${styleId}/bom-items`);
      if (!res.ok) throw new Error("获取 BOM 失败");
      const data = await res.json();
      setItems(data.items || []);
      setSummary(data.summary || summary);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "获取 BOM 失败";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }, [styleId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const openAddDialog = () => {
    setEditingItem(null);
    setForm({
      materialName: "",
      materialType: "fabric",
      specification: "",
      unitConsumption: "",
      lossRate: "0",
      unitPrice: "",
    });
    setDialogOpen(true);
  };

  const openEditDialog = (item: BomItem) => {
    setEditingItem(item);
    setForm({
      materialName: item.materialName,
      materialType: item.materialType,
      specification: item.specification || "",
      unitConsumption: String(item.unitConsumption),
      lossRate: String(item.lossRate),
      unitPrice: item.unitPrice ? String(item.unitPrice) : "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.materialName || !form.unitConsumption) {
      showToast("error", "物料名称和单耗不能为空");
      return;
    }
    setSaving(true);
    try {
      const url = editingItem
        ? `/api/styles/${styleId}/bom-items/${editingItem.id}`
        : `/api/styles/${styleId}/bom-items`;
      const method = editingItem ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialName: form.materialName,
          materialType: form.materialType,
          specification: form.specification || null,
          unitConsumption: Number(form.unitConsumption),
          lossRate: Number(form.lossRate || 0),
          unitPrice: form.unitPrice ? Number(form.unitPrice) : null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }

      showToast("success", editingItem ? "物料更新成功" : "物料添加成功");
      setDialogOpen(false);
      fetchItems();
      onCostUpdated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (!confirm("确定要删除这个物料吗？")) return;
    try {
      const res = await fetch(`/api/styles/${styleId}/bom-items/${itemId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("删除失败");
      showToast("success", "物料已删除");
      fetchItems();
      onCostUpdated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除失败";
      showToast("error", msg);
    }
  };

  // 即时计算预览总成本
  const previewTotalCost = (() => {
    const uc = Number(form.unitConsumption) || 0;
    const lr = Number(form.lossRate) || 0;
    const up = Number(form.unitPrice) || 0;
    if (!up) return null;
    const total = uc * (1 + lr) * up;
    return Math.round(total * 100) / 100;
  })();

  const costDiff = targetCost ? summary.totalCost - Number(targetCost) : null;
  const isOverBudget = costDiff !== null && costDiff > 0;

  return (
    <div className="space-y-4">
      {/* 成本核算面板 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">总成本</p>
            </div>
            <p className="text-2xl font-bold text-blue-700">{formatCurrency(summary.totalCost)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Shirt className="h-4 w-4 text-indigo-600" />
              <p className="text-xs text-muted-foreground">面料</p>
            </div>
            <p className="text-xl font-bold text-indigo-700">{formatCurrency(summary.fabricCost)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-amber-600" />
              <p className="text-xs text-muted-foreground">辅料</p>
            </div>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(summary.accessoryCost)}</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Package className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">包装</p>
            </div>
            <p className="text-xl font-bold text-green-700">{formatCurrency(summary.packagingCost)}</p>
          </CardContent>
        </Card>
      </div>

      {/* 目标成本对比 */}
      {targetCost && (
        <div
          className={`p-3 rounded-lg border flex items-center justify-between ${
            isOverBudget
              ? "bg-red-50 border-red-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <div className="flex items-center gap-2">
            {isOverBudget ? (
              <AlertCircle className="h-4 w-4 text-red-500" />
            ) : (
              <CheckCircle className="h-4 w-4 text-green-500" />
            )}
            <span className="text-sm font-medium">
              {isOverBudget ? "超出目标成本" : "在目标成本范围内"}
            </span>
          </div>
          <div className="text-sm">
            <span className="text-muted-foreground">目标：{formatCurrency(Number(targetCost))}</span>
            <span className={`ml-3 font-bold ${isOverBudget ? "text-red-600" : "text-green-600"}`}>
              {costDiff! > 0 ? "+" : ""}
              {formatCurrency(costDiff)}
            </span>
          </div>
        </div>
      )}

      {/* 物料列表 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">BOM 物料清单</CardTitle>
              <CardDescription>共 {summary.itemCount} 项物料</CardDescription>
            </div>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              添加物料
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              加载中...
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm mb-4">暂无 BOM 物料</p>
              <Button size="sm" onClick={openAddDialog}>
                <Plus className="h-4 w-4 mr-2" />
                添加第一个物料
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left p-2 font-medium text-muted-foreground">物料名称</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">类型</th>
                    <th className="text-left p-2 font-medium text-muted-foreground">规格</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">单耗</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">损耗%</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">单价</th>
                    <th className="text-right p-2 font-medium text-muted-foreground">总成本</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => {
                    const typeConfig = MATERIAL_TYPES.find((t) => t.value === item.materialType);
                    return (
                      <tr key={item.id} className="border-b last:border-0 hover:bg-slate-50">
                        <td className="p-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{item.materialName}</span>
                            {item.aiSuggested && (
                              <Badge variant="secondary" className="bg-purple-50 text-purple-700 text-xs">
                                <Sparkles className="h-2.5 w-2.5 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="p-2">
                          <Badge variant="secondary" className={typeConfig?.color || ""}>
                            {typeConfig?.label || item.materialType}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">{item.specification || "-"}</td>
                        <td className="p-2 text-right">{item.unitConsumption}</td>
                        <td className="p-2 text-right">{item.lossRate ? `${(item.lossRate * 100).toFixed(0)}%` : "0%"}</td>
                        <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="p-2 text-right font-medium">{formatCurrency(item.totalCost)}</td>
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => openEditDialog(item)}
                              className="text-slate-500 hover:text-slate-700"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-500 hover:text-red-600"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="border-t-2 bg-slate-50">
                    <td colSpan={6} className="p-2 text-right font-medium">
                      合计
                    </td>
                    <td className="p-2 text-right font-bold text-blue-700">
                      {formatCurrency(summary.totalCost)}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 添加/编辑物料对话框 */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingItem ? "编辑物料" : "添加物料"}</DialogTitle>
            <DialogDescription>
              填写物料信息，系统会自动计算总成本
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">物料名称 *</Label>
              <Input
                placeholder="如：精梳棉面料"
                value={form.materialName}
                onChange={(e) => setForm({ ...form, materialName: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">物料类型 *</Label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
                  value={form.materialType}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      materialType: e.target.value as "fabric" | "accessory" | "packaging",
                    })
                  }
                >
                  {MATERIAL_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">规格</Label>
                <Input
                  placeholder="如：180g/m²"
                  value={form.specification}
                  onChange={(e) => setForm({ ...form, specification: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">单耗 *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="1.5"
                  value={form.unitConsumption}
                  onChange={(e) => setForm({ ...form, unitConsumption: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">损耗率</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.05"
                  value={form.lossRate}
                  onChange={(e) => setForm({ ...form, lossRate: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">5% 填 0.05</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">单价（元）</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="30"
                  value={form.unitPrice}
                  onChange={(e) => setForm({ ...form, unitPrice: e.target.value })}
                />
              </div>
            </div>

            {/* 即时成本预览 */}
            {previewTotalCost !== null && (
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">预计总成本</span>
                <span className="text-lg font-bold text-blue-700">
                  {formatCurrency(previewTotalCost)}
                </span>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {saving ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg border flex items-start gap-3 bg-white ${
              toast.type === "success" ? "border-green-200" : "border-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.type === "success" ? "操作成功" : "操作失败"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
