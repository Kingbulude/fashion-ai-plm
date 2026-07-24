// 供应商管理 - 供应链协同核心
// 供应商列表 + 搜索 + 添加 + 评估体系

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Plus,
  Building2,
  Phone,
  Mail,
  Star,
  Truck,
  DollarSign,
  Filter,
  Loader2,
  ChevronRight,
  Factory,
  Shirt,
  Package,
  X,
  User,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

const SUPPLIER_TYPES: Record<string, { label: string; color: string }> = {
  fabric: { label: "面料供应商", color: "bg-blue-50 text-blue-700 border-blue-200" },
  accessory: { label: "辅料供应商", color: "bg-amber-50 text-amber-700 border-amber-200" },
  factory: { label: "加工厂", color: "bg-green-50 text-green-700 border-green-200" },
  printing: { label: "印花/刺绣", color: "bg-purple-50 text-purple-700 border-purple-200" },
  dyeing: { label: "染厂", color: "bg-pink-50 text-pink-700 border-pink-200" },
  other: { label: "其他", color: "bg-slate-50 text-slate-700 border-slate-200" },
};

export default function SuppliersPage() {
  const router = useRouter();
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "fabric",
    contact: "",
    phone: "",
    email: "",
    capabilities: "",
    qualityScore: "",
    deliveryScore: "",
    priceLevel: "",
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/suppliers");
      if (res.ok) {
        const data = await res.json();
        setSuppliers(Array.isArray(data) ? data : []);
      } else {
        setError("加载供应商失败，请稍后重试");
        setSuppliers([]);
      }
    } catch (err) {
      console.error("获取供应商失败:", err);
      setError("网络异常，加载供应商失败");
      setSuppliers([]);
    } finally {
      setLoading(false);
    }
  };

  const filtered = suppliers.filter((s) => {
    if (search && !(s.name || "").toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && s.type !== typeFilter) return false;
    return true;
  });

  const handleSubmit = async () => {
    if (!form.name) {
      alert("请输入供应商名称");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowAdd(false);
        setForm({
          name: "",
          type: "fabric",
          contact: "",
          phone: "",
          email: "",
          capabilities: "",
          qualityScore: "",
          deliveryScore: "",
          priceLevel: "",
        });
        fetchSuppliers();
      } else {
        const data = await res.json();
        alert(data.error || "创建失败");
      }
    } catch (err) {
      alert("创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  const types = Object.keys(SUPPLIER_TYPES);

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center shadow-premium">
                <Factory className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">供应商管理</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">管理面料、辅料、加工厂等供应链资源</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="bg-navy-700 hover:bg-navy-800 text-white">
            <Plus className="h-4 w-4 mr-1.5" />
            新增供应商
          </Button>
        </div>

        {/* 类型统计条 */}
        <div className="mb-5 flex items-center gap-2.5 overflow-x-auto pb-2">
          <button
            onClick={() => setTypeFilter(null)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              !typeFilter
                ? "bg-navy-700 text-white border-navy-700"
                : "bg-card text-muted-foreground border-border hover:border-navy-200"
            }`}
          >
            全部 ({filtered.length})
          </button>
          {types.map((t) => {
            const count = suppliers.filter((s) => s.type === t).length;
            const isActive = typeFilter === t;
            const cfg = SUPPLIER_TYPES[t];
            return (
              <button
                key={t}
                onClick={() => setTypeFilter(isActive ? null : t)}
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

        {/* 搜索和筛选 */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索供应商名称..."
              className="pl-10 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            value={typeFilter || ""}
            onChange={(e) => setTypeFilter(e.target.value || null)}
            className="h-10 px-3 rounded-lg border border-border text-sm bg-card hover:border-navy-200 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">全类型</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {SUPPLIER_TYPES[t].label}
              </option>
            ))}
          </select>

          {(search || typeFilter) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearch("");
                setTypeFilter(null);
              }}
              className="h-10"
            >
              <X className="h-4 w-4 mr-1.5" />
              清除筛选
            </Button>
          )}

          <div className="ml-auto text-sm text-muted-foreground">
            共 <span className="font-semibold text-foreground">{filtered.length}</span> 个供应商
          </div>
        </div>

        {/* 供应商列表 */}
        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2 card-premium">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载供应商...
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
                <Button variant="outline" size="sm" onClick={() => fetchSuppliers()}>
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  重试
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : filtered.length === 0 ? (
          <Card className="card-premium border-dashed">
            <CardContent className="py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-sand-100 flex items-center justify-center mx-auto mb-4">
                <Factory className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-foreground font-medium mb-2">暂无供应商</p>
              <p className="text-sm text-muted-foreground mb-4">点击上方按钮添加第一个供应商</p>
              <Button onClick={() => setShowAdd(true)} className="bg-navy-700 hover:bg-navy-800 text-white">
                <Plus className="h-4 w-4 mr-2" />
                新增供应商
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filtered.map((supplier) => (
              <SupplierCard key={supplier.id} supplier={supplier} onClick={() => router.push(`/suppliers/${supplier.id}`)} />
            ))}
          </div>
        )}

        {/* 添加供应商弹窗 */}
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
              <CardHeader className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">新增供应商</CardTitle>
                  <CardDescription>填写供应商基本信息</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">
                      供应商名称 *
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="例如：广州恒丰纺织"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">类型</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="h-9 px-3 rounded-md border border-slate-200 text-sm w-full"
                    >
                      {types.map((t) => (
                        <option key={t} value={t}>
                          {SUPPLIER_TYPES[t].label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">联系人</label>
                    <Input
                      value={form.contact}
                      onChange={(e) => setForm({ ...form, contact: e.target.value })}
                      placeholder="联系人姓名"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">联系电话</label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="手机号码"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">邮箱</label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">能力说明</label>
                  <textarea
                    value={form.capabilities}
                    onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
                    rows={2}
                    placeholder="例如：主营棉麻布，月产能50万米"
                    className="w-full px-3 py-2 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-slate-200"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">品质评分</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={form.qualityScore}
                      onChange={(e) => setForm({ ...form, qualityScore: e.target.value })}
                      placeholder="0-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">交期评分</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      value={form.deliveryScore}
                      onChange={(e) => setForm({ ...form, deliveryScore: e.target.value })}
                      placeholder="0-100"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">价格等级</label>
                    <select
                      value={form.priceLevel}
                      onChange={(e) => setForm({ ...form, priceLevel: e.target.value })}
                      className="h-9 px-3 rounded-md border border-slate-200 text-sm w-full"
                    >
                      <option value="">选择</option>
                      <option value="low">低价</option>
                      <option value="medium">中等</option>
                      <option value="high">高价</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowAdd(false)}>
                    取消
                  </Button>
                  <Button onClick={handleSubmit} disabled={submitting}>
                    {submitting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    创建
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

// 供应商卡片
function SupplierCard({ supplier, onClick }: { supplier: any; onClick: () => void }) {
  const type = SUPPLIER_TYPES[supplier.type] || SUPPLIER_TYPES.other;
  return (
    <Card className="card-premium cursor-pointer hover:shadow-premium transition-all overflow-hidden group" onClick={onClick}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-navy-600 to-navy-800 flex items-center justify-center shadow-premium">
              <Factory className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">{supplier.name}</p>
              <Badge variant="outline" className={`text-[10px] h-5 mt-1 ${type.color}`}>
                {type.label}
              </Badge>
            </div>
          </div>
          <div className="w-7 h-7 rounded-full bg-sand-50 flex items-center justify-center group-hover:bg-navy-700 transition-colors">
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-white transition-colors" />
          </div>
        </div>

        {/* 联系方式 */}
        <div className="space-y-2 text-sm text-muted-foreground">
          {supplier.contact && (
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-sand-50 flex items-center justify-center flex-shrink-0">
                <User className="h-3.5 w-3.5 text-navy-600" />
              </div>
              <span className="truncate">{supplier.contact}</span>
            </div>
          )}
          {supplier.phone && (
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-sand-50 flex items-center justify-center flex-shrink-0">
                <Phone className="h-3.5 w-3.5 text-navy-600" />
              </div>
              <span>{supplier.phone}</span>
            </div>
          )}
          {supplier.email && (
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-md bg-sand-50 flex items-center justify-center flex-shrink-0">
                <Mail className="h-3.5 w-3.5 text-navy-600" />
              </div>
              <span className="truncate">{supplier.email}</span>
            </div>
          )}
        </div>

        {/* 评估指标 */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          {supplier.qualityScore ? (
            <div className="flex-1 p-2.5 rounded-xl bg-sand-50 border border-sand-100">
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <Star className="h-3 w-3 text-amber-500" />
                品质评分
              </p>
              <p className="text-sm font-semibold text-foreground">{supplier.qualityScore}分</p>
            </div>
          ) : null}
          {supplier.deliveryScore ? (
            <div className="flex-1 p-2.5 rounded-xl bg-sand-50 border border-sand-100">
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <Truck className="h-3 w-3 text-navy-600" />
                交期评分
              </p>
              <p className="text-sm font-semibold text-foreground">{supplier.deliveryScore}分</p>
            </div>
          ) : null}
          {supplier.priceLevel ? (
            <div className="flex-1 p-2.5 rounded-xl bg-sand-50 border border-sand-100">
              <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                <DollarSign className="h-3 w-3 text-emerald-600" />
                价格等级
              </p>
              <p className="text-sm font-semibold text-foreground">
                {supplier.priceLevel === "low" ? "低价" : supplier.priceLevel === "medium" ? "中等" : "高价"}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
