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
} from "lucide-react";

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
    } catch (err) {
      setError("获取款式信息失败");
    }
    setLoading(false);
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
      <div className="p-6 lg:p-8">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold">{style.name}</h1>
              <Badge variant="secondary" className={`${status.bg} ${status.color} border-0`}>
                {status.label}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {style.styleNo} · {style.category || "未分类"} · {style.season || "-"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => {}}>
              <Edit className="h-4 w-4 mr-2" />
              编辑
            </Button>
            <Button variant="outline" size="sm" className="text-red-600 hover:text-red-600" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              删除
            </Button>
          </div>
        </div>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="mb-6 h-10 p-1">
            <TabsTrigger value="info" className="h-8 px-4">基本信息</TabsTrigger>
            <TabsTrigger value="assets" className="h-8 px-4">设计资产</TabsTrigger>
            <TabsTrigger value="techpack" className="h-8 px-4">工艺包</TabsTrigger>
            <TabsTrigger value="bom" className="h-8 px-4">BOM清单</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">款式档案</CardTitle>
                    <CardDescription>款式的基本信息和描述</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-5">
                      {infoItems.map((item, i) => (
                        <div key={i} className="space-y-1">
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <item.icon className="h-3 w-3" />
                            {item.label}
                          </p>
                          <p className="font-medium text-sm">{item.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-5 pt-5 border-t">
                      <p className="text-xs text-muted-foreground mb-2">设计描述</p>
                      <p className="text-sm leading-relaxed">
                        {style.description || "暂无描述"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {(style.aiTags?.length > 0 || style.aiColorPalette?.length > 0) && (
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">AI 分析结果</CardTitle>
                      <CardDescription>由 AI 自动提取的标签和色彩</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {style.aiTags?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">AI标签</p>
                          <div className="flex flex-wrap gap-2">
                            {style.aiTags.map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="bg-blue-50 text-blue-700 hover:bg-blue-100">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      {style.aiColorPalette?.length > 0 && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2">AI提取色彩</p>
                          <div className="flex flex-wrap gap-2">
                            {style.aiColorPalette.map((color: string) => (
                              <Badge key={color} variant="outline" className="gap-2">
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
                <Card className="border-0 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">状态进度</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {Object.entries(statusConfig).slice(0, 6).map(([key, val], i) => (
                        <div key={key} className="flex items-center gap-3">
                          <div className={`w-2 h-2 rounded-full ${style.status === key ? "bg-blue-500" : key.indexOf(style.status) > -1 || i < Object.keys(statusConfig).indexOf(style.status) ? "bg-green-500" : "bg-slate-200"}`} />
                          <span className={`text-sm ${style.status === key ? "font-medium" : "text-muted-foreground"}`}>
                            {val.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                        <Palette className="h-4 w-4 text-white" />
                      </div>
                      <h3 className="font-semibold text-sm">AI 设计分析</h3>
                    </div>
                    <p className="text-xs text-muted-foreground mb-4">
                      上传设计稿，AI 将自动提取色彩、风格、元素等标签
                    </p>
                    {style.aiTags?.length > 0 ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full bg-white/60 hover:bg-white/80"
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
                        className="w-full bg-white/60 hover:bg-white/80"
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
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">设计资产</CardTitle>
                    <CardDescription>款式相关的设计稿、灵感图等资产</CardDescription>
                  </div>
                  <Button size="sm" onClick={() => openUpload()}>
                    <Upload className="h-4 w-4 mr-2" />
                    上传资产
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {assets.length === 0 ? (
                  <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <ImageIcon className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                    <p className="text-muted-foreground text-sm mb-4">暂无设计资产</p>
                    <Button size="sm" onClick={() => openUpload()}>
                      <Upload className="h-4 w-4 mr-2" />
                      上传第一个资产
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="group border rounded-xl overflow-hidden hover:shadow-lg transition-all cursor-pointer bg-white"
                      >
                        <div className="aspect-square bg-slate-100 flex items-center justify-center relative">
                          {asset.thumbnailUrl ? (
                            <img
                              src={asset.thumbnailUrl}
                              alt={asset.fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="h-10 w-10 text-slate-400" />
                          )}
                          {asset.isActive && (
                            <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-2 py-1 rounded-full flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              当前
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-medium text-sm truncate">{asset.fileName}</p>
                          <div className="flex items-center justify-between mt-2 mb-2">
                            <Badge variant="secondary" className="text-xs bg-slate-100 text-slate-600">
                              {assetTypeLabels[asset.type] || asset.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">v{asset.version}</span>
                          </div>
                          {asset.type === "design" && (
                            <Button
                              variant="outline"
                              size="xs"
                              className="w-full h-7 mt-1 text-xs"
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
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">工艺包</CardTitle>
                    <CardDescription>尺寸表、工艺说明、缝制标准</CardDescription>
                  </div>
                  <Button size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    生成工艺包
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm mb-4">暂无工艺包</p>
                  <Button size="sm">
                    <FileText className="h-4 w-4 mr-2" />
                    生成工艺包
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bom" className="mt-0">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">BOM物料清单</CardTitle>
                    <CardDescription>面辅料清单、单耗、成本核算</CardDescription>
                  </div>
                  <Button size="sm">
                    <Package className="h-4 w-4 mr-2" />
                    添加物料
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm mb-4">暂无BOM物料</p>
                  <Button size="sm">
                    <Package className="h-4 w-4 mr-2" />
                    添加物料
                  </Button>
                </div>
              </CardContent>
            </Card>
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
