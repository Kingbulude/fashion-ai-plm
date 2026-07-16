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
  Lightbulb,
  Zap,
  Brain,
  Rocket,
} from "lucide-react";

export default function PlanningPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [activeSkill, setActiveSkill] = useState<string>("");
  const [skillResults, setSkillResults] = useState<Record<string, any>>({});

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
  const [brandDna, setBrandDna] = useState<any>(null);

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

  const fetchBrandDna = async () => {
    try {
      const res = await fetch("/api/planning/ai/brand-dna");
      if (res.ok) {
        const data = await res.json();
        setBrandDna(data);
      }
    } catch {
      setBrandDna(null);
    }
  };

  useEffect(() => {
    fetchPlans();
    loadFabrics();
    loadColors();
    fetchBrandDna();
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

  const openAiGenerate = () => {
    setAiResult(null);
    setSkillResults({});
    setAiDialogOpen(true);
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

  const handleAiGenerate = async () => {
    setAiGenerating(true);
    setAiResult(null);
    try {
      const res = await fetch("/api/planning/ai/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: form.season || "2026AW",
          theme: form.theme || "极简都市系列",
          category: form.category || "全品类",
          targetCost: form.targetCost ? Number(form.targetCost) : 100,
        }),
      });

      if (!res.ok) throw new Error("AI生成失败");
      const data = await res.json();
      setAiResult(data);
      showToast("success", "AI企划生成成功");
      fetchPlans();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI生成失败";
      showToast("error", msg);
    } finally {
      setAiGenerating(false);
    }
  };

  const handleSkillCall = async (skillType: string, endpoint: string) => {
    setActiveSkill(skillType);
    try {
      const res = await fetch(`/api/planning/ai/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          season: form.season || "2026AW",
          category: form.category || "全品类",
          cost: form.targetCost ? Number(form.targetCost) : 100,
          brandPosition: "中高端",
        }),
      });

      if (!res.ok) throw new Error("AI分析失败");
      const data = await res.json();
      setSkillResults(prev => ({ ...prev, [skillType]: data }));
      showToast("success", "AI分析完成");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI分析失败";
      showToast("error", msg);
    } finally {
      setActiveSkill("");
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

  const aiSkills = [
    { id: "trend", label: "趋势预测", icon: BarChart3, endpoint: "trend-prediction", desc: "AI分析行业趋势，预测流行方向" },
    { id: "hot", label: "爆款识别", icon: Zap, endpoint: "hot-products", desc: "识别市场爆款，对标竞品" },
    { id: "color", label: "色彩推荐", icon: Palette, endpoint: "color-recommendation", desc: "基于趋势推荐配色方案" },
    { id: "fabric", label: "面料分析", icon: Wind, endpoint: "fabric-analysis", desc: "分析面料趋势，推荐材质" },
    { id: "pricing", label: "定价策略", icon: Target, endpoint: "pricing-strategy", desc: "智能定价，计算利润率" },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">企划中心</h1>
            <p className="text-muted-foreground">品牌基因库 · AI驱动企划 · 数据积累进化</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={openAiGenerate} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600">
              <Brain className="h-4 w-4 mr-2" />
              AI一键生成企划
            </Button>
            <Button onClick={openAdd}>
              <Plus className="h-4 w-4 mr-2" />
              手动创建
            </Button>
          </div>
        </div>

        {brandDna && (
          <Card className="mb-6 border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-4">
                <div className="p-2 rounded-lg bg-amber-100">
                  <Lightbulb className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">品牌基因：{brandDna.brand_name}</span>
                    <Badge variant="secondary" className="text-xs">AI支撑</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">目标客群：</span>
                      <span>{brandDna.target_audience}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">风格方向：</span>
                      <span>{brandDna.style_direction?.join("、")}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">定价定位：</span>
                      <span>{brandDna.price_position}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">核心价值：</span>
                      <span>{brandDna.core_values?.join("、")}</span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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

          <TabsContent value="product" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    企划列表
                  </CardTitle>
                  <CardDescription>季节波段、品类规划、目标成本、上市计划</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      加载中...
                    </div>
                  ) : plans.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Calendar className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">暂无企划计划</p>
                      <div className="flex gap-2 justify-center">
                        <Button onClick={openAiGenerate}>
                          <Brain className="h-4 w-4 mr-2" />
                          AI生成企划
                        </Button>
                        <Button variant="outline" onClick={openAdd}>
                          <Plus className="h-4 w-4 mr-2" />
                          手动创建
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {plans.map((plan) => (
                        <Card key={plan.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                          <CardContent className="p-5">
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <Badge className="bg-blue-50 text-blue-700 border-0">{plan.season}</Badge>
                                {plan.category && <Badge variant="outline" className="text-xs">{plan.category}</Badge>}
                                {plan.aiTrendAnalysis && <Badge className="bg-amber-50 text-amber-700 border-0"><Sparkles className="h-3 w-3 mr-1" />AI分析</Badge>}
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

                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              {plan.targetCost && (
                                <div className="flex items-center gap-2">
                                  <Target className="h-4 w-4 text-blue-500" />
                                  <span>成本：¥{plan.targetCost}</span>
                                </div>
                              )}
                              {plan.priceRange && (
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4 text-green-500" />
                                  <span>价格带：{plan.priceRange}</span>
                                </div>
                              )}
                              {plan.targetAudience && (
                                <div className="flex items-center gap-2">
                                  <Layers className="h-4 w-4 text-purple-500" />
                                  <span>客群：{plan.targetAudience}</span>
                                </div>
                              )}
                              {plan.timeline && (
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4 text-amber-500" />
                                  <span>{plan.timeline}</span>
                                </div>
                              )}
                            </div>

                            {plan.brandStory && (
                              <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs text-muted-foreground line-clamp-2">{plan.brandStory}</p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    AI企划助手
                  </CardTitle>
                  <CardDescription>选择AI Skill辅助企划决策</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {aiSkills.map((skill) => (
                    <Button
                      key={skill.id}
                      variant="outline"
                      className="w-full h-auto p-4 text-left"
                      onClick={() => handleSkillCall(skill.id, skill.endpoint)}
                      disabled={activeSkill === skill.id}
                    >
                      <div className="flex items-start gap-3">
                        <skill.icon className={`h-5 w-5 ${activeSkill === skill.id ? "text-amber-500 animate-pulse" : "text-slate-400"}`} />
                        <div className="flex-1">
                          <p className="font-medium text-sm">{skill.label}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{skill.desc}</p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            </div>

            {skillResults.trend && (
              <Card className="mt-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-amber-500" />
                    AI趋势预测结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {skillResults.trend.trends?.map((t: any, i: number) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{t.trend}</span>
                          <Badge variant="secondary" className="text-xs">置信度{t.confidence}%</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{t.description}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {skillResults.hot && (
              <Card className="mt-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    AI爆款识别结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-xs text-muted-foreground border-b">
                          <th className="text-left py-2 font-medium">爆款名称</th>
                          <th className="text-left py-2 font-medium">品类</th>
                          <th className="text-right py-2 font-medium">销量</th>
                          <th className="text-right py-2 font-medium">增长率</th>
                        </tr>
                      </thead>
                      <tbody>
                        {skillResults.hot.hotProducts?.map((p: any) => (
                          <tr key={p.id} className="text-sm border-b last:border-0">
                            <td className="py-2 font-medium">{p.name}</td>
                            <td className="py-2 text-muted-foreground">{p.category}</td>
                            <td className="py-2 text-right">{p.salesVolume.toLocaleString()}</td>
                            <td className="py-2 text-right text-green-600">{p.growthRate}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="design" className="mt-0">
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
                        <p className="text-xs text-muted-foreground">{plan.brandStory || "暂无设计描述"}</p>
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
                      >
                        <Palette className="h-6 w-6 text-slate-400" />
                      </div>
                    ))}
                  </div>
                  <Button variant="outline" className="w-full mt-4">
                    <Palette className="h-4 w-4 mr-2" />
                    打开灵感白板
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="fabric" className="mt-0">
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

            {skillResults.fabric && (
              <Card className="mt-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wind className="h-4 w-4 text-amber-500" />
                    AI面料分析结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {skillResults.fabric.fabricRecommendations?.map((f: any, i: number) => (
                      <div key={i} className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{f.name}</span>
                          <Badge variant="secondary" className="text-xs">{f.category}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{f.description}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{f.price}</span>
                          <Badge className={f.trendLevel === "上升" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}>
                            {f.trendLevel}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="color" className="mt-0">
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
                        <div className="w-12 h-12 rounded-lg shadow-inner" style={{ backgroundColor: c.hex || "#cccccc" }} />
                        <div>
                          <p className="font-medium text-sm">{c.name}</p>
                          <p className="text-xs text-muted-foreground">{c.hex}</p>
                        </div>
                        {c.season && <Badge variant="secondary" className="text-xs">{c.season}</Badge>}
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
                      <div className="w-10 h-10 rounded-lg border border-slate-200" style={{ backgroundColor: colorForm.hex || "#cccccc" }} />
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
                      {seasonOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <Button className="w-full" onClick={saveColor}>
                    保存颜色
                  </Button>
                </CardContent>
              </Card>
            </div>

            {skillResults.color && (
              <Card className="mt-6">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Palette className="h-4 w-4 text-amber-500" />
                    AI色彩推荐结果
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-4">
                    {skillResults.color.colorRecommendations?.map((c: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-4 bg-slate-50 rounded-lg">
                        <div className="w-16 h-16 rounded-lg shadow-inner" style={{ backgroundColor: c.hex }} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="fontfont-medium">{c.name}</span>
                            <Badge className={c.trendLevel === "上升" ? "bg-green-50 text-green-700" : "bg-slate-100 text-slate-600"}>
                              {c.trendLevel}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{c.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-muted-foreground">搭配：</span>
                            {c.combinations?.map((col: string, j: number) => (
                              <div key={j} className="w-6 h-6 rounded-full border border-slate-200" style={{ backgroundColor: col }} />
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="trend" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-amber-500" />
                    AI趋势预测
                  </CardTitle>
                  <CardDescription>分析行业趋势，预测流行方向</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {skillResults.trend?.trends?.map((t: any, i: number) => (
                      <div key={i} className="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{t.trend}</span>
                          <Badge className="bg-amber-100 text-amber-700">{t.confidence}%</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{t.description}</p>
                      </div>
                    ))}
                    {!skillResults.trend && (
                      <div className="text-center py-8">
                        <Button onClick={() => handleSkillCall("trend", "trend-prediction")}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          开始AI趋势分析
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    市场爆款监测
                  </CardTitle>
                  <CardDescription>识别市场爆款，对标竞品</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {skillResults.hot?.hotProducts?.map((p: any, i: number) => (
                      <div key={i} className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{p.name}</span>
                          <Badge className="bg-green-100 text-green-700">{p.growthRate}</Badge>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{p.category}</span>
                          <span>销量 {p.salesVolume.toLocaleString()}</span>
                        </div>
                      </div>
                    ))}
                    {!skillResults.hot && (
                      <div className="text-center py-8">
                        <Button onClick={() => handleSkillCall("hot", "hot-products")}>
                          <Zap className="h-4 w-4 mr-2" />
                          开始爆款识别
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4 text-amber-500" />
                    定价策略分析
                  </CardTitle>
                  <CardDescription>智能定价，计算利润率</CardDescription>
                </CardHeader>
                <CardContent>
                  {skillResults.pricing && (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <p className="text-sm text-muted-foreground">建议零售价</p>
                        <p className="text-3xl font-bold text-amber-600">¥{skillResults.pricing.suggestedPrice}</p>
                        <p className="text-xs text-muted-foreground">价格区间 ¥{skillResults.pricing.priceRange.min} - ¥{skillResults.pricing.priceRange.max}</p>
                      </div>
                      <div className="space-y-2">
                        {skillResults.pricing.pricingRecommendations?.map((s: any, i: number) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium text-sm">{s.strategy}</span>
                              <span className="text-sm">¥{s.price}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{s.rationale}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {!skillResults.pricing && (
                    <div className="text-center py-8">
                      <Button onClick={() => handleSkillCall("pricing", "pricing-strategy")}>
                        <Target className="h-4 w-4 mr-2" />
                        开始定价分析
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Brain className="h-4 w-4 text-amber-500" />
                    AI统筹企划
                  </CardTitle>
                  <CardDescription>整合所有AI Skill，生成完整企划方案</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full mb-4" onClick={openAiGenerate}>
                    <Rocket className="h-4 w-4 mr-2" />
                    一键生成完整企划方案
                  </Button>
                  <div className="p-4 bg-amber-50 rounded-lg">
                    <p className="text-sm text-amber-700">
                      AI统筹企划会调用趋势预测、爆款识别、色彩推荐、面料分析、定价策略等5个AI Skill，基于品牌基因库，生成完整的商品企划方案。
                    </p>
                  </div>
                </CardContent>
              </Card>
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
                    {seasonOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">品类</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    <option value="">请选择品类</option>
                    {categoryOptions.map((c) => <option key={c} value={c}>{c}</option>)}
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

        <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-amber-500" />
                AI一键生成企划方案
              </DialogTitle>
            </DialogHeader>

            {!aiResult ? (
              <div className="space-y-6">
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Lightbulb className="h-5 w-5 text-amber-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">AI企划助手将基于品牌基因库和市场数据，自动生成完整的商品企划方案。</p>
                        <p className="text-sm text-amber-700 mt-1">包括：趋势预测、爆款识别、色彩推荐、面料分析、定价策略五大AI Skill协同工作。</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="space-y-1">
                    <Label className="text-xs">季节</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.season} onChange={(e) => setForm({ ...form, season: e.target.value })}>
                      <option value="2026AW">2026AW 秋冬</option>
                      <option value="2026SS">2026SS 春夏</option>
                      <option value="2027SS">2027SS 春夏</option>
                      <option value="2027AW">2027AW 秋冬</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">品类</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                      <option value="全品类">全品类</option>
                      <option value="上衣">上衣</option>
                      <option value="裤装">裤装</option>
                      <option value="裙装">裙装</option>
                      <option value="外套">外套</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">企划主题</Label>
                    <Input placeholder="如：极简都市系列" value={form.theme} onChange={(e) => setForm({ ...form, theme: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">目标成本</Label>
                    <Input type="number" placeholder="100" value={form.targetCost} onChange={(e) => setForm({ ...form, targetCost: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">&nbsp;</Label>
                    <Button className="w-full" onClick={handleAiGenerate} disabled={aiGenerating}>
                      {aiGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Rocket className="h-4 w-4 mr-2" />}
                      生成企划
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {aiSkills.map((skill) => (
                    <Card key={skill.id} className="border-0 shadow-sm">
                      <CardContent className="p-4 text-center">
                        <skill.icon className="h-8 w-8 mx-auto mb-2 text-amber-500" />
                        <p className="font-medium text-sm">{skill.label}</p>
                        <p className="text-xs text-muted-foreground mt-1">{skill.desc}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                      <div>
                        <p className="font-medium text-amber-800">AI企划生成成功！</p>
                        <p className="text-sm text-amber-700 mt-1">整体置信度：{aiResult.overallConfidence}%</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">企划摘要</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm">{aiResult.executiveSummary}</pre>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-amber-500" />
                        趋势预测 ({aiResult.aiSkills.trendPrediction.confidence}%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiResult.aiSkills.trendPrediction.items.map((t: any, i: number) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg">
                            <span className="font-medium text-sm">{t.trend}</span>
                            <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Zap className="h-4 w-4 text-amber-500" />
                        爆款识别 ({aiResult.aiSkills.hotProducts.confidence}%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiResult.aiSkills.hotProducts.items.map((p: any, i: number) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{p.name}</span>
                              <Badge className="text-xs bg-green-100 text-green-700">{p.growthRate}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Palette className="h-4 w-4 text-amber-500" />
                        色彩推荐 ({aiResult.aiSkills.colorRecommendations.confidence}%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-3">
                        {aiResult.aiSkills.colorRecommendations.items.map((c: any, i: number) => (
                          <div key={i} className="flex items-center gap-2">
                            <div className="w-10 h-10 rounded-lg" style={{ backgroundColor: c.hex }} />
                            <span className="text-sm">{c.name}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Wind className="h-4 w-4 text-amber-500" />
                        面料建议 ({aiResult.aiSkills.fabricRecommendations.confidence}%)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiResult.aiSkills.fabricRecommendations.items.map((f: any, i: number) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-sm">{f.name}</span>
                              <span className="text-xs text-muted-foreground">{f.price}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setAiDialogOpen(false)}>关闭</Button>
                  <Button onClick={() => { setAiDialogOpen(false); fetchPlans(); }}>
                    查看企划列表
                  </Button>
                </DialogFooter>
              </div>
            )}
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