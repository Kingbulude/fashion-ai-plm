"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Edit, Trash2, Upload, Image, FileText, Package, CheckCircle } from "lucide-react";

export const runtime = "edge";

export default function StyleDetailPage() {
  const [style, setStyle] = useState<any>(null);
  const [assets, setAssets] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  
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

  const statusLabels: Record<string, { label: string; variant: "secondary" | "destructive" | "default" | "link" | "outline" | "ghost" }> = {
    planning: { label: "企划中", variant: "default" },
    designing: { label: "设计中", variant: "outline" },
    designed: { label: "设计定稿", variant: "secondary" },
    sampling: { label: "打样中", variant: "outline" },
    sampled: { label: "封样完成", variant: "secondary" },
    producing: { label: "大货生产", variant: "outline" },
    produced: { label: "大货完成", variant: "secondary" },
    selling: { label: "销售中", variant: "outline" },
    sold: { label: "销售结束", variant: "default" },
    reviewing: { label: "复盘中", variant: "outline" },
    archived: { label: "已归档", variant: "default" },
  };

  const assetTypeLabels: Record<string, string> = {
    inspiration: "灵感图",
    design: "设计稿",
    ai_derivative: "AI衍生",
    "3d_sample": "3D样衣",
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">加载中...</div>
      </div>
    );
  }

  if (error || !style) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive">
          <AlertDescription>{error || "款式不存在"}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                <span className="text-white text-sm font-bold">SF</span>
              </div>
              <span className="font-bold text-lg">StyleForge</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => router.push(`/styles/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                编辑
              </Button>
              <Button variant="outline" color="destructive" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 mr-2" />
                删除
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <h1 className="text-2xl font-bold">{style.name}</h1>
            <Badge variant={statusLabels[style.status]?.variant || "default"}>
              {statusLabels[style.status]?.label || style.status}
            </Badge>
          </div>
          <p className="text-muted-foreground">
            {style.styleNo} · {style.category} · {style.season}
          </p>
        </div>

        <Tabs defaultValue="info" className="max-w-5xl">
          <TabsList className="mb-4">
            <TabsTrigger value="info">基本信息</TabsTrigger>
            <TabsTrigger value="assets">设计资产</TabsTrigger>
            <TabsTrigger value="techpack">工艺包</TabsTrigger>
            <TabsTrigger value="bom">BOM清单</TabsTrigger>
          </TabsList>

          <TabsContent value="info">
            <Card>
              <CardHeader>
                <CardTitle>款式档案</CardTitle>
                <CardDescription>款式的基本信息和描述</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">款号</p>
                    <p className="font-medium">{style.styleNo}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">名称</p>
                    <p className="font-medium">{style.name}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">季节</p>
                    <p className="font-medium">{style.season || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">品类</p>
                    <p className="font-medium">{style.category || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">目标成本</p>
                    <p className="font-medium">¥{style.targetCost || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">实际成本</p>
                    <p className="font-medium">¥{style.actualCost || "-"}</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">描述</p>
                  <p className="font-medium">{style.description || "-"}</p>
                </div>
                {style.aiTags && style.aiTags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">AI标签</p>
                    <div className="flex flex-wrap gap-2">
                      {style.aiTags.map((tag: string) => (
                        <Badge key={tag} variant="secondary">{tag}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {style.aiColorPalette && style.aiColorPalette.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">AI提取色彩</p>
                    <div className="flex flex-wrap gap-2">
                      {style.aiColorPalette.map((color: string) => (
                        <Badge key={color} variant="secondary">{color}</Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="assets">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>设计资产</CardTitle>
                  <CardDescription>款式相关的设计稿、灵感图等资产</CardDescription>
                </div>
                <Button onClick={() => router.push(`/styles/${id}/assets/upload`)}>
                  <Upload className="h-4 w-4 mr-2" />
                  上传资产
                </Button>
              </CardHeader>
              <CardContent>
                {assets.length === 0 ? (
                  <div className="text-center py-12">
                    <Image className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">暂无设计资产</p>
                    <Button onClick={() => router.push(`/styles/${id}/assets/upload`)} className="mt-4">
                      <Upload className="h-4 w-4 mr-2" />
                      上传第一个资产
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {assets.map((asset) => (
                      <div
                        key={asset.id}
                        className="border rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="aspect-square bg-muted flex items-center justify-center">
                          {asset.thumbnailUrl ? (
                            <img
                              src={asset.thumbnailUrl}
                              alt={asset.fileName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <FileText className="h-12 w-12 text-muted-foreground" />
                          )}
                        </div>
                        <div className="p-3">
                          <p className="font-medium text-sm truncate">{asset.fileName}</p>
                          <div className="flex items-center justify-between mt-2">
                            <Badge variant="outline" className="text-xs">
                              {assetTypeLabels[asset.type] || asset.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">v{asset.version}</span>
                          </div>
                          {asset.isActive && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                              <CheckCircle className="h-3 w-3" />
                              当前版本
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="techpack">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>工艺包</CardTitle>
                  <CardDescription>尺寸表、工艺说明、缝制标准</CardDescription>
                </div>
                <Button>
                  <FileText className="h-4 w-4 mr-2" />
                  生成工艺包
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无工艺包</p>
                  <Button className="mt-4">
                    <FileText className="h-4 w-4 mr-2" />
                    生成工艺包
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bom">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>BOM物料清单</CardTitle>
                  <CardDescription>面辅料清单、单耗、成本核算</CardDescription>
                </div>
                <Button>
                  <Package className="h-4 w-4 mr-2" />
                  添加物料
                </Button>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无BOM物料</p>
                  <Button className="mt-4">
                    <Package className="h-4 w-4 mr-2" />
                    添加物料
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
