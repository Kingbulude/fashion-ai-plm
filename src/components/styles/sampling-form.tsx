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
  AlertCircle,
  Clock,
  Send,
  Package,
  RotateCcw,
} from "lucide-react";

interface Supplier {
  id: string;
  name: string;
  type: string;
}

interface SamplingRecord {
  id: string;
  round: number;
  factoryId: string | null;
  status: string;
  sentDate: string | null;
  receivedDate: string | null;
  feedback: string | null;
  revisionNotes: string | null;
  approved: boolean;
  createdAt: string;
}

interface SamplingFormProps {
  styleId: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  pending: { label: "待发送", color: "text-slate-600", bg: "bg-slate-100", icon: <Clock className="h-3 w-3" /> },
  in_progress: { label: "打样中", color: "text-blue-600", bg: "bg-blue-100", icon: <Loader2 className="h-3 w-3" /> },
  received: { label: "已收到", color: "text-amber-600", bg: "bg-amber-100", icon: <Package className="h-3 w-3" /> },
  reviewing: { label: "审版中", color: "text-indigo-600", bg: "bg-indigo-100", icon: <AlertCircle className="h-3 w-3" /> },
  approved: { label: "通过", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle className="h-3 w-3" /> },
  rejected: { label: "退回", color: "text-red-600", bg: "bg-red-100", icon: <RotateCcw className="h-3 w-3" /> },
};

export function SamplingForm({ styleId }: SamplingFormProps) {
  const [records, setRecords] = useState<SamplingRecord[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<SamplingRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    round: "",
    factoryId: "",
    status: "pending",
    sentDate: "",
    receivedDate: "",
    feedback: "",
    revisionNotes: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchSuppliers = useCallback(async () => {
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data || []);
      }
    } catch {
      // ignore
    }
  }, []);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/styles/${styleId}/sampling`);
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
    fetchSuppliers();
    fetchRecords();
  }, [fetchSuppliers, fetchRecords]);

  const openAdd = () => {
    setEditingRecord(null);
    setForm({
      round: String(records.length + 1),
      factoryId: "",
      status: "pending",
      sentDate: "",
      receivedDate: "",
      feedback: "",
      revisionNotes: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (record: SamplingRecord) => {
    setEditingRecord(record);
    setForm({
      round: String(record.round),
      factoryId: record.factoryId || "",
      status: record.status,
      sentDate: record.sentDate || "",
      receivedDate: record.receivedDate || "",
      feedback: record.feedback || "",
      revisionNotes: record.revisionNotes || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.round) {
      showToast("error", "轮次不能为空");
      return;
    }
    setSaving(true);
    try {
      const url = editingRecord
        ? `/api/styles/${styleId}/sampling/${editingRecord.id}`
        : `/api/styles/${styleId}/sampling`;
      const method = editingRecord ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          round: Number(form.round),
          factoryId: form.factoryId || null,
          status: form.status,
          sentDate: form.sentDate || null,
          receivedDate: form.receivedDate || null,
          feedback: form.feedback || null,
          revisionNotes: form.revisionNotes || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }

      showToast("success", editingRecord ? "打样记录更新成功" : "打样记录创建成功");
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
    if (!confirm("确定删除这条打样记录？")) return;
    try {
      const res = await fetch(`/api/styles/${styleId}/sampling/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      showToast("success", "已删除");
      fetchRecords();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除失败";
      showToast("error", msg);
    }
  };

  const handleApprove = async (record: SamplingRecord) => {
    try {
      const res = await fetch(`/api/styles/${styleId}/sampling/${record.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !record.approved, status: record.approved ? "reviewing" : "approved" }),
      });
      if (!res.ok) throw new Error("操作失败");
      showToast("success", record.approved ? "已取消通过" : "打样通过");
      fetchRecords();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "操作失败";
      showToast("error", msg);
    }
  };

  const factoryOptions = suppliers.filter((s) => s.type === "factory");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          共 {records.length} 轮打样记录
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="h-4 w-4 mr-2" />
          新增打样
        </Button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          加载中...
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <Send className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-muted-foreground text-sm mb-4">暂无打样记录</p>
          <Button size="sm" onClick={openAdd}>
            <Plus className="h-4 w-4 mr-2" />
            创建第一轮打样
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {records.map((record) => {
            const status = STATUS_CONFIG[record.status] || STATUS_CONFIG.pending;
            const factory = factoryOptions.find((f) => f.id === record.factoryId);
            return (
              <Card key={record.id} className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className={`${status.bg} ${status.color} border-0`}>
                          <span className="mr-1">{status.icon}</span>
                          {status.label}
                        </Badge>
                        <span className="text-sm font-medium">第 {record.round} 轮</span>
                        {factory && (
                          <span className="text-xs text-muted-foreground">· {factory.name}</span>
                        )}
                        {record.approved && (
                          <Badge variant="secondary" className="bg-green-50 text-green-700">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            已通过
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        {record.sentDate && <span>发送：{record.sentDate}</span>}
                        {record.receivedDate && <span>收到：{record.receivedDate}</span>}
                      </div>
                      {record.feedback && (
                        <p className="text-sm bg-slate-50 p-2 rounded">{record.feedback}</p>
                      )}
                      {record.revisionNotes && (
                        <p className="text-sm text-amber-700 bg-amber-50 p-2 rounded">
                          修改意见：{record.revisionNotes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Button variant="ghost" size="icon-xs" onClick={() => handleApprove(record)} className={record.approved ? "text-amber-500" : "text-green-500"}>
                        <CheckCircle className="h-4 w-4" />
                      </Button>
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

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? "编辑打样记录" : "新增打样"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">轮次</Label>
                <Input type="number" value={form.round} onChange={(e) => setForm({ ...form, round: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">状态</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUS_CONFIG).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">工厂</Label>
              <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.factoryId} onChange={(e) => setForm({ ...form, factoryId: e.target.value })}>
                <option value="">请选择工厂</option>
                {factoryOptions.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">发送日期</Label>
                <Input type="date" value={form.sentDate} onChange={(e) => setForm({ ...form, sentDate: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">收到日期</Label>
                <Input type="date" value={form.receivedDate} onChange={(e) => setForm({ ...form, receivedDate: e.target.value })} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">工厂反馈</Label>
              <textarea className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" placeholder="工厂反馈内容..." value={form.feedback} onChange={(e) => setForm({ ...form, feedback: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">修改意见</Label>
              <textarea className="min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" placeholder="需要修改的内容..." value={form.revisionNotes} onChange={(e) => setForm({ ...form, revisionNotes: e.target.value })} />
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
