"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ImageIcon,
  MessageSquare,
  BarChart2,
  ShoppingCart,
  Star,
  ThumbsUp,
  ThumbsDown,
} from "lucide-react";

export default function AiPage() {
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [styles, setStyles] = useState<any[]>([]);
  const [selectedStyle, setSelectedStyle] = useState("");

  const [imageForm, setImageForm] = useState({
    styleName: "",
    styleId: "",
    description: "",
    styleType: "realistic",
    colors: "",
  });

  const [aiImages, setAiImages] = useState<any[]>([]);

  const [testForm, setTestForm] = useState({
    imageId: "",
    targetAudience: "",
    testDuration: "7",
  });

  const [testResults, setTestResults] = useState<any[]>([]);

  const [analysisResult, setAnalysisResult] = useState({
    score: 0,
    feedbackCount: 0,
    positiveRate: 0,
    suggestions: "",
  });

  const [orderSuggestion, setOrderSuggestion] = useState({
    suggestedQuantity: 0,
    safetyStock: 0,
    reasoning: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchStyles();
    loadAiImages();
    loadTestResults();
  }, []);

  const fetchStyles = async () => {
    try {
      const res = await fetch("/api/styles");
      if (res.ok) {
        const data = await res.json();
        setStyles(Array.isArray(data) ? data : []);
      }
    } catch {
      setStyles([]);
    }
  };

  const loadAiImages = async () => {
    try {
      const res = await fetch("/api/ai/images");
      if (res.ok) {
        setAiImages((await res.json()) || []);
      }
    } catch {
      setAiImages([]);
    }
  };

  const loadTestResults = async () => {
    try {
      const res = await fetch("/api/ai/test-results");
      if (res.ok) {
        setTestResults((await res.json()) || []);
      }
    } catch {
      setTestResults([]);
    }
  };

  const handleGenerateImage = async () => {
    if (!imageForm.styleName && !imageForm.styleId) {
      showToast("error", "请选择款式或输入款式名称");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(imageForm),
      });
      if (!res.ok) throw new Error("生成失败");
      const data = await res.json();
      showToast("success", "AI图片生成成功");
      loadAiImages();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "生成失败");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = async () => {
    if (!testForm.imageId) {
      showToast("error", "请选择测试图片");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/ai/start-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(testForm),
      });
      if (!res.ok) throw new Error("测试启动失败");
      showToast("success", "市场测试已启动");
      loadTestResults();
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "测试启动失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    if (!selectedStyle) {
      showToast("error", "请选择款式");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/analyze-test/${selectedStyle}`);
      if (!res.ok) throw new Error("分析失败");
      const data = await res.json();
      setAnalysisResult(data);
      showToast("success", "接受度分析完成");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "分析失败");
    } finally {
      setLoading(false);
    }
  };

  const handleGetOrderSuggestion = async () => {
    if (!selectedStyle) {
      showToast("error", "请选择款式");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/order-suggestion/${selectedStyle}`);
      if (!res.ok) throw new Error("获取建议失败");
      const data = await res.json();
      setOrderSuggestion(data);
      showToast("success", "下单建议已生成");
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "获取建议失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">AI测款中心</h1>
            <p className="text-muted-foreground">AI生图、市场测试、接受度评估、下单建议</p>
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm">选择款式</Label>
            <select className="h-9 w-48 rounded-md border border-input bg-background px-2 text-sm" value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)}>
              <option value="">请选择款式</option>
              {styles.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="generate" className="gap-2">
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">AI生图</span>
            </TabsTrigger>
            <TabsTrigger value="test" className="gap-2">
              <MessageSquare className="h-4 w-4" />
              <span className="hidden sm:inline">市场测试</span>
            </TabsTrigger>
            <TabsTrigger value="analyze" className="gap-2">
              <BarChart2 className="h-4 w-4" />
              <span className="hidden sm:inline">接受度评估</span>
            </TabsTrigger>
            <TabsTrigger value="suggest" className="gap-2">
              <ShoppingCart className="h-4 w-4" />
              <span className="hidden sm:inline">下单建议</span>
            </TabsTrigger>
          </TabsList>

          {/* AI生图 */}
          <TabsContent value="generate" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Wand2 className="h-4 w-4" />
                    生成AI图片
                  </CardTitle>
                  <CardDescription>输入款式信息，AI自动生成产品图片</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">关联款式</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={imageForm.styleId} onChange={(e) => setImageForm({ ...imageForm, styleId: e.target.value })}>
                      <option value="">选择款式（可选）</option>
                      {styles.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">款式名称</Label>
                    <Input placeholder="输入款式名称" value={imageForm.styleName} onChange={(e) => setImageForm({ ...imageForm, styleName: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">描述</Label>
                    <textarea className="h-20 w-full rounded-md border border-input bg-background px-2 text-sm" placeholder="描述款式特点、风格" value={imageForm.description} onChange={(e) => setImageForm({ ...imageForm, description: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">风格类型</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={imageForm.styleType} onChange={(e) => setImageForm({ ...imageForm, styleType: e.target.value })}>
                      <option value="realistic">写实风格</option>
                      <option value="fashion">时尚杂志风</option>
                      <option value="sketch">设计草图</option>
                      <option value="3d">3D渲染</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">颜色</Label>
                    <Input placeholder="如：黑色、白色、灰色" value={imageForm.colors} onChange={(e) => setImageForm({ ...imageForm, colors: e.target.value })} />
                  </div>
                  <Button className="w-full" onClick={handleGenerateImage} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                    生成图片
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ImageIcon className="h-4 w-4" />
                    AI图片库
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {aiImages.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {aiImages.map((img) => (
                        <div key={img.id} className="relative group">
                          <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden">
                            {img.imageUrl ? (
                              <img src={img.imageUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <ImageIcon className="h-8 w-8 text-slate-400" />
                              </div>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between">
                            <span className="text-xs text-muted-foreground truncate flex-1">{img.styleName || "未命名"}</span>
                            <Badge variant="secondary" className="text-xs">{img.createdAt?.slice(0, 10)}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ImageIcon className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">暂无AI生成图片</p>
                      <p className="text-xs text-muted-foreground mt-1">点击左侧生成第一张图片</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 市场测试 */}
          <TabsContent value="test" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    启动市场测试
                  </CardTitle>
                  <CardDescription>选择AI图片，投放目标受众收集反馈</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">选择图片</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={testForm.imageId} onChange={(e) => setTestForm({ ...testForm, imageId: e.target.value })}>
                      <option value="">请选择图片</option>
                      {aiImages.map((img) => (
                        <option key={img.id} value={img.id}>{img.styleName || "图片 " + img.id.slice(-4)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">目标受众</Label>
                    <Input placeholder="如：25-35岁女性" value={testForm.targetAudience} onChange={(e) => setTestForm({ ...testForm, targetAudience: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">测试时长</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={testForm.testDuration} onChange={(e) => setTestForm({ ...testForm, testDuration: e.target.value })}>
                      <option value="3">3天</option>
                      <option value="7">7天</option>
                      <option value="14">14天</option>
                    </select>
                  </div>
                  <Button className="w-full" onClick={handleStartTest} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Users className="h-4 w-4 mr-2" />}
                    启动测试
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    测试进行中
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {testResults.length > 0 ? (
                    <div className="space-y-4">
                      {testResults.map((test) => (
                        <div key={test.id} className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Badge variant={test.status === "active" ? "default" : "outline"}>
                                {test.status === "active" ? "进行中" : "已完成"}
                              </Badge>
                              <span className="text-sm font-medium">{test.styleName}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{test.createdAt?.slice(0, 10)}</span>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <div className="text-xl font-bold text-blue-600">{test.feedbackCount || 0}</div>
                              <div className="text-xs text-muted-foreground">反馈数</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-green-600">{test.positiveCount || 0}</div>
                              <div className="text-xs text-muted-foreground">正面反馈</div>
                            </div>
                            <div className="text-center">
                              <div className="text-xl font-bold text-orange-600">{test.negativeCount || 0}</div>
                              <div className="text-xs text-muted-foreground">负面反馈</div>
                            </div>
                          </div>
                          {test.feedbackSummary && (
                            <div className="mt-3 pt-3 border-t border-slate-200">
                              <p className="text-xs text-muted-foreground">反馈摘要：{test.feedbackSummary}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <MessageSquare className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">暂无测试数据</p>
                      <p className="text-xs text-muted-foreground mt-1">选择图片启动市场测试</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 接受度评估 */}
          <TabsContent value="analyze" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart2 className="h-4 w-4" />
                    分析接受度
                  </CardTitle>
                  <CardDescription>基于测试数据评估市场接受度</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">选择款式</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)}>
                      <option value="">请选择款式</option>
                      {styles.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button className="w-full" onClick={handleAnalyze} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart2 className="h-4 w-4 mr-2" />}
                    开始分析
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Star className="h-4 w-4" />
                    接受度评估报告
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {analysisResult.score > 0 ? (
                    <div className="space-y-6">
                      <div className="flex items-center justify-center py-8">
                        <div className="relative">
                          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                            <span className="text-4xl font-bold text-white">{analysisResult.score}</span>
                          </div>
                          <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-white px-3 py-1 rounded-full shadow-sm">
                            <span className="text-xs font-medium">市场接受度评分</span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-slate-50 rounded-lg p-4 text-center">
                          <div className="flex items-center justify-center gap-1 mb-2">
                            <Users className="h-4 w-4 text-slate-500" />
                            <span className="text-xs text-muted-foreground">反馈人数</span>
                          </div>
                          <div className="text-xl font-bold">{analysisResult.feedbackCount}</div>
                        </div>
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <div className="flex items-center justify-center gap-1 mb-2">
                            <ThumbsUp className="h-4 w-4 text-green-500" />
                            <span className="text-xs text-green-600">正面率</span>
                          </div>
                          <div className="text-xl font-bold text-green-600">{analysisResult.positiveRate}%</div>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 text-center">
                          <div className="flex items-center justify-center gap-1 mb-2">
                            <ThumbsDown className="h-4 w-4 text-red-500" />
                            <span className="text-xs text-red-600">负面率</span>
                          </div>
                          <div className="text-xl font-bold text-red-600">{100 - analysisResult.positiveRate}%</div>
                        </div>
                      </div>

                      {analysisResult.suggestions && (
                        <div className="bg-amber-50 rounded-lg p-4">
                          <p className="text-xs font-medium text-amber-800 mb-2">优化建议</p>
                          <p className="text-sm text-amber-700">{analysisResult.suggestions}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <BarChart2 className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">暂无分析数据</p>
                      <p className="text-xs text-muted-foreground mt-1">选择款式开始接受度分析</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 下单建议 */}
          <TabsContent value="suggest" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    获取下单建议
                  </CardTitle>
                  <CardDescription>基于测款结果生成大货下单数量建议</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">选择款式</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={selectedStyle} onChange={(e) => setSelectedStyle(e.target.value)}>
                      <option value="">请选择款式</option>
                      {styles.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button className="w-full" onClick={handleGetOrderSuggestion} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShoppingCart className="h-4 w-4 mr-2" />}
                    生成建议
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    下单建议报告
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {orderSuggestion.suggestedQuantity > 0 ? (
                    <div className="space-y-6">
                      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white">
                        <div className="text-sm opacity-80 mb-2">建议下单数量</div>
                        <div className="text-5xl font-bold">{orderSuggestion.suggestedQuantity}</div>
                        <div className="text-sm opacity-80 mt-2">件</div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-50 rounded-lg p-4">
                          <div className="text-xs text-green-600 mb-1">安全库存</div>
                          <div className="text-2xl font-bold text-green-600">{orderSuggestion.safetyStock}</div>
                          <div className="text-xs text-green-600 mt-1">件</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4">
                          <div className="text-xs text-blue-600 mb-1">预估首月销量</div>
                          <div className="text-2xl font-bold text-blue-600">{Math.round(orderSuggestion.suggestedQuantity * 0.6)}</div>
                          <div className="text-xs text-blue-600 mt-1">件</div>
                        </div>
                      </div>

                      {orderSuggestion.reasoning && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <p className="text-xs font-medium text-slate-700 mb-2">推荐理由</p>
                          <p className="text-sm text-slate-600">{orderSuggestion.reasoning}</p>
                        </div>
                      )}

                      <Button className="w-full">
                        <ShoppingCart className="h-4 w-4 mr-2" />
                        创建生产订单
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ShoppingCart className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                      <p className="text-muted-foreground">暂无下单建议</p>
                      <p className="text-xs text-muted-foreground mt-1">选择款式获取AI下单建议</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

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