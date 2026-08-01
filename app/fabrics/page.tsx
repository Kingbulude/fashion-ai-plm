// 面料库 - 物料管理中心
// 面料列表 + 搜索 + 状态筛选 + 新增

"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant, getTenantHeaders } from "@/lib/auth/tenant-context";
import {
  Search,
  Plus,
  Layers,
  ChevronRight,
  X,
  Loader2,
  AlertTriangle,
  RefreshCw,
  DollarSign,
  Palette,
  Ruler,
  Scale,
  Clock,
  FileText,
  Hash,
  Factory,
  CheckCircle2,
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

const SORT_OPTIONS = [
  { value: "created_at-desc", label: "最新创建" },
  { value: "created_at-asc", label: "最早创建" },
  { value: "name-asc", label: "名称升序" },
  { value: "name-desc", label: "名称降序" },
  { value: "price-asc", label: "价格升序" },
  { value: "price-desc", label: "价格降序" },
];

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

export default function FabricsPage() {
  const router = useRouter();
  const tenant = useTenant();
  const tenantHeaders = useMemo(() => getTenantHeaders(tenant), [tenant]);

  const [fabrics, setFabrics] = useState<Fabric[]>([]);
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortValue, setSortValue] = useState("created_at-desc");
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: "",
    supplier: "",
    supplierId: "",
    composition: "",
    price: "",
    usage: "",
    status: "active",
    color: "",
    width: "",
    weight: "",
    moq: "",
    leadTime: "",
    remark: "",
  });

  useEffect(() => {
    fetchFabrics();
    fetchSuppliers();
  }, []);

  const fetchFabrics = async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (statusFilter) params.set("status", statusFilter);
      const [sortBy, sortOrder] = sortValue.split("-");
      params.set("sortBy", sortBy || "created_at");
      params.set("sortOrder", sortOrder || "desc");

      const res = await fetch(`/api/fabrics?${params.toString()}`, { headers: tenantHeaders });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "加载面料失败");
      }
      const data = await res.json();
      const rawItems: unknown[] = Array.isArray(data?.items) ? data.items : [];
      const items: Fabric[] = rawItems
        .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
        .map(mapFabric);
      setFabrics(items);
    } catch (err) {
      console.error("获取面料失败:", err);
      setError(err instanceof Error ? err.message : "加载面料失败");
      setFabrics([]);
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

  const handleSearch = () => {
    fetchFabrics();
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      alert("请输入面料名称");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/fabrics", {
        method: "POST",
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
        setShowAdd(false);
        setForm({
          name: "",
          supplier: "",
          supplierId: "",
          composition: "",
          price: "",
          usage: "",
          status: "active",
          color: "",
          width: "",
          weight: "",
          moq: "",
          leadTime: "",
          remark: "",
        });
        fetchFabrics();
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || "创建失败");
      }
    } catch (err) {
      alert("创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const activeCount = fabrics.filter((f) => f.status === "active").length;
  const avgPrice = useMemo(() => {
    const withPrice = fabrics.filter((f) => typeof f.price === "number" && !isNaN(f.price));
    if (withPrice.length === 0) return 0;
    return withPrice.reduce((sum, f) => sum + (f.price || 0), 0) / withPrice.length;
  }, [fabrics]);
  const supplierCount = useMemo(() => {
    const ids = new Set(fabrics.map((f) => f.supplierId || f.supplier).filter(Boolean));
    return ids.size;
  }, [fabrics]);

  const statuses = Object.keys(STATUS_CONFIG);

  return (
    <SidebarLayout>
      <div className="max-w-[2400px] mx-auto">
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center shadow-premium">
                <Layers className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">面料库</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">管理面料物料、规格、供应商与可用状态</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-navy-700 hover:bg-navy-800 text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            新增面料
          </Button>
        </div>

        {/* KPI 概览 */}
        {!loading && fabrics.length > 0 && (
          <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="card-premium">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">面料总数</span>
                  <Layers className="h-4 w-4 text-navy-600" />
                </div>
                <div className="text-2xl font-bold text-foreground">{fabrics.length}</div>
                <div className="text-xs text-muted-foreground mt-2">覆盖 {supplierCount} 个供应商</div>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">可用面料</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700">{activeCount}</div>
                <div className="text-xs text-muted-foreground mt-2">
                  占比 {fabrics.length > 0 ? Math.round((activeCount / fabrics.length) * 100) : 0}%
                </div>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">平均单价</span>
                  <DollarSign className="h-4 w-4 text-amber-600" />
                </div>
                <div className="text-2xl font-bold text-foreground">¥{avgPrice.toFixed(2)}</div>
                <div className="text-xs text-muted-foreground mt-2">按已录入价格计算</div>
              </CardContent>
            </Card>

            <Card className="card-premium">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">今日更新</span>
                  <Clock className="h-4 w-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {fabrics.filter((f) => f.updatedAt && new Date(f.updatedAt).toDateString() === new Date().toDateString()).length}
                </div>
                <div className="text-xs text-muted-foreground mt-2">最近 24 小时</div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 状态筛选 */}
        <div className="mb-5 flex items-center gap-2.5 overflow-x-auto pb-2">
          <button
            onClick={() => setStatusFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !statusFilter
                ? "bg-navy-700 text-white border-navy-700"
                : "bg-card text-muted-foreground border-border hover:border-navy-200"
            }`}
          >
            全部 ({fabrics.length})
          </button>
          {statuses.map((status) => {
            const count = fabrics.filter((f) => f.status === status).length;
            const cfg = STATUS_CONFIG[status];
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(isActive ? null : status)}
                className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1.5 transition-all ${
                  isActive
                    ? `${cfg.color} ring-2 ring-offset-1 ring-navy-200`
                    : "bg-card text-muted-foreground border-border hover:border-navy-200"
                }`}
              >
                {cfg.label}
                <Badge variant="secondary" className="text-[10px] h-4 bg-white/60">
                  {count}
                </Badge>
              </button>
            );
          })}
        </div>

        {/* 搜索与排序 */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索面料名称、成分、供应商..."
              className="pl-10 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>

          <div className="relative">
            <select
              value={sortValue}
              onChange={(e) => setSortValue(e.target.value)}
              className="h-10 w-full px-3 pr-9 rounded-lg border border-border text-sm bg-card appearance-none hover:border-navy-200 focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rotate-90 pointer-events-none" />
          </div>

          <Button variant="outline" size="sm" onClick={handleSearch} className="h-10">
            <Search className="h-4 w-4 mr-1.5" />
            搜索
          </Button>

          {(search || statusFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setStatusFilter(null);
                setSortValue("created_at-desc");
                setTimeout(() => fetchFabrics(), 0);
              }}
              className="h-10"
            >
              <X className="h-4 w-4 mr-1.5" />
              清除筛选
            </Button>
          )}

          <div className="ml-auto text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{fabrics.length}</span> 个面料
          </div>
        </div>

        {/* 面料列表 */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2 card-premium">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载面料...
          </div>
        ) : error ? (
          <Card className="card-premium border-destructive/30 bg-destructive/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-destructive">加载失败</p>
                  <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => fetchFabrics()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : fabrics.length === 0 ? (
          <Card className="card-premium border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
                <Layers className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-2">暂无面料</p>
              <p className="text-sm text-muted-foreground mb-4">点击上方按钮添加第一个面料物料</p>
              <Button onClick={() => setShowAdd(true)} className="bg-navy-700 hover:bg-navy-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                新增面料
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {fabrics.map((fabric) => (
              <FabricCard key={fabric.id} fabric={fabric} onClick={() => router.push(`/fabrics/${fabric.id}`)} />
            ))}
          </div>
        )}

        {/* 新增面料弹窗 */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
              <CardHeader className="flex items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">新增面料</CardTitle>
                  <CardDescription className="text-sm">填写面料基础信息与规格</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)} className="rounded-full hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-5 px-6 pb-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">面料名称 *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="例如：60支长绒棉府绸"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">状态</label>
                    <div className="relative">
                      <select
                        value={form.status}
                        onChange={(e) => setForm({ ...form, status: e.target.value })}
                        className="h-10 w-full px-3 pr-9 rounded-md border border-slate-200 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                      >
                        {statuses.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_CONFIG[s].label}
                          </option>
                        ))}
                      </select>
                      <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground rotate-90 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">关联供应商</label>
                    <div className="relative">
                      <select
                        value={form.supplierId}
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
                      value={form.supplier}
                      onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                      placeholder="例如：恒丰纺织"
                      className="h-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">成分</label>
                  <Input
                    value={form.composition}
                    onChange={(e) => setForm({ ...form, composition: e.target.value })}
                    placeholder="例如：100% 棉 / 65%涤 35%棉"
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">用途</label>
                  <Input
                    value={form.usage}
                    onChange={(e) => setForm({ ...form, usage: e.target.value })}
                    placeholder="例如：衬衫、连衣裙、外套里布"
                    className="h-10"
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
                      <DollarSign className="h-3 w-3" /> 单价
                    </label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      placeholder="元/米"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
                      <Palette className="h-3 w-3" /> 颜色
                    </label>
                    <Input
                      value={form.color}
                      onChange={(e) => setForm({ ...form, color: e.target.value })}
                      placeholder="本白"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
                      <Ruler className="h-3 w-3" /> 门幅
                    </label>
                    <Input
                      value={form.width}
                      onChange={(e) => setForm({ ...form, width: e.target.value })}
                      placeholder="145cm"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
                      <Scale className="h-3 w-3" /> 克重
                    </label>
                    <Input
                      value={form.weight}
                      onChange={(e) => setForm({ ...form, weight: e.target.value })}
                      placeholder="120g/m²"
                      className="h-10"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
                      <Hash className="h-3 w-3" /> 起订量 (MOQ)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.moq}
                      onChange={(e) => setForm({ ...form, moq: e.target.value })}
                      placeholder="米"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
                      <Clock className="h-3 w-3" /> 交期 (天)
                    </label>
                    <Input
                      type="number"
                      min="0"
                      value={form.leadTime}
                      onChange={(e) => setForm({ ...form, leadTime: e.target.value })}
                      placeholder="15"
                      className="h-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block flex items-center gap-1">
                    <FileText className="h-3 w-3" /> 备注
                  </label>
                  <textarea
                    value={form.remark}
                    onChange={(e) => setForm({ ...form, remark: e.target.value })}
                    rows={3}
                    placeholder="其他说明信息，如色卡编号、库存位置等"
                    className="w-full px-3 py-2.5 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-200 mt-2">
                  <Button variant="outline" onClick={() => setShowAdd(false)} className="h-10 px-5">
                    取消
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="h-10 px-6 bg-navy-700 hover:bg-navy-800 text-white"
                  >
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        提交中
                      </>
                    ) : (
                      "创建"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}

// 面料卡片
function FabricCard({ fabric, onClick }: { fabric: Fabric; onClick: () => void }) {
  const status = STATUS_CONFIG[fabric.status] || STATUS_CONFIG.active;
  const supplierName = fabric.supplier || "未指定供应商";

  return (
    <Card className="card-premium cursor-pointer hover:shadow-premium transition-all overflow-hidden group" onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 flex items-center justify-center shadow-premium">
              <Layers className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{fabric.name}</p>
              <Badge variant="outline" className={`text-[10px] h-5 mt-1 ${status.color}`}>
                {status.label}
              </Badge>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-sand-50 flex items-center justify-center group-hover:bg-navy-700 transition-colors">
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* 规格摘要 */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {fabric.composition && (
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-sand-50 flex items-center justify-center flex-shrink-0">
                <Factory className="h-3.5 w-3.5 text-navy-600" />
              </div>
              <span className="truncate">{fabric.composition}</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-sand-50 flex items-center justify-center flex-shrink-0">
              <Palette className="h-3.5 w-3.5 text-navy-600" />
            </div>
            <span>{fabric.color || "未指定颜色"}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-sand-50 flex items-center justify-center flex-shrink-0">
              <Ruler className="h-3.5 w-3.5 text-navy-600" />
            </div>
            <span>{fabric.width || "未指定门幅"}</span>
          </div>
        </div>

        {/* 指标 */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          {typeof fabric.price === "number" && (
            <div className="flex-1 p-2.5 rounded-xl bg-sand-50 border border-sand-100">
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-emerald-600" />
                单价
              </p>
              <p className="text-sm font-semibold text-foreground">¥{fabric.price.toFixed(2)}</p>
            </div>
          )}
          {typeof fabric.moq === "number" && (
            <div className="flex-1 p-2.5 rounded-xl bg-sand-50 border border-sand-100">
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <Hash className="h-3 w-3 text-navy-600" />
                MOQ
              </p>
              <p className="text-sm font-semibold text-foreground">{fabric.moq}</p>
            </div>
          )}
          {typeof fabric.leadTime === "number" && (
            <div className="flex-1 p-2.5 rounded-xl bg-sand-50 border border-sand-100">
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3 text-blue-600" />
                交期
              </p>
              <p className="text-sm font-semibold text-foreground">{fabric.leadTime}天</p>
            </div>
          )}
          {!fabric.price && !fabric.moq && !fabric.leadTime && (
            <div className="flex-1 p-2.5 rounded-xl bg-sand-50 border border-sand-100">
              <p className="text-xs text-muted-foreground mb-0.5">供应商</p>
              <p className="text-sm font-semibold text-foreground truncate">{supplierName}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
