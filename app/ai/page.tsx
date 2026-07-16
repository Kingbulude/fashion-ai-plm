"use client";

import { useState } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  TrendingUp,
  Users,
  Loader2,
  CheckCircle,
  AlertCircle,
  Wand2,
  Target,
  Factory,
} from "lucide-react";

export default function AiPage() {
  const [activeTab, setActiveTab] = useState<"style-test" | "sales-prediction" | "supplier-match">("style-test");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const [styleTestForm, setStyleTestForm] = useState({
    styleName: "",
    category: "",
    price: "",
    season: "",
    targetAudience: "",
    designFeatures: "",
  });

  const [salesForm, setSalesForm] = useState({
    styleName: "",
    category: "",
    price: "",
    season: "",
    targetAudience: "",
    initialStock: "",
  });

  const [supplierForm, setSupplierForm] = useState({
    styleName: "",
    category: "",
    material: "",
    processRequirements: "",
    location: "",
    budget: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const handleStyleTest = async () => {
    if (!styleTestForm.styleName || !styleTestForm.category) {
      showToast("error", "款式名称和品类不能为空");
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai/style-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(styleTestForm),
      });
      if (!res.ok) throw new Error("分析失败");
      const data = await res.json();
      setResult(data.analysis);
      showToast("success", "AI测款分析完成");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "分析失败";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSalesPrediction = async () => {
    if (!salesForm.styleName || !salesForm.category) {
      showToast("error", "款式名称和品类不能为空");
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai/sales-prediction", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(salesForm),
      });
      if (!res.ok) throw new Error("预估失败");
      const data = await res.json();
      setResult(data.prediction);
      showToast("success", "销量预估完成");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "预估失败";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSupplierMatch = async () => {
    if (!supplierForm.styleName || !supplierForm.category) {
      showToast("error", "款式名称和品类不能为空");
      return;
    }
    setLoading(true);
    setResult("");
    try {
      const res = await fetch("/api/ai/supplier-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(supplierForm),
      });
      if (!res.ok) throw new Error("匹配失败");
      const data = await res.json();
      setResult(data.recommendation);
      showToast("success", "供应商匹配完成");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "匹配失败";
      showToast("error", msg);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: "style-test", label: "AI测款", icon: Wand2 },
    { id: "sales-prediction", label: "销量预估", icon: TrendingUp },
    { id: "supplier-match", label: "供应商匹配", icon: Factory },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">AI智能分析</h1>
            <p className="text-muted-foreground">AI测款、销量预估、供应商智能匹配</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex border-b border-slate-100 mb-4">
                  {tabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as any);
                        setResult("");
                      }}
                      className={`flex-1 py-2 px-3 text-sm font-medium transition-colors ${
                        activeTab === tab.id
                          ? "text-blue-600 border-b-2 border-blue-600"
                          : "text-muted-foreground hover:text-slate-700"
                      }`}
                    >
                      <tab.icon className="h-4 w-4 mr-2 inline" />
                      {tab.label}
                    </button>
                  ))}
                </div>

                {activeTab === "style-test" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">款式名称 *</Label>
                      <Input placeholder="输入款式名称" value={styleTestForm.styleName} onChange={(e) => setStyleTestForm({ ...styleTestForm, styleName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">品类 *</Label>
                      <Input placeholder="如：连衣裙、T恤" value={styleTestForm.category} onChange={(e) => setStyleTestForm({ ...styleTestForm, category: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">价格</Label>
                      <Input type="number" placeholder="预估售价" value={styleTestForm.price} onChange={(e) => setStyleTestForm({ ...styleTestForm, price: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">季节</Label>
                      <Input placeholder="如：2026SS" value={styleTestForm.season} onChange={(e) => setStyleTestForm({ ...styleTestForm, season: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">目标人群</Label>
                      <Input placeholder="如：25-35岁女性" value={styleTestForm.targetAudience} onChange={(e) => setStyleTestForm({ ...styleTestForm, targetAudience: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">设计特点</Label>
                      <textarea className="h-20 w-full rounded-md border border-input bg-background px-2 text-sm" placeholder="描述款式设计特点" value={styleTestForm.designFeatures} onChange={(e) => setStyleTestForm({ ...styleTestForm, designFeatures: e.target.value })} />
                    </div>
                    <Button className="w-full mt-4" onClick={handleStyleTest} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                      开始AI测款
                    </Button>
                  </div>
                )}

                {activeTab === "sales-prediction" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">款式名称 *</Label>
                      <Input placeholder="输入款式名称" value={salesForm.styleName} onChange={(e) => setSalesForm({ ...salesForm, styleName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">品类 *</Label>
                      <Input placeholder="如：连衣裙、T恤" value={salesForm.category} onChange={(e) => setSalesForm({ ...salesForm, category: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">价格</Label>
                      <Input type="number" placeholder="预估售价" value={salesForm.price} onChange={(e) => setSalesForm({ ...salesForm, price: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">季节</Label>
                      <Input placeholder="如：2026SS" value={salesForm.season} onChange={(e) => setSalesForm({ ...salesForm, season: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">目标人群</Label>
                      <Input placeholder="如：25-35岁女性" value={salesForm.targetAudience} onChange={(e) => setSalesForm({ ...salesForm, targetAudience: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">初始库存</Label>
                      <Input type="number" placeholder="计划生产数量" value={salesForm.initialStock} onChange={(e) => setSalesForm({ ...salesForm, initialStock: e.target.value })} />
                    </div>
                    <Button className="w-full mt-4" onClick={handleSalesPrediction} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <TrendingUp className="h-4 w-4 mr-2" />}
                      开始销量预估
                    </Button>
                  </div>
                )}

                {activeTab === "supplier-match" && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label className="text-xs">款式名称 *</Label>
                      <Input placeholder="输入款式名称" value={supplierForm.styleName} onChange={(e) => setSupplierForm({ ...supplierForm, styleName: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">品类 *</Label>
                      <Input placeholder="如：连衣裙、T恤" value={supplierForm.category} onChange={(e) => setSupplierForm({ ...supplierForm, category: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">面料</Label>
                      <Input placeholder="如：棉、涤纶、真丝" value={supplierForm.material} onChange={(e) => setSupplierForm({ ...supplierForm, material: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">工艺要求</Label>
                      <Input placeholder="如：印花、刺绣" value={supplierForm.processRequirements} onChange={(e) => setSupplierForm({ ...supplierForm, processRequirements: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">期望产地</Label>
                      <Input placeholder="如：广州、杭州" value={supplierForm.location} onChange={(e) => setSupplierForm({ ...supplierForm, location: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">预算</Label>
                      <Input placeholder="如：50元/件" value={supplierForm.budget} onChange={(e) => setSupplierForm({ ...supplierForm, budget: e.target.value })} />
                    </div>
                    <Button className="w-full mt-4" onClick={handleSupplierMatch} disabled={loading}>
                      {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Factory className="h-4 w-4 mr-2" />}
                      智能匹配供应商
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm h-full">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Badge className="bg-amber-50 text-amber-700 border-0">AI分析结果</Badge>
                </div>
                <CardTitle className="text-lg">{activeTab === "style-test" ? "测款分析报告" : activeTab === "sales-prediction" ? "销量预估报告" : "供应商匹配推荐"}</CardTitle>
                <CardDescription>基于AI模型的专业分析建议</CardDescription>
              </CardHeader>
              <CardContent className="min-h-[400px]">
                {loading ? (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <Loader2 className="h-8 w-8 animate-spin mb-4 text-blue-500" />
                    <p className="text-sm">AI正在分析中...</p>
                  </div>
                ) : result ? (
                  <div className="bg-slate-50 rounded-lg p-6">
                    <pre className="whitespace-pre-wrap text-sm text-slate-700 font-sans">{result}</pre>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-[400px] text-muted-foreground">
                    <div className={`h-16 w-16 rounded-full flex items-center justify-center mb-4 ${activeTab === "style-test" ? "bg-blue-100" : activeTab === "sales-prediction" ? "bg-green-100" : "bg-purple-100"}`}>
                      {activeTab === "style-test" ? <Wand2 className="h-8 w-8 text-blue-600" /> : activeTab === "sales-prediction" ? <TrendingUp className="h-8 w-8 text-green-600" /> : <Factory className="h-8 w-8 text-purple-600" />}
                    </div>
                    <p className="text-sm mb-2">输入款式信息开始分析</p>
                    <p className="text-xs">AI将基于市场数据和趋势提供专业建议</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

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
