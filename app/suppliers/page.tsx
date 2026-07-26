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
  Sparkles,
  BarChart3,
  Award,
  TrendingUp,
  ShieldCheck,
  Target,
  Layers,
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
  const [showAIMatch, setShowAIMatch] = useState(false);
  const [aiMatchLoading, setAiMatchLoading] = useState(false);
  const [aiMatchResults, setAiMatchResults] = useState<any[]>([]);
  const [matchMode, setMatchMode] = useState<"rule" | "ai">("rule");
  const [aiRecommendation, setAiRecommendation] = useState<string | null>(null);
  const [matchForm, setMatchForm] = useState({
    materialType: "fabric",
    minRating: "3",
  });
  const [aiMatchForm, setAiMatchForm] = useState({
    styleName: "",
    category: "",
    material: "",
    processRequirements: "",
    location: "",
    budget: "",
  });

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

  const handleAIMatch = async () => {
    setAiMatchLoading(true);
    setAiMatchResults([]);
    setAiRecommendation(null);
    try {
      if (matchMode === "ai") {
        // AI 智能匹配 - 基于款式需求推荐
        if (!aiMatchForm.styleName.trim()) {
          alert("请输入款式名称");
          setAiMatchLoading(false);
          return;
        }
        const res = await fetch("/api/ai/supplier-match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleName: aiMatchForm.styleName,
            category: aiMatchForm.category,
            material: aiMatchForm.material,
            processRequirements: aiMatchForm.processRequirements,
            location: aiMatchForm.location,
            budget: aiMatchForm.budget,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAiRecommendation(data.recommendation || "暂无推荐结果");
          const rawSuppliers = data.suppliers;
          const supplierList: any[] = Array.isArray(rawSuppliers) ? rawSuppliers : [];
          setAiMatchResults(supplierList);
        } else {
          const errData = await res.json().catch(() => ({}));
          alert(errData.error || "AI 匹配失败，请稍后重试");
        }
      } else {
        // 规则匹配 - 按物料类型和评分筛选
        const typeMap: Record<string, string> = {
          fabric: "fabric_supplier",
          accessory: "accessory_supplier",
          factory: "factory",
        };
        const res = await fetch("/api/suppliers/match", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            materialType: typeMap[matchForm.materialType] || matchForm.materialType,
            minRating: Number(matchForm.minRating),
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setAiMatchResults(data.suppliers || []);
        }
      }
    } catch (err) {
      console.error("匹配失败:", err);
      alert("匹配请求失败，请检查网络");
    } finally {
      setAiMatchLoading(false);
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
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setShowAIMatch(true)}>
              <Sparkles className="h-4 w-4 mr-1.5" />
              AI智能匹配
            </Button>
            <Button onClick={() => setShowAdd(true)} className="bg-navy-700 hover:bg-navy-800 text-white">
              <Plus className="h-4 w-4 mr-1.5" />
              新增供应商
            </Button>
          </div>
        </div>

        {/* 供应商绩效概览 */}
        {!loading && suppliers.length > 0 && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* KPI 概览 */}
            <Card className="card-premium">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">供应商总数</span>
                  <Factory className="h-4 w-4 text-navy-600" />
                </div>
                <div className="text-2xl font-bold text-foreground">{suppliers.length}</div>
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  <span>面料 {suppliers.filter(s => s.type === "fabric").length}</span>
                  <span>辅料 {suppliers.filter(s => s.type === "accessory").length}</span>
                  <span>加工厂 {suppliers.filter(s => s.type === "factory").length}</span>
                </div>
              </CardContent>
            </Card>

            {/* 平均质量评分 */}
            <Card className="card-premium">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">平均质量评分</span>
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-emerald-700">
                    {(suppliers.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / (suppliers.filter(s => s.qualityScore).length || 1)).toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-500"
                    style={{ width: `${(suppliers.reduce((sum, s) => sum + (s.qualityScore || 0), 0) / (suppliers.filter(s => s.qualityScore).length || 1)) / 5 * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* 平均交付评分 */}
            <Card className="card-premium">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-muted-foreground">平均交付评分</span>
                  <Truck className="h-4 w-4 text-blue-600" />
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-blue-700">
                    {(suppliers.reduce((sum, s) => sum + (s.deliveryScore || 0), 0) / (suppliers.filter(s => s.deliveryScore).length || 1)).toFixed(1)}
                  </span>
                  <span className="text-sm text-muted-foreground">/ 5</span>
                </div>
                <div className="h-1.5 bg-slate-200 rounded-full mt-2 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500"
                    style={{ width: `${(suppliers.reduce((sum, s) => sum + (s.deliveryScore || 0), 0) / (suppliers.filter(s => s.deliveryScore).length || 1)) / 5 * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* 供应商评分排行 + 类型分布 */}
        {!loading && suppliers.length > 0 && (
          <div className="mb-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* TOP 5 评分排行 */}
            <Card className="card-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                  <Award className="h-4 w-4 text-amber-500" />
                  供应商评分排行
                  <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700 hover:bg-amber-100">
                    TOP 5
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {[...suppliers]
                  .sort((a, b) => ((b.qualityScore || 0) + (b.deliveryScore || 0)) - ((a.qualityScore || 0) + (a.deliveryScore || 0)))
                  .slice(0, 5)
                  .map((s, idx) => {
                    const totalScore = (s.qualityScore || 0) + (s.deliveryScore || 0);
                    const maxScore = 10;
                    const pct = (totalScore / maxScore) * 100;
                    return (
                      <div
                        key={s.id}
                        className={`flex items-center gap-3 p-2.5 rounded-xl ${idx < 3 ? "bg-amber-50/50" : ""} hover:bg-slate-50 transition-colors cursor-pointer`}
                        onClick={() => router.push(`/suppliers/${s.id}`)}
                      >
                        <div
                          className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${
                            idx === 0
                              ? "bg-gradient-to-br from-amber-400 to-amber-600"
                              : idx === 1
                                ? "bg-gradient-to-br from-slate-400 to-slate-600"
                                : idx === 2
                                  ? "bg-gradient-to-br from-amber-600 to-amber-800"
                                  : "bg-slate-300"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">{s.name}</span>
                            <Badge variant="outline" className={`text-[10px] h-5 ${SUPPLIER_TYPES[s.type]?.color || ""}`}>
                              {SUPPLIER_TYPES[s.type]?.label || "其他"}
                            </Badge>
                          </div>
                          <div className="h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-600"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-sm font-bold text-amber-700">{totalScore.toFixed(1)}</div>
                          <div className="text-[10px] text-muted-foreground">总分</div>
                        </div>
                      </div>
                    );
                  })}
              </CardContent>
            </Card>

            {/* 类型分布 */}
            <Card className="card-premium">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                  <Layers className="h-4 w-4 text-navy-700" />
                  供应商类型分布
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2.5">
                  {types.map((t) => {
                    const count = suppliers.filter(s => s.type === t).length;
                    const pct = (count / suppliers.length) * 100;
                    const cfg = SUPPLIER_TYPES[t];
                    return (
                      <div key={t} className="flex items-center gap-3">
                        <div className="w-24 text-xs text-muted-foreground flex-shrink-0">
                          {cfg.label}
                        </div>
                        <div className="flex-1 h-6 bg-slate-100 rounded-lg overflow-hidden relative">
                          <div
                            className={`h-full rounded-lg transition-all ${cfg.color.split(" ")[0].replace("bg-", "bg-").replace("50", "400")}`}
                            style={{ width: `${Math.max(pct, 3)}%` }}
                          />
                        </div>
                        <div className="w-12 text-right text-xs font-medium flex-shrink-0">
                          {count} <span className="text-muted-foreground">({pct.toFixed(0)}%)</span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* 价格水平分布 */}
                <div className="mt-4 pt-4 border-t border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-2">价格水平分布</div>
                  <div className="flex gap-2">
                    {["低", "中", "高"].map((level) => {
                      const count = suppliers.filter(s => s.priceLevel === level).length;
                      const pct = suppliers.length > 0 ? (count / suppliers.length) * 100 : 0;
                      return (
                        <div key={level} className="flex-1 p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                          <div className="text-lg font-bold text-foreground">{count}</div>
                          <div className="text-[10px] text-muted-foreground">{level}价位</div>
                          <div className="text-[10px] text-muted-foreground">{pct.toFixed(0)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
            <Card className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl">
              <CardHeader className="flex items-center justify-between pb-4">
                <div>
                  <CardTitle className="text-lg font-semibold">新增供应商</CardTitle>
                  <CardDescription className="text-sm">填写供应商基本信息</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)} className="rounded-full hover:bg-slate-100">
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-5 px-1">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">
                      供应商名称 *
                    </label>
                    <Input
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder="例如：广州恒丰纺织"
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">类型</label>
                    <select
                      value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}
                      className="h-10 px-3 rounded-md border border-slate-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-navy-200"
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
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">联系电话</label>
                    <Input
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })}
                      placeholder="手机号码"
                      className="h-10"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">邮箱</label>
                  <Input
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    className="h-10"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 mb-1.5 block">能力说明</label>
                  <textarea
                    value={form.capabilities}
                    onChange={(e) => setForm({ ...form, capabilities: e.target.value })}
                    rows={3}
                    placeholder="例如：主营棉麻布，月产能50万米"
                    className="w-full px-3 py-2.5 rounded-md border border-slate-200 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-navy-200"
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
                      className="h-10"
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
                      className="h-10"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-slate-700 mb-1.5 block">价格等级</label>
                    <select
                      value={form.priceLevel}
                      onChange={(e) => setForm({ ...form, priceLevel: e.target.value })}
                      className="h-10 px-3 rounded-md border border-slate-200 text-sm w-full focus:outline-none focus:ring-2 focus:ring-navy-200"
                    >
                      <option value="">选择</option>
                      <option value="low">低价</option>
                      <option value="medium">中等</option>
                      <option value="high">高价</option>
                    </select>
                  </div>
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

        {/* AI智能匹配弹窗 */}
        {showAIMatch && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
              <CardHeader className="flex items-center justify-between flex-shrink-0">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-600" />
                    AI 智能匹配供应商
                  </CardTitle>
                  <CardDescription>根据您的需求匹配最合适的供应商</CardDescription>
                </div>
                <Button variant="ghost" size="icon" onClick={() => setShowAIMatch(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto space-y-4">
                {/* 模式切换 */}
                <div className="flex p-1 bg-slate-100 rounded-lg">
                  <button
                    onClick={() => {
                      setMatchMode("rule");
                      setAiMatchResults([]);
                      setAiRecommendation(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                      matchMode === "rule"
                        ? "bg-white text-navy-700 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    规则匹配
                  </button>
                  <button
                    onClick={() => {
                      setMatchMode("ai");
                      setAiMatchResults([]);
                      setAiRecommendation(null);
                    }}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                      matchMode === "ai"
                        ? "bg-white text-purple-700 shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    AI 智能匹配
                  </button>
                </div>

                {matchMode === "rule" ? (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">物料类型</label>
                      <select
                        value={matchForm.materialType}
                        onChange={(e) => setMatchForm({ ...matchForm, materialType: e.target.value })}
                        className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                      >
                        <option value="fabric">面料</option>
                        <option value="accessory">辅料</option>
                        <option value="factory">加工厂</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">最低评分</label>
                      <select
                        value={matchForm.minRating}
                        onChange={(e) => setMatchForm({ ...matchForm, minRating: e.target.value })}
                        className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                      >
                        <option value="0">不限</option>
                        <option value="3">3分以上</option>
                        <option value="4">4分以上</option>
                        <option value="4.5">4.5分以上</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 rounded-lg bg-purple-50 border border-purple-100">
                      <p className="text-xs text-purple-700">
                        AI 智能匹配基于款式需求（品类、面料、工艺、产地、预算）综合分析，推荐最合适的供应商并给出推荐理由。
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-700 mb-1.5 block">款式名称 *</label>
                        <Input
                          value={aiMatchForm.styleName}
                          onChange={(e) => setAiMatchForm({ ...aiMatchForm, styleName: e.target.value })}
                          placeholder="例如：春秋风衣外套"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 mb-1.5 block">品类</label>
                        <Input
                          value={aiMatchForm.category}
                          onChange={(e) => setAiMatchForm({ ...aiMatchForm, category: e.target.value })}
                          placeholder="例如：外套/风衣"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">面料需求</label>
                      <Input
                        value={aiMatchForm.material}
                        onChange={(e) => setAiMatchForm({ ...aiMatchForm, material: e.target.value })}
                        placeholder="例如：棉麻混纺，克重200g"
                        className="h-9"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">工艺要求</label>
                      <Input
                        value={aiMatchForm.processRequirements}
                        onChange={(e) => setAiMatchForm({ ...aiMatchForm, processRequirements: e.target.value })}
                        placeholder="例如：需要压胶拼接，防水处理"
                        className="h-9"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium text-slate-700 mb-1.5 block">期望产地</label>
                        <Input
                          value={aiMatchForm.location}
                          onChange={(e) => setAiMatchForm({ ...aiMatchForm, location: e.target.value })}
                          placeholder="例如：广州/江浙"
                          className="h-9"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-700 mb-1.5 block">预算</label>
                        <Input
                          value={aiMatchForm.budget}
                          onChange={(e) => setAiMatchForm({ ...aiMatchForm, budget: e.target.value })}
                          placeholder="例如：50元/件以内"
                          className="h-9"
                        />
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleAIMatch}
                  disabled={aiMatchLoading}
                  className={`w-full text-white ${
                    matchMode === "ai"
                      ? "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                      : "bg-navy-700 hover:bg-navy-800"
                  }`}
                >
                  {aiMatchLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {aiMatchLoading ? "匹配中..." : matchMode === "ai" ? "AI 智能匹配" : "开始匹配"}
                </Button>

                {/* AI 推荐文本结果 */}
                {aiRecommendation && (
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      <p className="text-sm font-semibold text-purple-900">AI 推荐分析</p>
                    </div>
                    <div className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                      {aiRecommendation}
                    </div>
                  </div>
                )}

                {aiMatchResults.length > 0 && (
                  <div className="space-y-3 pt-2 border-t">
                    <p className="text-sm font-medium">
                      {matchMode === "ai" ? "相关供应商" : "匹配结果"} ({aiMatchResults.length} 家)
                    </p>
                    {aiMatchResults.slice(0, 5).map((s: any) => (
                      <div
                        key={s.id}
                        className="p-3 rounded-xl border border-border hover:border-purple-200 cursor-pointer transition-all"
                        onClick={() => {
                          setShowAIMatch(false);
                          router.push(`/suppliers/${s.id}`);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">{s.name}</span>
                              {s.matchScore != null && (
                                <Badge variant="secondary" className="text-[10px]">
                                  匹配度 {s.matchScore}%
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {s.matchReason || s.specialties || s.type || "供应商"}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 text-amber-500">
                            <Star className="h-3 w-3 fill-current" />
                            <span className="text-xs font-medium">
                              {s.overallRating || s.overall_rating || s.qualityScore || "0"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
