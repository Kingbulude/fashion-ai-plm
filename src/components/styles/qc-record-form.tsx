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
  XCircle,
  Shield,
} from "lucide-react";

interface QcRecord {
  id: string;
  type: string;
  result: string | null;
  defects: string[] | null;
  inspector: string | null;
  createdAt: string;
}

interface QcRecordFormProps {
  styleId: string;
}

const QC_TYPES: Record<string, { label: string; color: string; bg: string }> = {
  incoming: { label: "来料检", color: "text-blue-700", bg: "bg-blue-100" },
  sampling_review: { label: "样衣检", color: "text-indigo-700", bg: "bg-indigo-100" },
  in_process: { label: "过程检", color: "text-amber-700", bg: "bg-amber-100" },
  final: { label: "成品检", color: "text-green-700", bg: "bg-green-100" },
  warehouse_inspection: { label: "入库检", color: "text-purple-700", bg: "bg-purple-100" },
};

const RESULT_CONFIG: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  pass: { label: "合格", icon: <CheckCircle className="h-3.5 w-3.5" />, color: "text-green-600" },
  fail: { label: "不合格", icon: <XCircle className="h-3.5 w-3.5" />, color: "text-red-600" },
  concession: { label: "让步接收", icon: <AlertCircle className="h-3.5 w-3.5" />, color: "text-amber-600" },
};

export function QcRecordForm({ styleId }: QcRecordFormProps) {
  const [records, setRecords] = useState<QcRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<QcRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    type: "incoming",
    result: "pass",
    defects: "",
    inspector: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/styles/${styleId}/qc-records`);
      if (!res.ok) throw new Error("获取失败");
      const data = await res.json();
      setRecords(data || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "获取失败";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  }, [styleId]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const openAdd = () => {
    setEditingRecord(null);
    setForm({ type: "incoming", result: "pass", defects: "", inspector: "" });
    setDialogOpen(true);
  };

  const openEdit = (record: QcRecord) => {
    setEditingRecord(record);
    setForm({
      type: record.type,
      result: record.result || "pass",
      defects: record.defects?.join("、") || "",
      inspector: record.inspector || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const url = editingRecord
        ? `/api/styles/${styleId}/qc-records/${editingRecord.id}`
        : `/api/styles/${styleId}/qc-records`;
      const method = editingRecord ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: form.type,
          result: form.result,
          defects: form.defects ? form.defects.split("、").map((s) => s.trim()).filter(Boolean) : null,
          inspector: form.inspector || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }

      showToast("success", editingRecord ? "质检记录更新成功" : "质检记录创建成功");
      setDialogOpen(false);
      fetchRecords();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这条质检记录？")) return;
    try {
      const res = await fetch(`/api/styles/${styleId}/qc-records/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      showToast("success", "已删除");
      fetchRecords();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除失败";
      showToast("error", msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">共 {records.length} 条质检记录</div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          新增质检
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Shield className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">暂无质检记录</p>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            创建第一条质检
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const typeConfig = QC_TYPES[record.type] || QC_TYPES.incoming;
            const resultConfig = record.result ? RESULT_CONFIG[record.result] : null;
            return (
              <Card key={record.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${typeConfig.bg} ${typeConfig.color} border-0`}>{typeConfig.label}</Badge>
                        {resultConfig && (
                          <span className={`text-xs font-medium flex items-center gap-1 ${resultConfig.color}`}>
                            {resultConfig.icon}
                            {resultConfig.label}
                          </span>
                        )}
                        <span className="text-xs text-muted-foreground">{record.inspector || "未填写检验人"}</span>
                      </div>
                      {record.defects && record.defects.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {record.defects.map((d, i) => (
                            <Badge key={i} variant="outline" className="text-xs text-red-600 border-red-200 bg-red-50">
                              {d}
                            </Badge>
                          ))}
                        </div>
                      )}
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
            <DialogTitle>{editingRecord ? "编辑质检记录" : "新增质检"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">质检类型</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                  {Object.entries(QC_TYPES).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">结果</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })}>
                  <option value="pass">合格</option>
                  <option value="fail">不合格</option>
                  <option value="concession">让步接收</option>
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">检验人</Label>
              <Input placeholder="检验人姓名" value={form.inspector} onChange={(e) => setForm({ ...form, inspector: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">缺陷项（用"、"分隔）</Label>
              <Input placeholder="如：线头、色差、尺寸偏差" value={form.defects} onChange={(e) => setForm({ ...form, defects: e.target.value })} />
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
