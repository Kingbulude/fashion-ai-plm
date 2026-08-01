"use client";

import { useState, useEffect, useMemo } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Loader2,
  Palette,
  ImageIcon,
  AlertTriangle,
  RefreshCw,
  Search,
  LayoutGrid,
  List,
  Sparkles,
  Box,
  FileImage,
  Lightbulb,
  ExternalLink,
  Calendar,
  Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AIAssistantPanel } from "@/components/ai/ai-assistant-panel";

const ASSET_TYPES = [
  { key: "", label: "全部", icon: Layers },
  { key: "inspiration", label: "灵感图", icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50" },
  { key: "design", label: "设计稿", icon: FileImage, color: "text-blue-600", bg: "bg-blue-50" },
  { key: "ai_derivative", label: "AI衍生图", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50" },
  { key: "3d_sample", label: "3D样衣", icon: Box, color: "text-green-600", bg: "bg-green-50" },
];

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  inspiration: { label: "灵感图", icon: Lightbulb, color: "text-amber-600", bg: "bg-amber-50" },
  design: { label: "设计稿", icon: FileImage, color: "text-blue-600", bg: "bg-blue-50" },
  ai_derivative: { label: "AI衍生图", icon: Sparkles, color: "text-purple-600", bg: "bg-purple-50" },
  "3d_sample": { label: "3D样衣", icon: Box, color: "text-green-600", bg: "bg-green-50" },
};

const STYLE_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  draft: { label: "草稿", color: "text-slate-600" },
  pending: { label: "待审", color: "text-amber-600" },
  approved: { label: "已确认", color: "text-green-600" },
  rejected: { label: "已驳回", color: "text-red-600" },
  sampling: { label: "打样中", color: "text-blue-600" },
  testing: { label: "测款中", color: "text-purple-600" },
  production: { label: "生产中", color: "text-orange-600" },
  completed: { label: "已完成", color: "text-emerald-600" },
};

export default function DesignPage() {
  const router = useRouter();
  const [assets, setAssets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeType, setActiveType] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [previewAsset, setPreviewAsset] = useState<any>(null);
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/design-assets");
      if (res.ok) {
        const data = await res.json();
        setAssets(Array.isArray(data.assets) ? data.assets : []);
      } else {
        setError("加载设计资产失败，请稍后重试");
        setAssets([]);
      }
    } catch (err) {
      console.error("获取设计资产失败:", err);
      setError("网络异常，加载设计资产失败");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredAssets = useMemo(() => {
    let result = [...assets];
    if (activeType) {
      result = result.filter((a) => a.type === activeType);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (a) =>
          a.fileName?.toLowerCase().includes(q) ||
          a.styles?.name?.toLowerCase().includes(q) ||
          a.styles?.styleNo?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [assets, activeType, searchQuery]);

  const typeStats = useMemo(() => {
    const stats: Record<string, number> = {};
    for (const a of assets) {
      stats[a.type] = (stats[a.type] || 0) + 1;
    }
    return stats;
  }, [assets]);

  const handlePreview = (asset: any) => {
    setPreviewAsset(asset);
    setPreviewOpen(true);
  };

  const getTypeConfig = (type: string) => {
    return TYPE_CONFIG[type] || { label: type, icon: FileImage, color: "text-slate-600", bg: "bg-slate-50" };
  };

  const getStatusBadge = (status: string) => {
    const c = STYLE_STATUS_CONFIG[status] || { label: status, color: "text-slate-600" };
    return <Badge variant="outline" className={`text-xs ${c.color}`}>{c.label}</Badge>;
  };

  return (
    <SidebarLayout>
      <div className="max-w-[1600px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">设计资产库</h1>
            <p className="text-muted-foreground">全款式设计稿、灵感图、AI衍生图与3D样衣资产管理</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
          </div>
        </div>

        {/* KPI 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {ASSET_TYPES.map((type) => {
            const Icon = type.icon;
            const count = type.key === "" ? assets.length : (typeStats[type.key] || 0);
            const isActive = activeType === type.key;
            return (
              <button
                key={type.key}
                onClick={() => setActiveType(type.key)}
                className={`text-left transition-all rounded-xl border p-4 ${
                  isActive
                    ? "border-navy-300 bg-navy-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${type.key ? getTypeConfig(type.key).bg : "bg-slate-100"}`}>
                    <Icon className={`h-4 w-4 ${type.key ? getTypeConfig(type.key).color : "text-slate-600"}`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{type.label}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* 搜索栏 + 视图切换 */}
        <div className="flex items-center gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索文件名、款式名称、款号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center border rounded-md overflow-hidden">
            <button
              className={`p-2 transition-colors ${view === "grid" ? "bg-navy-700 text-white" : "bg-white text-muted-foreground hover:bg-slate-50"}`}
              onClick={() => setView("grid")}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              className={`p-2 transition-colors ${view === "list" ? "bg-navy-700 text-white" : "bg-white text-muted-foreground hover:bg-slate-50"}`}
              onClick={() => setView("list")}
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 内容区 */}
        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                加载中...
              </div>
            ) : error ? (
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-destructive">加载失败</p>
                      <p className="text-sm text-destructive/80 mt-0.5">{error}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => fetchData()}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      重试
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : filteredAssets.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <Palette className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <p className="text-muted-foreground mb-2">
                  {searchQuery || activeType ? "没有匹配的设计资产" : "暂无设计资产"}
                </p>
                <p className="text-xs text-muted-foreground">
                  设计资产会在款式详情页上传后自动汇总到这里
                </p>
              </div>
            ) : view === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredAssets.map((asset) => {
                  const typeConf = getTypeConfig(asset.type);
                  const TypeIcon = typeConf.icon;
                  return (
                    <Card
                      key={asset.id}
                      className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden group"
                      onClick={() => handlePreview(asset)}
                    >
                      <div className="aspect-[3/4] bg-slate-100 flex items-center justify-center relative overflow-hidden">
                        {asset.fileUrl || asset.thumbnailUrl ? (
                          <img
                            src={asset.thumbnailUrl || asset.fileUrl}
                            alt={asset.fileName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <ImageIcon className="h-12 w-12 text-slate-300" />
                        )}
                        <div className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[10px] font-medium ${typeConf.bg} ${typeConf.color} flex items-center gap-1`}>
                          <TypeIcon className="h-2.5 w-2.5" />
                          {typeConf.label}
                        </div>
                        {asset.version > 1 && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-medium bg-black/60 text-white">
                            v{asset.version}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <p className="text-sm font-medium truncate">{asset.styles?.name || "未关联款式"}</p>
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-xs text-muted-foreground truncate">{asset.styles?.styleNo || asset.fileName}</span>
                          {asset.styles?.status && getStatusBadge(asset.styles.status)}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredAssets.map((asset) => {
                  const typeConf = getTypeConfig(asset.type);
                  const TypeIcon = typeConf.icon;
                  return (
                    <Card
                      key={asset.id}
                      className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handlePreview(asset)}
                    >
                      <CardContent className="p-3 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {asset.fileUrl || asset.thumbnailUrl ? (
                            <img src={asset.thumbnailUrl || asset.fileUrl} alt={asset.fileName} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{asset.styles?.name || "未关联款式"}</p>
                            <Badge variant="secondary" className={`text-[10px] ${typeConf.color} ${typeConf.bg} flex items-center gap-1`}>
                              <TypeIcon className="h-2.5 w-2.5" />
                              {typeConf.label}
                            </Badge>
                            {asset.version > 1 && (
                              <Badge variant="outline" className="text-[10px]">v{asset.version}</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            {asset.styles?.styleNo || "无款号"} · {asset.fileName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {asset.styles?.status && getStatusBadge(asset.styles.status)}
                          <span className="text-xs text-muted-foreground">
                            {new Date(asset.createdAt).toLocaleDateString("zh-CN")}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>

          <div className="w-80 flex-shrink-0 hidden xl:block">
            <AIAssistantPanel processNode="design" title="设计 AI 助手" />
          </div>
        </div>

        {/* 资产预览弹窗 */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {previewAsset && (
                  <>
                    {(() => {
                      const typeConf = getTypeConfig(previewAsset.type);
                      const TypeIcon = typeConf.icon;
                      return (
                        <>
                          <TypeIcon className={`h-4 w-4 ${typeConf.color}`} />
                          {typeConf.label}
                        </>
                      );
                    })()}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>
            {previewAsset && (
              <div className="space-y-4">
                <div className="aspect-video bg-slate-100 rounded-lg flex items-center justify-center overflow-hidden">
                  {previewAsset.fileUrl || previewAsset.thumbnailUrl ? (
                    <img
                      src={previewAsset.fileUrl || previewAsset.thumbnailUrl}
                      alt={previewAsset.fileName}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-16 w-16 text-slate-300" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">关联款式</p>
                    <p className="text-sm font-medium">{previewAsset.styles?.name || "未关联"}</p>
                    {previewAsset.styles?.styleNo && (
                      <p className="text-xs text-muted-foreground mt-0.5">{previewAsset.styles.styleNo}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">版本</p>
                    <p className="text-sm font-medium">v{previewAsset.version}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">文件名</p>
                    <p className="text-sm font-medium truncate">{previewAsset.fileName}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">上传时间</p>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(previewAsset.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>

                {previewAsset.styles?.status && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">款式状态：</span>
                    {getStatusBadge(previewAsset.styles.status)}
                  </div>
                )}

                {previewAsset.aiTags && (
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                      <p className="text-xs font-medium text-purple-700">AI 标签</p>
                    </div>
                    <p className="text-xs text-purple-600">
                      {typeof previewAsset.aiTags === "string"
                        ? previewAsset.aiTags
                        : JSON.stringify(previewAsset.aiTags)}
                    </p>
                  </div>
                )}

                {previewAsset.aiAnalysis && (
                  <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <FileImage className="h-3.5 w-3.5 text-blue-600" />
                      <p className="text-xs font-medium text-blue-700">AI 分析</p>
                    </div>
                    <p className="text-xs text-blue-600">
                      {typeof previewAsset.aiAnalysis === "string"
                        ? previewAsset.aiAnalysis
                        : JSON.stringify(previewAsset.aiAnalysis)}
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  {previewAsset.fileUrl && (
                    <a href={previewAsset.fileUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                      <Button variant="outline" className="w-full">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        在新窗口打开
                      </Button>
                    </a>
                  )}
                  {previewAsset.styles?.id && (
                    <Button
                      className="flex-1 bg-navy-700 hover:bg-navy-800"
                      onClick={() => router.push(`/styles/${previewAsset.styles.id}`)}
                    >
                      查看款式详情
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );
}
