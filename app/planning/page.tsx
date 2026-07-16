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
} from "lucide-react";

export default function PlanningPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [form, setForm] = useState({
    season: "",
    theme: "",
    category: "",
    targetCost: "",
    timeline: "",
  });

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
  }, []);

  const openAdd = () => {
    setEditingPlan(null);
    setForm({ season: "", theme: "", category: "", targetCost: "", timeline: "" });
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
                    {plan.timeline && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>{plan.timeline}</span>
                      </div>
                    )}
                  </div>

                  {plan.aiTrendAnalysis && (
                    <div className="mt-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="h-4 w-4 text-amber-500" />
                        <span className="text-xs font-medium text-amber-700">AI趋势分析</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-3">{plan.aiTrendAnalysis}</p>
                    </div>
                  )}

                  {plan.inspirationTags && plan.inspirationTags.length > 0 && (
                    <div className="mt-3">
                      <div className="flex flex-wrap gap-1">
                        {plan.inspirationTags.slice(0, 5).map((tag: string) => (
                          <Badge key={tag} variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                            {tag}
                          </Badge>
                        ))}
                      </div>
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
                    <Button size="sm" variant="secondary" className="flex-1 h-9" onClick={() => {}}>
                      <Palette className="h-3 w-3 mr-2" />
                      灵感收集
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
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
                  <Label className="text-xs">时间规划</Label>
                  <Input placeholder="如：8月上旬上市" value={form.timeline} onChange={(e) => setForm({ ...form, timeline: e.target.value })} />
                </div>
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
    </SidebarLayout>
  );
}
