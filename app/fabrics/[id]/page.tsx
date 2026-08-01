// 面料详情页 - 查看 / 编辑面料规格与供应商信息

"use client";

export const runtime = "edge";

import { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant, getTenantHeaders } from "@/lib/auth/tenant-context";
import {
  ArrowLeft,
  Layers,
  Edit,
  Loader2,
  AlertCircle,
  DollarSign,
  Palette,
  Ruler,
  Scale,
  Clock,
  FileText,
  Hash,
  Factory,
  Trash2,
  Save,
  X,
  ChevronRight,
} from "lucide-react";

interface Fabric {
  id: string;
  name: string;
  supplier: string | null;
  supplierId: string | null;
  composition: string | null;
  price: number | null;
  usage: string | null;
  status: string;
  color: string | null;
  width: string | null;
  weight: string | null;
  moq: number | null;
  leadTime: number | null;
  remark: string | null;
  createdAt: string;
  updatedAt: string | null;
}

interface SupplierOption {
  id: string;
  name: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; badge: string }> = {
  active: { label: "可用", color: "bg-emerald-50 text-emerald-700 border-emerald-200", badge: "bg-emerald-100 text-emerald-700" },
  pending: { label: "待确认", color: "bg-amber-50 text-amber-700 border-amber-200", badge: "bg-amber-100 text-amber-700" },
  discontinued: { label: "停用", color: "bg-slate-50 text-slate-700 border-slate-200", badge: "bg-slate-100 text-slate-700" },
};

function mapFabric(item: Record<string, unknown>): Fabric {
  return {
    id: String(item.id || ""),
    name: String(item.name || "未命名面料"),
    supplier: item.supplier ? String(item.supplier) : null,
    supplierId: item.supplierId ? String(item.supplierId) : null,
    composition: item.composition ? String(item.composition) : null,
    price: typeof item.price === "number" ? item.price : item.price ? Number(item.price) : null,
    usage: item.usage ? String(item.usage) : null,
    status: String(item.status || "active"),
    color: item.color ? String(item.color) : null,
    width: item.width ? String(item.width) : null,
    weight: item.weight ? String(item.weight) : null,
    moq: typeof item.moq === "number" ? item.moq : item.moq ? Number(item.moq) : null,
    leadTime: typeof item.leadTime === "number" ? item.leadTime : item.leadTime ? Number(item.leadTime) : null,
    remark: item.remark ? String(item.remark) : null,
    createdAt: String(item.createdAt || ""),
    updatedAt: item.updatedAt ? String(item.updatedAt) : null,
  };
}

export default function FabricDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";

  const tenant = useTenant();
  const tenantHeaders = useMemo(() => getTenantHeaders(tenant), [tenant]);

  const [fabric, setFabric] = useState<Fabric | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!id) return;
    fetchFabric();
    fetchSuppliers();
  }, [id]);

  const fetchFabric = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/fabrics/${id}`, { headers: tenantHeaders });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "获取面料失败");
      }
      const data = await res.json();
      if (!data || typeof data !== "object") {
        throw new Error("面料数据异常");
      }
      const item = mapFabric(data as Record<string, unknown>);
      setFabric(item);
      resetForm(item);
    } catch (err) {
      console.error("获取面料失败:", err);
      setError(err instanceof Error ? err.message : "获取面料失败");
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliers = async () => {
    try {
      const res = await fetch("/api/suppliers", { headers: tenantHeaders });
      if (!res.ok) return;
      const data = await res.json();
      const raw: unknown[] = Array.isArray(data) ? data : [];
      const mapped: SupplierOption[] = raw
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map((item) => ({ id: String(item.id || ""), name: String(item.name || "未命名供应商") }))
        .filter((item) => item.id);
      setSuppliers(mapped);
    } catch (err) {
      console.error("获取供应商失败:", err);
    }
  };

  const resetForm = (item: Fabric) => {
    setForm({
      name: item.name,
      supplier: item.supplier || "",
      supplierId: item.supplierId || "",
      composition: item.composition || "",
      price: item.price !== null ? String(item.price) : "",
      usage: item.usage || "",
      status: item.status,
      color: item.color || "",
      width: item.width || "",
      weight: item.weight || "",
      moq: item.moq !== null ? String(item.moq) : "",
      leadTime: item.leadTime !== null ? String(item.leadTime) : "",
      remark: item.remark || "",
    });
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      alert("面料名称不能为空");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/fabrics/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...tenantHeaders },
        body: JSON.stringify({
          name: form.name,
          supplier: form.supplier || null,
          supplierId: form.supplierId || null,
          composition: form.composition || null,
          price: form.price ? Number(form.price) : null,
          usage: form.usage || null,
          status: form.status,
          color: form.color || null,
          width: form.width || null,
          weight: form.weight || null,
          moq: form.moq ? Number(form.moq) : null,
          leadTime: form.leadTime ? Number(form.leadTime) : null,
          remark: form.remark || null,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const item = mapFabric(data as Record<string, unknown>);
        setFabric(item);
        setEditing(false);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "保存失败");
      }
    } catch (err) {
      alert("保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除该面料吗？删除后不可恢复。")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/fabrics/${id}`, {
        method: "DELETE",
        headers: tenantHeaders,
      });
      if (res.ok) {
        router.push("/fabrics");
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "删除失败");
      }
    } catch (err) {
      alert("删除失败");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          加载面料信息...
        </div>
      </SidebarLayout>
    );
  }

  if (error || !fabric) {
    return (
      <SidebarLayout>
        <div className="">
          <Button variant="ghost" onClick={() => router.push("/fabrics")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回列表
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error || "面料不存在"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    );
  }

  const status = STATUS_CONFIG[fabric.status] || STATUS_CONFIG.active;
  const supplierName = fabric.supplier || suppliers.find((s) => s.id === fabric.supplierId)?.name || "未指定供应商";

  return (
    <SidebarLayout>
      <div className="max-w-[1200px] mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold">{fabric.name}</h1>
              <Badge className={status.color}>{status.label}</Badge>
            </div>
            <p className="text-sm text-slate-500">面料详情与规格管理</p>
          </div>
          {!editing ? (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Button>
              <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive/5" onClick={handleDelete} disabled={deleting}>
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => { setEditing(false); resetForm(fabric); }}>
                <X className="h-4 w-4 mr-2" />
                取消
              </Button>
              <Button size="sm" className="bg-navy-700 hover:bg-navy-800 text-white" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                保存
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左侧：基础信息 */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">基础信息</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-br from-navy-50 to-indigo-50 rounded-lg">
                  <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-navy-500 to-indigo-500 flex items-center justify-center">
                    <Layers className="h-6 w-6 text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 truncate">{fabric.name}</p>
                    <p className="text-xs text-slate-500">{supplierName}</p>
                  </div>
                </div>

                {editing ? (
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">面料名称 *</label>
                      <Input
                        value={form.name || ""}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">状态</label>
                      <div className="relative">
                        <select
                          value={form.status || "active"}
                          onChange={(e) => setForm({ ...form, status: e.target.value })}
                          className="h-10 w-full px-3 pr-9 rounded-md border border-slate-200 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                        >
                          {Object.keys(STATUS_CONFIG).map((s) => (
                            <option key={s} value={s}>
                              {STATUS_CONFIG[s].label}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rotate-90 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">关联供应商</label>
                      <div className="relative">
                        <select
                          value={form.supplierId || ""}
                          onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                          className="h-10 w-full px-3 pr-9 rounded-md border border-slate-200 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                        >
                          <option value="">不关联</option>
                          {suppliers.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                        <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rotate-90 pointer-events-none" />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">供应商备注名</label>
                      <Input
                        value={form.supplier || ""}
                        onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    {fabric.composition && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                          <Factory className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">成分</p>
                          <p className="text-sm font-medium text-slate-800">{fabric.composition}</p>
                        </div>
                      </div>
                    )}
                    {fabric.usage && (
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-slate-500" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">用途</p>
                          <p className="text-sm font-medium text-slate-800">{fabric.usage}</p>
                        </div>
                      </div>
                    )}
                    {fabric.remark && (
                      <div className="pt-3 border-t">
                        <p className="text-xs text-slate-500 mb-1">备注</p>
                        <p className="text-sm text-slate-700">{fabric.remark}</p>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 右侧：规格参数 */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">规格参数</CardTitle>
                <CardDescription className="text-xs">面料物理属性与商务条件</CardDescription>
              </CardHeader>
              <CardContent>
                {editing ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SpecInputEdit label="成分" icon={Factory} value={form.composition || ""} onChange={(v) => setForm({ ...form, composition: v })} />
                    <SpecInputEdit label="用途" icon={FileText} value={form.usage || ""} onChange={(v) => setForm({ ...form, usage: v })} />
                    <SpecInputEdit label="颜色" icon={Palette} value={form.color || ""} onChange={(v) => setForm({ ...form, color: v })} />
                    <SpecInputEdit label="门幅" icon={Ruler} value={form.width || ""} onChange={(v) => setForm({ ...form, width: v })} />
                    <SpecInputEdit label="克重" icon={Scale} value={form.weight || ""} onChange={(v) => setForm({ ...form, weight: v })} />
                    <SpecNumberEdit label="单价" icon={DollarSign} value={form.price || ""} onChange={(v) => setForm({ ...form, price: v })} suffix="元/米" />
                    <SpecNumberEdit label="起订量" icon={Hash} value={form.moq || ""} onChange={(v) => setForm({ ...form, moq: v })} suffix="米" />
                    <SpecNumberEdit label="交期" icon={Clock} value={form.leadTime || ""} onChange={(v) => setForm({ ...form, leadTime: v })} suffix="天" />
                    <div className="sm:col-span-2">
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">备注</label>
                      <textarea
                        value={form.remark || ""}
                        onChange={(e) => setForm({ ...form, remark: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <SpecRead label="颜色" icon={Palette} value={fabric.color} placeholder="未填写" />
                    <SpecRead label="门幅" icon={Ruler} value={fabric.width} placeholder="未填写" />
                    <SpecRead label="克重" icon={Scale} value={fabric.weight} placeholder="未填写" />
                    <SpecRead label="单价" icon={DollarSign} value={fabric.price !== null ? `¥${fabric.price.toFixed(2)} / 米` : null} placeholder="未填写" />
                    <SpecRead label="起订量 (MOQ)" icon={Hash} value={fabric.moq !== null ? `${fabric.moq} 米` : null} placeholder="未填写" />
                    <SpecRead label="交期" icon={Clock} value={fabric.leadTime !== null ? `${fabric.leadTime} 天` : null} placeholder="未填写" />
                    <SpecRead label="成分" icon={Factory} value={fabric.composition} placeholder="未填写" />
                    <SpecRead label="用途" icon={FileText} value={fabric.usage} placeholder="未填写" />
                    {fabric.remark && <SpecRead label="备注" icon={FileText} value={fabric.remark} placeholder="未填写" className="sm:col-span-2" />}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}

function SpecRead({
  label,
  icon: Icon,
  value,
  placeholder,
  className = "",
}: {
  label: string;
  icon: React.ElementType;
  value: string | null;
  placeholder: string;
  className?: string;
}) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100 ${className}`}>
      <div className="w-8 h-8 rounded bg-white flex items-center justify-center flex-shrink-0">
        <Icon className="h-4 w-4 text-navy-600" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-500">{label}</p>
        <p className={`text-sm font-medium ${value ? "text-slate-800" : "text-slate-400"}`}>{value || placeholder}</p>
      </div>
    </div>
  );
}

function SpecInputEdit({
  label,
  icon: Icon,
  value,
  onChange,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-10" />
    </div>
  );
}

function SpecNumberEdit({
  label,
  icon: Icon,
  value,
  onChange,
  suffix,
}: {
  label: string;
  icon: React.ElementType;
  value: string;
  onChange: (value: string) => void;
  suffix: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
        <Icon className="h-3 w-3" /> {label}
      </label>
      <Input type="number" min="0" step={label === "单价" ? "0.01" : "1"} value={value} onChange={(e) => onChange(e.target.value)} placeholder={suffix} className="h-10" />
    </div>
  );
}
