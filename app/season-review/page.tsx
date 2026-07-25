"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/auth/tenant-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  Target,
  Loader2,
  RefreshCw,
  Save,
  FileText,
  Clock,
  Star,
  ShieldAlert,
  Palette,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  History,
  ArrowRight,
} from "lucide-react";

interface SeasonReview {
  id: string;
  seasonName: string;
  seasonId?: string;
  status: string;
  reviewType: string;
  overallScore: number;
  summary: string;
  highlights: any[];
  issues: any[];
  actionItems: any[];
  kpiSummary: any;
  styleAnalysis: any;
  supplyChainAnalysis: any;
  designFeedbackCount: number;
  createdAt: string;
}

export default function SeasonReviewPage() {
  const { currentBrand, currentCompany, currentSeason, availableSeasons } = useTenant();
  const [reviews, setReviews] = useState<SeasonReview[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("new");

  const getHeaders = () => ({
    "x-company-id": currentCompany?.id || "",
    "x-brand-id": currentBrand?.id || "",
    "x-season-id": currentSeason?.id || "",
  });

  useEffect(() => {
    if (currentSeason?.id) {
      setSelectedSeasonId(currentSeason.id);
    }
    fetchReviews();
  }, [currentBrand?.id, currentSeason?.id]);

  const fetchReviews = async () => {
    if (!currentBrand?.id) return;
    setLoading(true);
    try {
      const res = await fetch("/api/season-reviews", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.error("获取复盘失败:", e);
    } finally {
      setLoading(false);
    }
  };

  const generateReview = async () => {
    if (!selectedSeasonId) return;
    setGenerating(true);
    setGeneratedResult(null);
    try {
      const res = await fetch("/api/season-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({ action: "generate", seasonId: selectedSeasonId, reviewType: "end_of_season" }),
      });
      const data = await res.json();
      setGeneratedResult(data);
    } catch (e) {
      console.error("生成复盘失败:", e);
    } finally {
      setGenerating(false);
    }
  };

  const saveReview = async () => {
    if (!generatedResult?.success) return;
    try {
      const res = await fetch("/api/season-reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({
          seasonId: selectedSeasonId,
          seasonName: generatedResult.seasonName,
          overallScore: generatedResult.overallScore,
          summary: generatedResult.summary,
          highlights: generatedResult.highlights,
          issues: generatedResult.issues,
          actionItems: generatedResult.actionItems,
          kpiSummary: generatedResult.kpiSummary,
          styleAnalysis: generatedResult.styleAnalysis,
          supplyChainAnalysis: generatedResult.supplyChainAnalysis,
          designFeedbackCount: generatedResult.designFeedbackCount,
          reviewType: "end_of_season",
        }),
      });
      if (res.ok) {
        await fetchReviews();
        setActiveTab("history");
        setGeneratedResult(null);
      }
    } catch (e) {
      console.error("保存复盘失败:", e);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-600";
    if (score >= 60) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-emerald-50 border-emerald-200";
    if (score >= 60) return "bg-amber-50 border-amber-200";
    return "bg-red-50 border-red-200";
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-600 bg-red-50 border-red-200";
      case "medium": return "text-amber-600 bg-amber-50 border-amber-200";
      default: return "text-slate-600 bg-slate-50 border-slate-200";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "text-red-600 bg-red-50";
      case "medium": return "text-amber-600 bg-amber-50";
      default: return "text-slate-600 bg-slate-50";
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">每季AI复盘</h1>
          <p className="text-sm text-slate-500 mt-1">自动生成全链路复盘报告，洞察数据驱动优化</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="new">生成复盘</TabsTrigger>
          <TabsTrigger value="history">历史复盘</TabsTrigger>
        </TabsList>

        <TabsContent value="new" className="space-y-6 pt-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-end gap-4 flex-wrap">
                <div className="flex-1 min-w-[200px]">
                  <label className="text-sm font-medium text-slate-700 mb-2 block">选择季度</label>
                  <select
                    value={selectedSeasonId}
                    onChange={(e) => setSelectedSeasonId(e.target.value)}
                    className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
                  >
                    <option value="">选择季度</option>
                    {availableSeasons?.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <Button
                  onClick={generateReview}
                  disabled={!selectedSeasonId || generating}
                  className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />生成中...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" />AI 生成复盘</>
                  )}
                </Button>
                {generatedResult?.success && (
                  <Button variant="outline" onClick={saveReview}>
                    <Save className="w-4 h-4 mr-2" />保存复盘
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {generatedResult?.success && (
            <>
              <div className={`rounded-xl border p-6 ${getScoreBg(generatedResult.overallScore || 0)}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{generatedResult.seasonName} 复盘报告</h2>
                    <p className="text-sm text-slate-600 mt-2 whitespace-pre-line">{generatedResult.summary}</p>
                  </div>
                  <div className="text-center">
                    <div className={`text-4xl font-bold ${getScoreColor(generatedResult.overallScore || 0)}`}>
                      {generatedResult.overallScore}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">综合评分</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-500">款式数量</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{generatedResult.kpiSummary?.totalStyles || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-500">销售额</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">¥{((generatedResult.kpiSummary?.totalRevenue || 0) / 10000).toFixed(1)}万</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-500">总销量</div>
                    <div className="text-2xl font-bold text-slate-900 mt-1">{generatedResult.kpiSummary?.totalQuantity || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-500">售罄率</div>
                    <div className={`text-2xl font-bold mt-1 ${(generatedResult.kpiSummary?.sellthroughRate || 0) >= 60 ? "text-emerald-600" : "text-amber-600"}`}>
                      {generatedResult.kpiSummary?.sellthroughRate?.toFixed(1) || 0}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-500">退货率</div>
                    <div className={`text-2xl font-bold mt-1 ${(generatedResult.kpiSummary?.returnRate || 0) <= 3 ? "text-emerald-600" : "text-red-600"}`}>
                      {generatedResult.kpiSummary?.returnRate?.toFixed(2) || 0}%
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-sm text-slate-500">生产准交率</div>
                    <div className={`text-2xl font-bold mt-1 ${(generatedResult.kpiSummary?.onTimeRate || 0) >= 90 ? "text-emerald-600" : "text-amber-600"}`}>
                      {generatedResult.kpiSummary?.onTimeRate?.toFixed(1) || 0}%
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      本季亮点
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {generatedResult.highlights?.map((h: any, i: number) => (
                      <div key={i} className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                        <div className="flex items-start justify-between">
                          <div className="font-medium text-emerald-800">{h.title}</div>
                          {h.metric && <Badge className="bg-emerald-200 text-emerald-800">{h.metric}</Badge>}
                        </div>
                        <p className="text-sm text-emerald-700 mt-1">{h.description}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      待改进问题
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {generatedResult.issues?.map((issue: any, i: number) => (
                      <div key={i} className={`p-3 rounded-lg border ${getSeverityColor(issue.severity)}`}>
                        <div className="flex items-start justify-between">
                          <div className="font-medium">{issue.title}</div>
                          <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                            {issue.severity === "high" ? "高" : issue.severity === "medium" ? "中" : "低"}
                          </Badge>
                        </div>
                        <p className="text-sm mt-1 opacity-80">{issue.description}</p>
                      </div>
                    ))}
                    {generatedResult.issues?.length === 0 && (
                      <p className="text-sm text-slate-500 text-center py-4">暂无问题，继续保持！</p>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-indigo-500" />
                      行动项
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {generatedResult.actionItems?.map((item: any, i: number) => (
                      <div key={i} className={`p-3 rounded-lg ${getPriorityColor(item.priority)}`}>
                        <div className="flex items-start justify-between">
                          <div className="font-medium text-slate-800">{item.title}</div>
                          <Badge variant="outline" className={getPriorityColor(item.priority)}>
                            {item.priority === "high" ? "高" : item.priority === "medium" ? "中" : "低"}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-1">{item.description}</p>
                        <div className="text-xs text-slate-500 mt-2">分类：{item.category}</div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Star className="w-5 h-5 text-amber-500" />
                    款式表现分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="top">
                    <TabsList>
                      <TabsTrigger value="top">TOP 5 畅销款</TabsTrigger>
                      <TabsTrigger value="poor">滞销款预警</TabsTrigger>
                      <TabsTrigger value="category">品类分布</TabsTrigger>
                    </TabsList>
                    <TabsContent value="top" className="space-y-3 pt-4">
                      {generatedResult.styleAnalysis?.topStyles?.map((s: any, i: number) => (
                        <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold text-sm">
                            {i + 1}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium text-slate-900">{s.name}</div>
                            <div className="text-xs text-slate-500">{s.styleNo} · {s.category}</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">{s.soldQuantity}件</div>
                            <div className="text-xs text-emerald-600">售罄 {s.sellthroughRate?.toFixed(1)}%</div>
                          </div>
                        </div>
                      ))}
                    </TabsContent>
                    <TabsContent value="poor" className="space-y-3 pt-4">
                      {generatedResult.styleAnalysis?.poorPerformers?.length > 0 ? (
                        generatedResult.styleAnalysis.poorPerformers.map((s: any, i: number) => (
                          <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-red-50">
                            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-bold text-sm">
                              {i + 1}
                            </div>
                            <div className="flex-1">
                              <div className="font-medium text-slate-900">{s.name}</div>
                              <div className="text-xs text-slate-500">{s.styleNo} · {s.category}</div>
                            </div>
                            <div className="text-right">
                              <div className="font-bold text-slate-900">{s.soldQuantity}/{s.targetQuantity}件</div>
                              <div className="text-xs text-red-600">售罄 {s.sellthroughRate?.toFixed(1)}%</div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-slate-500 text-center py-8">暂无滞销款</p>
                      )}
                    </TabsContent>
                    <TabsContent value="category" className="pt-4">
                      <div className="space-y-4">
                        {Object.entries(generatedResult.styleAnalysis?.categoryStats || {}).map(([cat, data]: [string, any]) => (
                          <div key={cat}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-700 font-medium">{cat}</span>
                              <span className="text-slate-500">{data.count}款 · {data.sold}件 · ¥{((data.revenue || 0) / 10000).toFixed(1)}万</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                                style={{ width: `${data.target > 0 ? (data.sold / data.target) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Palette className="w-5 h-5 text-indigo-500" />
                    设计反馈分析
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-3 gap-4 mb-6">
                    <div className="p-4 rounded-lg bg-indigo-50">
                      <div className="text-sm text-indigo-600">反馈总数</div>
                      <div className="text-xl font-bold text-indigo-900 mt-1">{generatedResult.designFeedbackAnalysis?.totalFeedbacks || 0}</div>
                    </div>
                    <div className="p-4 rounded-lg bg-indigo-50">
                      <div className="text-sm text-indigo-600">已解决</div>
                      <div className="text-xl font-bold text-indigo-900 mt-1">
                        {(generatedResult.designFeedbackAnalysis?.byStatus?.resolved || 0)}/{generatedResult.designFeedbackAnalysis?.totalFeedbacks || 0}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-indigo-50">
                      <div className="text-sm text-indigo-600">解决率</div>
                      <div className={`text-xl font-bold mt-1 ${(generatedResult.designFeedbackAnalysis?.resolvedRate || 0) >= 80 ? "text-emerald-600" : "text-amber-600"}`}>
                        {(generatedResult.designFeedbackAnalysis?.resolvedRate || 0).toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <div className="text-sm font-medium text-slate-700 mb-3">缺陷分类分布</div>
                      <div className="space-y-3">
                        {Object.entries(generatedResult.designFeedbackAnalysis?.byCategory || {}).map(([cat, count]: [string, unknown]) => (
                          <div key={cat}>
                            <div className="flex items-center justify-between text-sm mb-1">
                              <span className="text-slate-600">{cat}</span>
                              <span className="font-medium text-slate-800">{count as React.ReactNode}</span>
                            </div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full transition-all"
                                style={{ width: `${((count as number) / (generatedResult.designFeedbackAnalysis?.totalFeedbacks || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-700 mb-3">严重程度分布</div>
                      <div className="space-y-3">
                        {[
                          { key: "critical", label: "严重", color: "bg-red-500" },
                          { key: "major", label: "重要", color: "bg-amber-500" },
                          { key: "minor", label: "一般", color: "bg-blue-500" },
                        ].map((severity) => {
                          const count = generatedResult.designFeedbackAnalysis?.bySeverity?.[severity.key] || 0;
                          return (
                            <div key={severity.key}>
                              <div className="flex items-center justify-between text-sm mb-1">
                                <span className="text-slate-600">{severity.label}</span>
                                <span className="font-medium text-slate-800">{count}</span>
                              </div>
                              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full ${severity.color} rounded-full transition-all`}
                                  style={{ width: `${(count / (generatedResult.designFeedbackAnalysis?.totalFeedbacks || 1)) * 100}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="w-5 h-5 text-violet-500" />
                    历史对比
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-lg bg-violet-50">
                          <div className="text-sm text-violet-600">历史最高评分</div>
                          <div className="text-xl font-bold text-violet-900 mt-1">
                            {Math.max(...reviews.map((r) => r.overallScore || 0))}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-violet-50">
                          <div className="text-sm text-violet-600">历史最低评分</div>
                          <div className="text-xl font-bold text-violet-900 mt-1">
                            {Math.min(...reviews.map((r) => r.overallScore || 0))}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-violet-50">
                          <div className="text-sm text-violet-600">平均评分</div>
                          <div className="text-xl font-bold text-violet-900 mt-1">
                            {Math.round(reviews.reduce((sum, r) => sum + (r.overallScore || 0), 0) / reviews.length)}
                          </div>
                        </div>
                        <div className="p-4 rounded-lg bg-violet-50">
                          <div className="text-sm text-violet-600">复盘次数</div>
                          <div className="text-xl font-bold text-violet-900 mt-1">{reviews.length}</div>
                        </div>
                      </div>
                      <div className="h-32 flex items-end gap-2">
                        {[...reviews].reverse().slice(-6).map((r, i) => (
                          <div key={r.id} className="flex-1 flex flex-col items-center gap-1">
                            <div
                              className={`w-full rounded-t-md ${getScoreBg(r.overallScore || 0).replace("border-", "bg-").replace("bg-red-50", "bg-red-400").replace("bg-amber-50", "bg-amber-400").replace("bg-emerald-50", "bg-emerald-400")}`}
                              style={{ height: `${(r.overallScore || 0) * 0.3}px` }}
                            />
                            <span className="text-[10px] text-slate-500">{r.seasonName}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-sm text-slate-500">
                      暂无历史复盘数据，无法进行对比分析
                    </div>
                  )}
                </CardContent>
              </Card>
            </>
          )}

          {!generatedResult && !generating && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <Sparkles className="w-12 h-12 text-violet-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-700">选择季度后生成AI复盘</h3>
                <p className="text-sm text-slate-500 mt-2">
                  自动分析销售、生产、供应链、售后全链路数据<br />生成专业复盘报告和可执行的优化建议
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="pt-4">
          {loading ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-slate-400 mx-auto animate-spin" />
            </div>
          ) : reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${getScoreBg(review.overallScore || 0)}`}>
                          <FileText className={`w-6 h-6 ${getScoreColor(review.overallScore || 0)}`} />
                        </div>
                        <div>
                          <h3 className="font-medium text-slate-900">{review.seasonName}</h3>
                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(review.createdAt).toLocaleDateString("zh-CN")}
                            </span>
                            <Badge variant="outline">
                              {review.reviewType === "end_of_season" ? "季末复盘" : "季中复盘"}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${getScoreColor(review.overallScore || 0)}`}>
                          {review.overallScore}
                        </div>
                        <div className="text-xs text-slate-500">综合评分</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-500">暂无历史复盘</h3>
                <p className="text-sm text-slate-400 mt-2">切换到"生成复盘"标签创建你的第一份复盘报告</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
