"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AssetUploadDialog } from "@/components/styles/asset-upload-dialog";
import { TechPackForm } from "@/components/styles/tech-pack-form";
import { BomItemForm } from "@/components/styles/bom-item-form";
import { SamplingForm } from "@/components/styles/sampling-form";
import { QcRecordForm } from "@/components/styles/qc-record-form";
import { ProcurementForm } from "@/components/styles/procurement-form";
import { ProductionForm } from "@/components/styles/production-form";
import { InventoryForm } from "@/components/styles/inventory-form";
import {
  ArrowLeft,
  Edit,
  Trash2,
  Upload,
  Image as ImageIcon,
  FileText,
  Package,
  CheckCircle,
  Shirt,
  Tag,
  Palette,
  DollarSign,
  Sparkles,
  Loader2,
  LayoutDashboard,
  ShoppingCart,
  ShieldAlert,
  ListTodo,
} from "lucide-react";
import { StyleOverview } from "@/components/styles/style-overview";
import { StyleStateFlow } from "@/components/styles/style-state-flow";
import { StyleSalesTab } from "@/components/styles/sales-tab";
import { StyleAfterSalesTab } from "@/components/styles/aftersales-tab";
import { StyleTodos } from "@/components/styles/style-todos";

export const runtime = "edge";

export default function StyleDetailPage() {
  const [style, setStyle] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadDefaultType, setUploadDefaultType] = useState<"inspiration" | "design" | "ai_derivative" | "3d_sample">("design");
  const [analyzingAssetId, setAnalyzingAssetId] = useState<string | null>(null);
  const [globalAnalyzing, setGlobalAnalyzing] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  useEffect(() => {
    fetchStyle();
    fetchAssets();
  }, [id]);

  const fetchStyle = async () => {
    try {
      const response = await fetch(`/api/styles/${id}`);
      if (!response.ok) throw new Error("获取款式信息失败");
      const data = await response.json();
      setStyle(data);
      // 加载可用状态转换
      fetchTransitions();
    } catch (err) {
      setError("获取款式信息失败");
    }
    setLoading(false);
  };

  const [transitions, setTransitions] = useState<any[]>([]);
  const [completion, setCompletion] = useState<any>({});

  const fetchTransitions = async () => {
    try {
      const res = await fetch(`/api/styles/${id}/transitions`);
      if (res.ok) {
        const data = await res.json();
        setTransitions(data.available || []);
        setCompletion(data.completion || {});
      }
    } catch {}
  };

  const handleTransition = async (toStatus: string, event: string) => {
    try {
      const res = await fetch(`/api/styles/${id}/transitions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, event }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "转换失败");
      showToast("success", `状态已推进到「${toStatus}」`);
      fetchStyle();
      fetchTransitions();
    } catch (err: any) {
      showToast("error", err.message || "转换失败");
      throw err; // 让 StateFlow 组件能捕获
    }
  };

  const fetchAssets = async () => {
    try {
      const response = await fetch(`/api/styles/${id}/assets`);
      if (!response.ok) throw new Error("获取设计资产失败");
      const data = await response.json();
      setAssets(data);
    } catch (err) {
      console.error("Failed to fetch assets");
    }
  };

  const handleDelete = async () => {
    if (!confirm("确定要删除这个款式吗？")) return;
    
    try {
      const response = await fetch(`/api/styles/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("删除失败");
      router.push("/dashboard");
    } catch (err) {
      setError("删除失败");
    }
  };

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  };

  const openUpload = (type: "inspiration" | "design" | "ai_derivative" | "3d_sample" = "design") => {
    setUploadDefaultType(type);
    setUploadOpen(true);
  };

  const handleUploaded = () => {
    fetchAssets();
  };

  const handleAnalyzed = () => {
    fetchStyle();
    fetchAssets();
  };

  // BOM 或工艺包更新后刷新款式信息（同步实际成本）
  const handleCostUpdated = () => {
    fetchStyle();
  };

  // 对单个资产触发 AI 分析
  const handleAnalyzeAsset = async (assetId: string) => {
    setAnalyzingAssetId(assetId);
    try {
      const res = await fetch(`/api/styles/${id}/analyze-design`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "AI 分析失败");
      }
      const result = await res.json();
      showToast("success", `AI 分析完成，提取到 ${result.tags?.length || 0} 个标签，${result.colors?.length || 0} 种色彩`);
      fetchStyle();
      fetchAssets();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI 分析失败";
      showToast("error", msg);
    } finally {
      setAnalyzingAssetId(null);
    }
  };

  // 一键分析最新设计稿
  const handleAnalyzeLatest = async () => {
    setGlobalAnalyzing(true);
    try {
      const res = await fetch(`/api/styles/${id}/analyze-design`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "AI 分析失败");
      }
      const result = await res.json();
      showToast("success", `AI 分析完成，提取到 ${result.tags?.length || 0} 个标签，${result.colors?.length || 0} 种色彩`);
      fetchStyle();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI 分析失败";
      showToast("error", msg);
    } finally {
      setGlobalAnalyzing(false);
    }
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    planning: { label: "企划中", color: "text-slate-700", bg: "bg-slate-100" },
    designing: { label: "设计中", color: "text-blue-700", bg: "bg-blue-100" },
    designed: { label: "设计定稿", color: "text-indigo-700", bg: "bg-indigo-100" },
    sampling: { label: "打样中", color: "text-amber-700", bg: "bg-amber-100" },
    sampled: { label: "封样完成", color: "text-yellow-700", bg: "bg-yellow-100" },
    producing: { label: "大货生产", color: "text-green-700", bg: "bg-green-100" },
    produced: { label: "大货完成", color: "text-emerald-700", bg: "bg-emerald-100" },
    selling: { label: "销售中", color: "text-purple-700", bg: "bg-purple-100" },
    sold: { label: "销售结束", color: "text-gray-700", bg: "bg-gray-100" },
    reviewing: { label: "复盘中", color: "text-pink-700", bg: "bg-pink-100" },
    archived: { label: "已归档", color: "text-slate-500", bg: "bg-slate-100" },
  };

  const assetTypeLabels: Record<string, string> = {
    inspiration: "灵感图",
    design: "设计稿",
    ai_derivative: "AI衍生",
    "3d_sample": "3D样衣",
  };

  const infoItems = [
    { label: "款号", value: style?.styleNo, icon: Tag },
    { label: "名称", value: style?.name, icon: Shirt },
    { label: "季节", value: style?.season || "-", icon: Palette },
    { label: "品类", value: style?.category || "-", icon: Shirt },
    { label: "目标成本", value: style?.targetCost ? `¥${style.targetCost}` : "-", icon: DollarSign },
    { label: "实际成本", value: style?.actualCost ? `¥${style.actualCost}` : "-", icon: DollarSign },
  ];

  if (loading) {
    return (
      <SidebarLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">加载中...</div>
        </div>
      </SidebarLayout>
    );
  }

  if (error || !style) {
    return (
      <SidebarLayout>
        <div className="p-6">
          <Alert variant="destructive">
            <AlertDescription>{error || "款式不存在"}</AlertDescription>
          </Alert>
        </div>
      </SidebarLayout>
    );
  }

  const status = statusConfig[style.status] || statusConfig.planning;

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex items-center gap-3 flex-1">
            <Button variant="ghost" size="icon" onClick={() => router.back()} className="flex-shrink-0">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <div className="flex items-center gap-3 mb-1 flex-wrap">
                <h1 className="text-xl lg:text-2xl font-bold truncate">{style.name}</h1>
                <Badge variant="secondary" className={`${status.bg} ${status.color} border-0`}>
                  {status.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {style.styleNo} · {style.category || "未分类"} · {style.seasonId || "-"}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 md:pl-4">
            <Button variant="outline" size="sm" onClick={() => {}}>
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-600 hover:bg-red-50" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        </div>

        {/* 状态机可视化 - 始终可见 */}
        <div className="mb-6">
          <StyleStateFlow
            styleId={id}
            currentStatus={style.status}
            availableTransitions={transitions}
            completion={completion}
            onTransition={handleTransition}
          />
        </div>

        <Tabs defaultValue="overview" className="w-full">
          <div className="overflow-x-auto pb-2 mb-4 -mx-1 px-1">
            <TabsList className="h-11 p-1 w-max min-w-full">
              <TabsTrigger value="overview" className="h-9 px-4">
                <LayoutDashboard className="h-3.5 w-3.5 mr-1.5" />
                作战室
              </TabsTrigger>
              <TabsTrigger value="todos" className="h-9 px-4">
                <ListTodo className="h-3.5 w-3.5 mr-1.5" />
                待办
              </TabsTrigger>
              <TabsTrigger value="info" className="h-9 px-4">基本信息</TabsTrigger>
              <TabsTrigger value="assets" className="h-9 px-4">设计资产</TabsTrigger>
              <TabsTrigger value="techpack" className="h-9 px-4">工艺包</TabsTrigger>
              <TabsTrigger value="bom" className="h-9 px-4">BOM清单</TabsTrigger>
              <TabsTrigger value="sampling" className="h-9 px-4">打样</TabsTrigger>
              <TabsTrigger value="qc" className="h-9 px-4">质检</TabsTrigger>
              <TabsTrigger value="procurement" className="h-9 px-4">采购</TabsTrigger>
              <TabsTrigger value="production" className="h-9 px-4">生产</TabsTrigger>
              <TabsTrigger value="inventory" className="h-9 px-4">库存</TabsTrigger>
              <TabsTrigger value="sales" className="h-9 px-4">
                <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
                销售
              </TabsTrigger>
              <TabsTrigger value="aftersales" className="h-9 px-4">
                <ShieldAlert className="h-3.5 w-3.5 mr-1.5" />
                售后
              </TabsTrigger>
            </TabsList>
          </div>

          {/* 作战室概览 Tab */}
          <TabsContent value="overview" className="mt-0">
            <StyleOverview
              styleId={id}
              style={style}
              onNavigate={(tab) => {
                const element = document.querySelector(`[data-state="inactive"][value="${tab}"]`) as HTMLElement;
                element?.click();
              }}
              transitions={transitions}
              completion={completion}
              onTransition={handleTransition}
            />
          </TabsContent>

          {/* 待办 Tab */}
          <TabsContent value="todos" className="mt-0">
            <StyleTodos styleId={id} />
          </TabsContent>

          <TabsContent value="info" className="mt-0">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              <div className="xl:col-span-2 space-y-6">
                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <FileText className="h-4 w-4 text-navy-700" />
                      款式档案
                    </CardTitle>
                    <CardDescription>款式的基本信息和描述</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                      {infoItems.map((item, i) => (
                        <div key={i} className="space-y-1.5 p-3 rounded-lg bg-sand-50/50 border border-sand-100">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <item.icon className="h-3.5 w-3.5 text-navy-600" />
                            {item.label}
                          </p>
                          <p className="font-semibold text-sm text-foreground">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-6 pt-5 border-t">
                      <p className="text-xs text-muted-foreground mb-2">设计描述</p>
                      <p className="text-sm leading-relaxed text-foreground">
                        {style.description || "暂无描述"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {(style.aiTags?.length > 0 || style.aiColorPalette?.length > 0) && (
                  <Card className="card-premium">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-navy-700" />
                        AI 分析结果
                      </CardTitle>
                      <CardDescription>由 AI 自动提取的标签和色彩</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {style.aiTags?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2.5">AI标签</p>
                          <div className="flex flex-wrap gap-2">
                            {style.aiTags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="bg-navy-50 text-navy-700 hover:bg-navy-100 px-2.5 py-0.5">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {style.aiColorPalette?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2.5">AI提取色彩</p>
                          <div className="flex flex-wrap gap-2">
                            {style.aiColorPalette.map((color: string) => (
                              <Badge key={color} variant="outline" className="gap-2 px-2.5 py-0.5">
                                <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: color }} />
                                {color}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              <div className="space-y-6">
                <Card className="card-premium">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">状态进度</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {Object.entries(statusConfig).slice(0, 6).map(([key, val]) => {
                        const statusKeys = Object.keys(statusConfig).slice(0, 6);
                        const currentIndex = statusKeys.indexOf(style.status);
                        const keyIndex = statusKeys.indexOf(key);
                        const isCurrent = style.status === key;
                        const isCompleted = keyIndex < currentIndex && currentIndex !== -1;
                        return (
                          <div key={key} className="flex items-center gap-3">
                            <div className={`w-2.5 h-2.5 rounded-full ${isCurrent ? "bg-navy-600 ring-4 ring-navy-100" : isCompleted ? "bg-emerald-500" : "bg-slate-200"}`} />
                            <span className={`text-sm ${isCurrent ? "font-semibold text-foreground" : isCompleted ? "text-foreground" : "text-muted-foreground"}`}>
                              {val.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>

                <Card className="card-premium bg-gradient-to-br from-navy-50 to-indigo-50 border-navy-100">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center shadow-premium">
                        <Palette className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-sm">AI 设计分析</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                      上传设计稿，AI 将自动提取色彩、风格、元素等标签
                    </p>
                    {style.aiTags?.length > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-white/70 hover:bg-white border-navy-200 text-navy-700 hover:text-navy-800"
                        onClick={handleAnalyzeLatest}
                        disabled={globalAnalyzing}
                      >
                        {globalAnalyzing ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="h-4 w-4 mr-2" />
                        )}
                        {globalAnalyzing ? "AI 分析中..." : "重新分析最新设计稿"}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-white/70 hover:bg-white border-navy-200 text-navy-700 hover:text-navy-800"
                        onClick={() => openUpload("design")}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        上传设计稿
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="assets" className="mt-0">
            <Card className="card-premium">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ImageIcon className="h-4 w-4 text-navy-700" />
                      设计资产
                    </CardTitle>
                    <CardDescription>款式相关的设计稿、灵感图等资产</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => openUpload()} className="bg-navy-700 hover:bg-navy-800 text-white w-full sm:w-auto">
                    <Upload className="h-4 w-4 mr-2" />
                    上传资产
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {assets.length === 0 ? (
                  <div className="text-center py-16 bg-sand-50 rounded-xl border border-dashed border-border">
                    <ImageIcon className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm mb-4">暂无设计资产</p>
                    <Button size="sm" onClick={() => openUpload()} className="bg-navy-700 hover:bg-navy-800 text-white">
                      <Upload className="h-4 w-4 mr-2" />
                      上传第一个资产
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="group card-premium overflow-hidden hover:shadow-premium transition-all cursor-pointer bg-card"
                      >
                        <div className="aspect-[4/3] bg-sand-100 flex items-center justify-center relative overflow-hidden">
                          {asset.thumbnailUrl ? (
                            <img
                              src={asset.thumbnailUrl}
                              alt={asset.fileName}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                          ) : (
                            <FileText className="h-10 w-10 text-muted-foreground/40" />
                          )}
                          {asset.isActive && (
                            <div className="absolute top-2.5 right-2.5 bg-emerald-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1 shadow-sm">
                              <CheckCircle className="h-3 w-3" />
                              当前
                            </div>
                          )}
                        </div>
                        <div className="p-4">
                          <p className="font-semibold text-sm text-foreground truncate">{asset.fileName}</p>
                          <div className="flex items-center justify-between mt-2 mb-3">
                            <Badge variant="secondary" className="text-xs bg-sand-100 text-slate-700">
                              {assetTypeLabels[asset.type] || asset.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">v{asset.version}</span>
                          </div>
                          {asset.type === "design" && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs border-navy-200 text-navy-700 hover:bg-navy-50 hover:text-navy-800"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAnalyzeAsset(asset.id);
                              }}
                              disabled={analyzingAssetId === asset.id}
                            >
                              {analyzingAssetId === asset.id ? (
                                <>
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  分析中
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-3 w-3 mr-1" />
                                  {asset.aiTags ? "重新 AI 分析" : "AI 分析"}
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="techpack" className="mt-0">
            <TechPackForm
              styleId={id}
              styleName={style.name}
              styleDescription={style.description}
              onCostUpdated={handleCostUpdated}
            />
          </TabsContent>

          <TabsContent value="bom" className="mt-0">
            <BomItemForm
              styleId={id}
              targetCost={style.targetCost}
              onCostUpdated={handleCostUpdated}
            />
          </TabsContent>

          <TabsContent value="sampling" className="mt-0">
            <SamplingForm styleId={id} />
          </TabsContent>

          <TabsContent value="qc" className="mt-0">
            <QcRecordForm styleId={id} />
          </TabsContent>

          <TabsContent value="procurement" className="mt-0">
            <ProcurementForm styleId={id} />
          </TabsContent>

          <TabsContent value="production" className="mt-0">
            <ProductionForm styleId={id} />
          </TabsContent>

          <TabsContent value="inventory" className="mt-0">
            <InventoryForm styleId={id} />
          </TabsContent>

          <TabsContent value="sales" className="mt-0">
            <StyleSalesTab styleId={id} styleName={style.name} />
          </TabsContent>

          <TabsContent value="aftersales" className="mt-0">
            <StyleAfterSalesTab styleId={id} styleName={style.name} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Toast 提示 */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg border flex items-start gap-3 ${
              toast.type === "success"
                ? "bg-white border-green-200"
                : "bg-white border-red-200"
            }`}
          >
            <div
              className={`mt-0.5 ${
                toast.type === "success" ? "text-green-500" : "text-red-500"
              }`}
            >
              {toast.type === "success" ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <FileText className="h-4 w-4" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium">
                {toast.type === "success" ? "操作成功" : "操作失败"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{toast.message}</p>
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}

      {/* 上传对话框 */}
      <AssetUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        styleId={id}
        defaultType={uploadDefaultType}
        onUploaded={handleUploaded}
        onAnalyzed={handleAnalyzed}
      />
    </SidebarLayout>
  );
}
