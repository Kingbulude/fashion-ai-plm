"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Edit,
  Trash2,
  Loader2,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Calendar,
  Palette,
  Target,
  Shapes,
  Wind,
  Droplets,
  BarChart3,
  Package,
  Layers,
} from "lucide-react";
import { InspirationBoard } from "@/components/planning/inspiration-board";

export default function PlanningPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false);
  const [boardPlanId, setBoardPlanId] = useState<string>("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    season: "",
    theme: "",
    category: "",
    targetCost: "",
    timeline: "",
    brandStory: "",
    targetAudience: "",
    priceRange: "",
  });

  const [fabricForm, setFabricForm] = useState({
    name: "",
    supplier: "",
    composition: "",
    price: "",
    usage: "",
    status: "pending",
  });

  const [colorForm, setColorForm] = useState({
    name: "",
    hex: "",
    usage: "",
    season: "",
  });

  const [fabrics, setFabrics] = useState<any[]>([]);
  const [colors, setColors] = useState<any[]>([]);

  const router = useRouter();

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/planning");
      if (!res.ok) throw new Error("获取失败");
      setPlans((await res.json()) || []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "获取失败";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    loadFabrics();
    loadColors();
  }, []);

  const loadFabrics = async () => {
    try {
      const res = await fetch("/api/fabrics");
      if (res.ok) setFabrics((await res.json()) || []);
    } catch {
      setFabrics([]);
    }
  };

  const loadColors = async () => {
    try {
      const res = await fetch("/api/colors");
      if (res.ok) setColors((await res.json()) || []);
    } catch {
      setColors([]);
    }
  };

  const openAdd = () => {
    setEditingPlan(null);
    setForm({ season: "", theme: "", category: "", targetCost: "", timeline: "", brandStory: "", targetAudience: "", priceRange: "" });
    setDialogOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingPlan(plan);
    setForm({
      season: plan.season,
      theme: plan.theme,
      category: plan.category || "",
      targetCost: plan.targetCost ? String(plan.targetCost) : "",
      timeline: plan.timeline || "",
      brandStory: plan.brandStory || "",
      targetAudience: plan.targetAudience || "",
      priceRange: plan.priceRange || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.season || !form.theme) {
      showToast("error", "季节和主题不能为空");
      return;
    }
    setSaving(true);
    try {
      const url = editingPlan ? `/api/planning/${editingPlan.id}` : "/api/planning";
      const method = editingPlan ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: form.season,
          theme: form.theme,
          category: form.category || null,
          targetCost: form.targetCost ? Number(form.targetCost) : null,
          timeline: form.timeline || null,
          brandStory: form.brandStory || null,
          targetAudience: form.targetAudience || null,
          priceRange: form.priceRange || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }

      showToast("success", editingPlan ? "企划更新成功" : "企划创建成功");
      setDialogOpen(false);
      fetchPlans();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定删除这条企划？")) return;
    try {
      const res = await fetch(`/api/planning/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("删除失败");
      showToast("success", "已删除");
      fetchPlans();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "删除失败";
      showToast("error", msg);
    }
  };

  const handleAnalyzeTrend = async (plan: any) => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/planning/${plan.id}/analyze-trend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ season: plan.season, theme: plan.theme }),
      });

      if (!res.ok) throw new Error("分析失败");
      const data = await res.json();
      showToast("success", "AI趋势分析完成");
      fetchPlans();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "分析失败";
      showToast("error", msg);
    } finally {
      setAnalyzing(false);
    }
  };

  const saveFabric = async () => {
    if (!fabricForm.name) {
      showToast("error", "面料名称不能为空");
      return;
    }
    try {
      const res = await fetch("/api/fabrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fabricForm),
      });
      if (!res.ok) throw new Error("保存失败");
      showToast("success", "面料添加成功");
      setFabricForm({ name: "", supplier: "", composition: "", price: "", usage: "", status: "pending" });
      loadFabrics();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "保存失败");
    }
  };

  const saveColor = async () => {
    if (!colorForm.name) {
      showToast("error", "颜色名称不能为空");
      return;
    }
    try {
      const res = await fetch("/api/colors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(colorForm),
      });
      if (!res.ok) throw new Error("保存失败");
      showToast("success", "颜色添加成功");
      setColorForm({ name: "", hex: "", usage: "", season: "" });
      loadColors();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "保存失败");
    }
  };

  const seasonOptions = ["2026SS", "2026AW", "2027SS", "2027AW"];
  const categoryOptions = ["上衣", "裤装", "裙装", "外套", "配饰", "全品类"];

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">企划中心</h1>
            <p className="text-muted-foreground">季节波段规划、灵感收集、AI趋势分析</p>
          </div>
        </div>

        <Tabs defaultValue="product" className="space-y-6">
          <TabsList className="w-full grid grid-cols-5">
            <TabsTrigger value="product" className="gap-2">
              <Package className="h-4 w-4" />
              <span className="hidden sm:inline">商品企划</span>
            </TabsTrigger>
            <TabsTrigger value="design" className="gap-2">
              <Shapes className="h-4 w-4" />
              <span className="hidden sm:inline">设计企划</span>
            </TabsTrigger>
            <TabsTrigger value="fabric" className="gap-2">
              <Wind className="h-4 w-4" />
              <span className="hidden sm:inline">面料企划</span>
            </TabsTrigger>
            <TabsTrigger value="color" className="gap-2">
              <Droplets className="h-4 w-4" />
              <span className="hidden sm:inline">色彩企划</span>
            </TabsTrigger>
            <TabsTrigger value="trend" className="gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">趋势预测</span>
            </TabsTrigger>
          </TabsList>

          {/* 商品企划 */}
          <TabsContent value="product" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">商品企划</h2>
                <p className="text-sm text-muted-foreground">季节波段、品类规划、目标成本、上市计划</p>
              </div>
              <Button onClick={openAdd}>
                <Plus className="h-4 w-4 mr-2" />
                新建企划
              </Button>
            </div>

            {loading ? (
              <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中...
              </div>
            ) : plans.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">暂无企划计划</p>
                <Button onClick={openAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  创建第一个企划
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {plans.map((plan) => (
                  <Card key={plan.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-50 text-blue-700 border-0">{plan.season}</Badge>
                          {plan.category && (
                            <Badge variant="outline" className="text-xs">{plan.category}</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-xs" onClick={() => openEdit(plan)} className="text-slate-500">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-xs" onClick={() => handleDelete(plan.id)} className="text-red-500">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <h3 className="font-semibold text-lg mb-3">{plan.theme}</h3>

                      <div className="space-y-2 text-sm text-muted-foreground">
                        {plan.targetCost && (
                          <div className="flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            <span>目标成本：¥{plan.targetCost}</span>
                          </div>
                        )}
                        {plan.priceRange && (
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4" />
                            <span>价格带：{plan.priceRange}</span>
                          </div>
                        )}
                        {plan.targetAudience && (
                          <div className="flex items-center gap-2">
                            <Layers className="h-4 w-4" />
                            <span>目标客群：{plan.targetAudience}</span>
                          </div>
                        )}
                        {plan.timeline && (
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            <span>{plan.timeline}</span>
                          </div>
                        )}
                      </div>

                      {plan.brandStory && (
                        <div className="mt-3 pt-3 border-t border-slate-100">
                          <p className="text-xs text-muted-foreground line-clamp-2">{plan.brandStory}</p>
                        </div>
                      )}

                      <div className="mt-4 flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 h-9"
                          onClick={() => handleAnalyzeTrend(plan)}
                          disabled={analyzing}
                        >
                          {analyzing ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                          AI分析趋势
                        </Button>
                        <Button size="sm" variant="secondary" className="flex-1 h-9" onClick={() => { setBoardPlanId(plan.id); setBoardOpen(true); }}>
                          <Palette className="h-3 w-3 mr-2" />
                          灵感收集
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* 设计企划 */}
          <TabsContent value="design" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">设计企划</h2>
                <p className="text-sm text-muted-foreground">主题概念、设计方向、灵感收集、设计规范</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Shapes className="h-4 w-4" />
                    当前企划设计方向
                  </CardTitle>
                  <CardDescription>查看各企划的设计主题和方向</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {plans.slice(0, 5).map((plan) => (
                      <div key={plan.id} className="p-3 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-sm">{plan.theme}</span>
                          <Badge variant="secondary" className="text-xs">{plan.season}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {plan.brandStory || "暂无设计描述"}
                        </p>
                      </div>
                    ))}
                    {plans.length === 0 && (
                      <p className="text-center text-muted-foreground py-4">暂无设计企划</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    灵感收集
                  </CardTitle>
                  <CardDescription>收集和管理设计灵感素材</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                      <div
                        key={i}
                        className="aspect-square rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center cursor-pointer hover:opacity-80 transition"
                        onClick={() => setBoardOpen(true)}
                      >
                        <Palette className="h-6 w-6 text-slate-400" />
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4" onClick={() => setBoardOpen(true)}>
                    <Palette className="h-4 w-4 mr-2" />
                    打开灵感白板
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 面料企划 */}
          <TabsContent value="fabric" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">面料企划</h2>
                <p className="text-sm text-muted-foreground">面料趋势、供应商对接、样品确认、成本预估</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wind className="h-4 w-4" />
                    面料库
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b">
                          <th className="text-left py-2 font-medium">面料名称</th>
                          <th className="text-left py-2 font-medium">供应商</th>
                          <th className="text-left py-2 font-medium">成分</th>
                          <th className="text-right py-2 font-medium">单价</th>
                          <th className="text-center py-2 font-medium">状态</th>
                        </tr>
                      </thead>
                      <tbody>
                        {fabrics.map((f) => (
                          <tr key={f.id} className="text-sm border-b last:border-0">
                            <td className="py-2 font-medium">{f.name}</td>
                            <td className="py-2 text-muted-foreground">{f.supplier}</td>
                            <td className="py-2 text-muted-foreground">{f.composition}</td>
                            <td className="py-2 text-right">¥{f.price}</td>
                            <td className="py-2 text-center">
                              <Badge variant={f.status === "confirmed" ? "default" : "outline"} className="text-xs">
                                {f.status === "confirmed" ? "已确认" : f.status === "pending" ? "待确认" : "样品中"}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {fabrics.length === 0 && (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-muted-foreground">暂无面料数据</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    添加面料
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">面料名称 *</Label>
                    <Input placeholder="如：双面呢" value={fabricForm.name} onChange={(e) => setFabricForm({ ...fabricForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">供应商</Label>
                    <Input placeholder="供应商名称" value={fabricForm.supplier} onChange={(e) => setFabricForm({ ...fabricForm, supplier: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">成分</Label>
                    <Input placeholder="如：羊毛80% 涤纶20%" value={fabricForm.composition} onChange={(e) => setFabricForm({ ...fabricForm, composition: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">单价</Label>
                      <Input type="number" placeholder="¥" value={fabricForm.price} onChange={(e) => setFabricForm({ ...fabricForm, price: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">用途</Label>
                      <Input placeholder="如：大衣" value={fabricForm.usage} onChange={(e) => setFabricForm({ ...fabricForm, usage: e.target.value })} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={saveFabric}>
                    保存面料
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 色彩企划 */}
          <TabsContent value="color" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">色彩企划</h2>
                <p className="text-sm text-muted-foreground">色彩方案、流行色预测、配色搭配、色卡管理</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Droplets className="h-4 w-4" />
                    色卡管理
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {colors.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                        <div
                          className="w-12 h-12 rounded-lg shadow-inner"
                          style={{ backgroundColor: c.hex || "#cccccc" }}
                        />
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.hex}</p>
                        </div>
                        {c.season && (
                          <Badge variant="secondary" className="text-xs">{c.season}</Badge>
                        )}
                      </div>
                    ))}
                    {colors.length === 0 && (
                      <p className="w-full text-center text-muted-foreground py-8">暂无色彩数据</p>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    添加颜色
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">颜色名称 *</Label>
                    <Input placeholder="如：雾霾蓝" value={colorForm.name} onChange={(e) => setColorForm({ ...colorForm, name: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">色值 (Hex)</Label>
                    <div className="flex gap-2">
                      <Input placeholder="#000000" value={colorForm.hex} onChange={(e) => setColorForm({ ...colorForm, hex: e.target.value })} />
                      <div
                        className="w-10 h-10 rounded-lg border border-slate-200"
                        style={{ backgroundColor: colorForm.hex || "#cccccc" }}
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">用途</Label>
                    <Input placeholder="如：主色调" value={colorForm.usage} onChange={(e) => setColorForm({ ...colorForm, usage: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">适用季节</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={colorForm.season} onChange={(e) => setColorForm({ ...colorForm, season: e.target.value })}>
                      <option value="">请选择季节</option>
                      {seasonOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <Button className="w-full" onClick={saveColor}>
                    保存颜色
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 趋势预测 */}
          <TabsContent value="trend" className="mt-0">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">趋势预测</h2>
                <p className="text-sm text-muted-foreground">AI趋势分析、竞品分析、市场洞察</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id}>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        {plan.theme} ({plan.season})
                      </CardTitle>
                      {!plan.aiTrendAnalysis && (
                        <Button size="sm" variant="outline" onClick={() => handleAnalyzeTrend(plan)} disabled={analyzing}>
                          {analyzing ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <Sparkles className="h-3 w-3 mr-2" />}
                          AI分析
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {plan.aiTrendAnalysis ? (
                      <div className="prose prose-sm max-w-none">
                        <p className="text-muted-foreground whitespace-pre-line">{plan.aiTrendAnalysis}</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>点击上方按钮获取AI趋势分析</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
              {plans.length === 0 && (
                <div className="lg:col-span-2 text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <BarChart3 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无企划，无法进行趋势分析</p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "编辑企划" : "新建企划"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">季节 *</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })}>
                    <option value="">请选择季节</option>
                    {seasonOptions.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">品类</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">请选择品类</option>
                    {categoryOptions.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">主题 *</Label>
                <Input placeholder="如：极简都市系列" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">目标成本</Label>
                  <Input type="number" placeholder="目标成本" value={form.targetCost} onChange={(e) => setForm({ ...form, targetCost: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">价格带</Label>
                  <Input placeholder="如：¥299-499" value={form.priceRange} onChange={(e) => setForm({ ...form, priceRange: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">目标客群</Label>
                <Input placeholder="如：25-35岁职场女性" value={form.targetAudience} onChange={(e) => setForm({ ...form, targetAudience: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">品牌故事</Label>
                <textarea className="h-16 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" placeholder="描述品牌故事和设计理念" value={form.brandStory} onChange={(e) => setForm({ ...form, brandStory: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">时间规划</Label>
                <Input placeholder="如：8月上旬上市" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
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

        <Dialog open={boardOpen} onOpenChange={setBoardOpen}>
          <DialogContent className="sm:max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>灵感白板</DialogTitle>
            </DialogHeader>
            {boardPlanId && <InspirationBoard planId={boardPlanId} />}
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
    </SidebarLayout>
  );
}