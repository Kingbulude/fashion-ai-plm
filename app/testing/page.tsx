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
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
  Target,
  DollarSign,
  Zap,
  Brain,
  Award,
  AlertTriangle,
  ChevronRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface StyleTestScores {
  marketAcceptance: number;
  marketAcceptanceReason: string;
  competitiveness: number;
  competitivenessReason: string;
  profitPotential: number;
  profitPotentialReason: string;
  trendAlignment: number;
  trendAlignmentReason: string;
  overallScore: number;
  summary: string;
  suggestions: string;
}

export default function TestingPage() {
  const router = useRouter();
  const [styles, setStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [testingIds, setTestingIds] = useState<Set<string>>(new Set());
  const [batchTesting, setBatchTesting] = useState(false);
  const [detailStyle, setDetailStyle] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailScores, setDetailScores] = useState<StyleTestScores | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/styles");
      if (res.ok) {
        const data = await res.json();
        setStyles(Array.isArray(data) ? data : data.data || []);
      } else {
        setError("加载款式数据失败");
        setStyles([]);
      }
    } catch (err) {
      console.error("获取款式失败:", err);
      setError("网络异常");
      setStyles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTest = async (styleId: string) => {
    const style = styles.find((s) => s.id === styleId);
    if (!style) return;

    setTestingIds((prev) => new Set(prev).add(styleId));
    try {
      const res = await fetch("/api/ai/style-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId: style.id,
          styleName: style.name,
          category: style.category,
          price: style.price,
          season: style.seasonName || style.seasonId,
          targetAudience: style.targetAudience,
          designFeatures: style.designFeatures || style.description,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setStyles((prev) =>
          prev.map((s) =>
            s.id === styleId
              ? { ...s, aiTestResult: data.analysis, testScores: data.scores }
              : s
          )
        );
        showToast("success", `测款完成：综合评分 ${data.scores?.overallScore || 0} 分`);
      } else {
        showToast("error", "测款失败");
      }
    } catch (err) {
      console.error("测款失败:", err);
      showToast("error", "测款失败");
    } finally {
      setTestingIds((prev) => {
        const next = new Set(prev);
        next.delete(styleId);
        return next;
      });
    }
  };

  const handleBatchTest = async () => {
    const untested = filteredStyles.filter((s) => !s.aiTestResult);
    if (untested.length === 0) {
      showToast("error", "所有款式已测款");
      return;
    }

    setBatchTesting(true);
    let successCount = 0;
    for (const style of untested.slice(0, 10)) {
      try {
        const res = await fetch("/api/ai/style-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            styleId: style.id,
            styleName: style.name,
            category: style.category,
            price: style.price,
            season: style.seasonName || style.seasonId,
            targetAudience: style.targetAudience,
            designFeatures: style.designFeatures || style.description,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setStyles((prev) =>
            prev.map((s) =>
              s.id === style.id
                ? { ...s, aiTestResult: data.analysis, testScores: data.scores }
                : s
            )
          );
          successCount++;
        }
      } catch {
        // 跳过失败的
      }
    }
    setBatchTesting(false);
    showToast("success", `批量测款完成：${successCount}/${untested.length} 款成功`);
  };

  const handleViewDetail = async (style: any) => {
    setDetailStyle(style);
    setDetailOpen(true);
    setDetailScores(style.testScores || null);
    setDetailLoading(!style.testScores && !!style.aiTestResult);

    if (!style.testScores && style.aiTestResult) {
      // 尝试从文本结果中解析评分
      try {
        const scores = parseScoresFromText(style.aiTestResult);
        setDetailScores(scores);
      } catch {
        setDetailScores(null);
      }
    }
    setDetailLoading(false);
  };

  function parseScoresFromText(text: string): StyleTestScores | null {
    const overallMatch = text.match(/综合评分[：:]\s*(\d+)/);
    const marketMatch = text.match(/市场接受度[：:]\s*(\d+)/);
    const compMatch = text.match(/竞争力[：:]\s*(\d+)/);
    const profitMatch = text.match(/利润潜力[：:]\s*(\d+)/);
    const trendMatch = text.match(/趋势契合度[：:]\s*(\d+)/);

    if (!overallMatch) return null;

    return {
      marketAcceptance: marketMatch ? parseInt(marketMatch[1]) : 0,
      marketAcceptanceReason: "",
      competitiveness: compMatch ? parseInt(compMatch[1]) : 0,
      competitivenessReason: "",
      profitPotential: profitMatch ? parseInt(profitMatch[1]) : 0,
      profitPotentialReason: "",
      trendAlignment: trendMatch ? parseInt(trendMatch[1]) : 0,
      trendAlignmentReason: "",
      overallScore: overallMatch ? parseInt(overallMatch[1]) : 0,
      summary: "",
      suggestions: "",
    };
  }

  const filteredStyles = useMemo(() => {
    let result = [...styles];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (s) =>
          s.name?.toLowerCase().includes(q) ||
          s.styleNo?.toLowerCase().includes(q)
      );
    }
    if (statusFilter === "tested") {
      result = result.filter((s) => s.aiTestResult);
    } else if (statusFilter === "untested") {
      result = result.filter((s) => !s.aiTestResult);
    } else if (statusFilter === "high") {
      result = result.filter((s) => s.testScores?.overallScore >= 80);
    } else if (statusFilter === "low") {
      result = result.filter(
        (s) => s.testScores?.overallScore < 50 && s.testScores
      );
    }
    return result.sort((a, b) => {
      const scoreA = a.testScores?.overallScore || 0;
      const scoreB = b.testScores?.overallScore || 0;
      return scoreB - scoreA;
    });
  }, [styles, searchQuery, statusFilter]);

  const summary = useMemo(() => {
    const total = styles.length;
    const tested = styles.filter((s) => s.aiTestResult).length;
    const highScore = styles.filter((s) => s.testScores?.overallScore >= 80).length;
    const avgScore = (() => {
      const tested = styles.filter((s) => s.testScores?.overallScore);
      if (tested.length === 0) return 0;
      return Math.round(
        tested.reduce((sum, s) => sum + (s.testScores?.overallScore || 0), 0) /
          tested.length
      );
    })();
    return { total, tested, untested: total - tested, highScore, avgScore };
  }, [styles]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-blue-600";
    if (score >= 40) return "text-amber-600";
    return "text-red-600";
  };

  const getScoreBg = (score: number) => {
    if (score >= 80) return "bg-green-50";
    if (score >= 60) return "bg-blue-50";
    if (score >= 40) return "bg-amber-50";
    return "bg-red-50";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 80) return { label: "优秀", color: "bg-green-100 text-green-700 border-green-200" };
    if (score >= 60) return { label: "良好", color: "bg-blue-100 text-blue-700 border-blue-200" };
    if (score >= 40) return { label: "一般", color: "bg-amber-100 text-amber-700 border-amber-200" };
    return { label: "待改进", color: "bg-red-100 text-red-700 border-red-200" };
  };

  const SCORE_DIMENSIONS = [
    { key: "marketAcceptance", label: "市场接受度", icon: Target, color: "text-blue-600" },
    { key: "competitiveness", label: "竞争力", icon: Zap, color: "text-orange-600" },
    { key: "profitPotential", label: "利润潜力", icon: DollarSign, color: "text-green-600" },
    { key: "trendAlignment", label: "趋势契合度", icon: TrendingUp, color: "text-purple-600" },
  ];

  return (
    <SidebarLayout>
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">测款中心</h1>
            <p className="text-muted-foreground">AI智能测款分析，评估款式市场潜力</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button
              onClick={handleBatchTest}
              disabled={batchTesting || summary.untested === 0}
              className="bg-navy-700 hover:bg-navy-800"
            >
              {batchTesting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              批量测款 ({summary.untested})
            </Button>
          </div>
        </div>

        {/* KPI 统计卡片 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-slate-50">
                  <Award className="h-5 w-5 text-slate-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{summary.total}</p>
                  <p className="text-xs text-muted-foreground">总款式</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-green-50">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600">{summary.tested}</p>
                  <p className="text-xs text-muted-foreground">已测款</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-amber-50">
                  <Brain className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-amber-600">{summary.untested}</p>
                  <p className="text-xs text-muted-foreground">待测款</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-purple-50">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-purple-600">{summary.avgScore}</p>
                  <p className="text-xs text-muted-foreground">平均评分</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-emerald-50">
                  <Sparkles className="h-5 w-5 text-emerald-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{summary.highScore}</p>
                  <p className="text-xs text-muted-foreground">高分款式</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 搜索和筛选 */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索款式名称、款号..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 px-3 rounded-md border border-input bg-background text-sm"
          >
            <option value="">全部款式</option>
            <option value="tested">已测款</option>
            <option value="untested">待测款</option>
            <option value="high">高分款 (≥80)</option>
            <option value="low">低分款 (&lt;50)</option>
          </select>
        </div>

        {/* 款式列表 */}
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
        ) : filteredStyles.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Brain className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-muted-foreground">
              {searchQuery || statusFilter ? "没有匹配的款式" : "暂无款式数据"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStyles.map((style) => {
              const scores = style.testScores;
              const overallScore = scores?.overallScore;
              const isTesting = testingIds.has(style.id);
              const badge = overallScore != null ? getScoreBadge(overallScore) : null;

              return (
                <Card
                  key={style.id}
                  className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                  onClick={() => scores && handleViewDetail(style)}
                >
                  <div className="aspect-[4/3] bg-slate-100 relative overflow-hidden">
                    {style.coverImage ? (
                      <img
                        src={style.coverImage}
                        alt={style.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Brain className="h-10 w-10 text-slate-300" />
                      </div>
                    )}
                    {overallScore != null && (
                      <div className={`absolute top-3 right-3 px-3 py-1 rounded-full text-sm font-bold ${getScoreBg(overallScore)} ${getScoreColor(overallScore)}`}>
                        {overallScore}分
                      </div>
                    )}
                    {badge && (
                      <div className="absolute top-3 left-3">
                        <Badge variant="outline" className={`text-xs ${badge.color}`}>
                          {badge.label}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium truncate">{style.name}</p>
                      <span className="text-xs text-muted-foreground">{style.styleNo}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="secondary" className="text-xs">{style.category || "未分类"}</Badge>
                      {style.price && (
                        <span className="text-xs text-muted-foreground">¥{style.price}</span>
                      )}
                    </div>

                    {scores ? (
                      <div className="space-y-1.5 mb-3">
                        {SCORE_DIMENSIONS.map((dim) => {
                          const score = scores[dim.key as keyof StyleTestScores] as number;
                          const Icon = dim.icon;
                          return (
                            <div key={dim.key} className="flex items-center gap-2">
                              <Icon className={`h-3 w-3 ${dim.color}`} />
                              <span className="text-xs text-muted-foreground flex-1">{dim.label}</span>
                              <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    score >= 80 ? "bg-green-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"
                                  }`}
                                  style={{ width: `${score}%` }}
                                />
                              </div>
                              <span className={`text-xs font-medium w-6 text-right ${getScoreColor(score)}`}>{score}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : style.aiTestResult ? (
                      <div className="mb-3 p-2 rounded bg-slate-50">
                        <p className="text-xs text-muted-foreground line-clamp-2">{style.aiTestResult.substring(0, 100)}...</p>
                      </div>
                    ) : (
                      <div className="mb-3 p-2 rounded bg-amber-50 border border-amber-100">
                        <p className="text-xs text-amber-600 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" />
                          尚未进行AI测款
                        </p>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      {!style.aiTestResult && (
                        <Button
                          size="sm"
                          className="flex-1 bg-navy-700 hover:bg-navy-800"
                          disabled={isTesting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTest(style.id);
                          }}
                        >
                          {isTesting ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          AI测款
                        </Button>
                      )}
                      {style.aiTestResult && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          disabled={isTesting}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTest(style.id);
                          }}
                        >
                          {isTesting ? (
                            <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                          )}
                          重新测款
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          router.push(`/styles/${style.id}`);
                        }}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* 测款详情弹窗 */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-purple-600" />
                AI测款分析详情
              </DialogTitle>
            </DialogHeader>
            {detailLoading ? (
              <div className="py-8 text-center">
                <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2 text-purple-600" />
                <p className="text-sm text-muted-foreground">加载中...</p>
              </div>
            ) : detailStyle && detailScores ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-purple-50 to-blue-50">
                  <div>
                    <p className="font-medium text-lg">{detailStyle.name}</p>
                    <p className="text-xs text-muted-foreground">{detailStyle.styleNo} · {detailStyle.category}</p>
                  </div>
                  <div className="text-center">
                    <p className={`text-4xl font-bold ${getScoreColor(detailScores.overallScore)}`}>
                      {detailScores.overallScore}
                    </p>
                    <p className="text-xs text-muted-foreground">综合评分</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {SCORE_DIMENSIONS.map((dim) => {
                    const score = detailScores[dim.key as keyof StyleTestScores] as number;
                    const reason = detailScores[`${dim.key}Reason` as keyof StyleTestScores] as string;
                    const Icon = dim.icon;
                    return (
                      <div key={dim.key} className={`p-3 rounded-lg ${getScoreBg(score)}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-1.5">
                            <Icon className={`h-3.5 w-3.5 ${dim.color}`} />
                            <span className="text-xs font-medium">{dim.label}</span>
                          </div>
                          <span className={`text-lg font-bold ${getScoreColor(score)}`}>{score}</span>
                        </div>
                        {reason && (
                          <p className="text-xs text-muted-foreground mt-1">{reason}</p>
                        )}
                        <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              score >= 80 ? "bg-green-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${score}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {detailScores.summary && (
                  <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-1">综合评价</p>
                    <p className="text-sm text-slate-600">{detailScores.summary}</p>
                  </div>
                )}

                {detailScores.suggestions && (
                  <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                      <p className="text-xs font-medium text-amber-700">改进建议</p>
                    </div>
                    <p className="text-sm text-amber-600">{detailScores.suggestions}</p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setDetailOpen(false);
                      handleTest(detailStyle.id);
                    }}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    重新测款
                  </Button>
                  <Button
                    className="flex-1 bg-navy-700 hover:bg-navy-800"
                    onClick={() => router.push(`/styles/${detailStyle.id}`)}
                  >
                    查看款式详情
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            ) : detailStyle?.aiTestResult ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">测款分析结果</p>
                  <div className="p-4 rounded-lg bg-slate-50 max-h-[400px] overflow-y-auto">
                    <pre className="text-sm text-slate-600 whitespace-pre-wrap font-sans">
                      {detailStyle.aiTestResult}
                    </pre>
                  </div>
                </div>
                <Button
                  className="w-full bg-navy-700 hover:bg-navy-800"
                  onClick={() => router.push(`/styles/${detailStyle.id}`)}
                >
                  查看款式详情
                </Button>
              </div>
            ) : null}
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
