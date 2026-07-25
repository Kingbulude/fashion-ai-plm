"use client";

import { useState, useEffect } from "react";
import { useTenant } from "@/lib/auth/tenant-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Filter,
  Search,
  ChevronRight,
  X,
  RefreshCw,
  TrendingDown,
  Palette,
  Sparkles,
  Calendar,
} from "lucide-react";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; label: string }> = {
  critical: { color: "text-red-700", bg: "bg-red-50", border: "border-red-200", label: "严重" },
  major: { color: "text-amber-700", bg: "bg-amber-50", border: "border-amber-200", label: "重要" },
  minor: { color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", label: "一般" },
};

const STATUS_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  pending: { color: "text-amber-600", bg: "bg-amber-100", label: "待处理" },
  in_progress: { color: "text-blue-600", bg: "bg-blue-100", label: "处理中" },
  resolved: { color: "text-emerald-600", bg: "bg-emerald-100", label: "已解决" },
  closed: { color: "text-slate-600", bg: "bg-slate-100", label: "已关闭" },
};

const CATEGORY_LABELS: Record<string, string> = {
  fabric: "面料问题",
  workmanship: "做工问题",
  size: "尺码问题",
  color: "颜色问题",
  detail: "细节问题",
  design: "设计问题",
  other: "其他问题",
};

export default function DesignFeedbackPage() {
  const { currentBrand, currentCompany, currentSeason } = useTenant();
  const [feedbackItems, setFeedbackItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState<any>(null);

  const getHeaders = () => ({
    "x-company-id": currentCompany?.id || "",
    "x-brand-id": currentBrand?.id || "",
    "x-season-id": currentSeason?.id || "",
  });

  useEffect(() => {
    fetchFeedback();
  }, [currentBrand?.id, currentSeason?.id]);

  const fetchFeedback = async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    try {
      const res = await fetch("/api/design-feedback", { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setFeedbackItems(data.items || []);
      }
    } catch (err) {
      console.error("获取设计反馈失败:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleStatusUpdate = async (itemId: string, newStatus: string) => {
    try {
      await fetch("/api/design-feedback", {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getHeaders() },
        body: JSON.stringify({ id: itemId, status: newStatus }),
      });
      setFeedbackItems((prev: any[]) =>
        prev.map((item) => (item.id === itemId ? { ...item, status: newStatus } : item))
      );
      setSelectedItem((prev: any | null) => (prev?.id === itemId ? { ...prev, status: newStatus } : prev));
    } catch (err) {
      console.error("更新状态失败:", err);
    }
  };

  const filteredItems = feedbackItems.filter((item) => {
    if (statusFilter !== "all" && item.status !== statusFilter) return false;
    if (severityFilter !== "all" && item.severity !== severityFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.description?.toLowerCase().includes(q) ||
        item.styles?.styleNo?.toLowerCase().includes(q) ||
        item.styles?.styleName?.toLowerCase().includes(q) ||
        CATEGORY_LABELS[item.defectCategory || ""]?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const stats = {
    total: feedbackItems.length,
    pending: feedbackItems.filter((i) => i.status === "pending").length,
    inProgress: feedbackItems.filter((i) => i.status === "in_progress").length,
    resolved: feedbackItems.filter((i) => i.status === "resolved").length,
    critical: feedbackItems.filter((i) => i.severity === "critical").length,
    major: feedbackItems.filter((i) => i.severity === "major").length,
  };

  const categoryStats: Record<string, number> = {};
  for (const item of feedbackItems) {
    const cat = item.defectCategory || "other";
    categoryStats[cat] = (categoryStats[cat] || 0) + 1;
  }

  return (
    <div className="p-6 lg:p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">设计反馈中心</h1>
          <p className="text-sm text-slate-500">
            售后问题反向迭代，数据驱动设计优化
          </p>
        </div>
        <Button variant="outline" onClick={() => fetchFeedback(true)} disabled={refreshing}>
          <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshing ? "animate-spin" : ""}`} />
          刷新
        </Button>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-slate-50">
                <TrendingDown className="h-4 w-4 text-slate-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">反馈总数</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
            <p className="text-xs text-slate-500 mt-0.5">待处理</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <Sparkles className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.inProgress}</p>
            <p className="text-xs text-slate-500 mt-0.5">处理中</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-emerald-50">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{stats.resolved}</p>
            <p className="text-xs text-slate-500 mt-0.5">已解决</p>
          </CardContent>
        </Card>
      </div>

      {/* 风险预警 */}
      {(stats.critical > 0 || stats.major > 0) && (
        <Card className={`border-l-4 ${stats.critical > 0 ? "border-l-red-500" : "border-l-amber-500"} mb-6`}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className={`h-5 w-5 ${stats.critical > 0 ? "text-red-500" : "text-amber-500"}`} />
              <div>
                <p className="font-medium text-slate-900">
                  {stats.critical > 0 ? "严重" : "重要"}问题预警
                </p>
                <p className="text-sm text-slate-600">
                  当前有 {stats.critical} 个严重问题和 {stats.major} 个重要问题待处理，请优先关注
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* 筛选和分类统计 */}
        <div className="lg:col-span-1 space-y-4">
          {/* 搜索框 */}
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="搜索标题、款式、分类..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardContent>
          </Card>

          {/* 状态筛选 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Filter className="h-4 w-4 text-slate-500" />
                状态筛选
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {["all", "pending", "in_progress", "resolved", "closed"].map((status) => (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      statusFilter === status
                        ? "bg-blue-50 text-blue-700 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {status === "all" ? "全部" : STATUS_CONFIG[status]?.label || status}
                    {status !== "all" && (
                      <span className="ml-2 text-xs opacity-70">
                        {status === "pending"
                          ? stats.pending
                          : status === "in_progress"
                          ? stats.inProgress
                          : status === "resolved"
                          ? stats.resolved
                          : feedbackItems.filter((i) => i.status === status).length}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 严重程度筛选 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">严重程度</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {["all", "critical", "major", "minor"].map((severity) => (
                  <button
                    key={severity}
                    onClick={() => setSeverityFilter(severity)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      severityFilter === severity
                        ? "bg-red-50 text-red-700 font-medium"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {severity === "all" ? "全部" : SEVERITY_CONFIG[severity]?.label || severity}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 分类统计 */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Palette className="h-4 w-4 text-purple-500" />
                问题分类
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(categoryStats).map(([cat, count]) => {
                  const total = feedbackItems.length || 1;
                  const pct = (count / total) * 100;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="text-slate-600">{CATEGORY_LABELS[cat] || cat}</span>
                        <span className="text-slate-500">{count} ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 反馈列表 */}
        <div className="lg:col-span-3">
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">反馈列表</CardTitle>
                <Badge variant="secondary">{filteredItems.length} 条</Badge>
              </div>
              <CardDescription className="text-xs">售后问题反向推送到设计端的反馈记录</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="py-16 text-center text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  加载中...
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="py-16 text-center">
                  <CheckCircle2 className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                  <p className="text-slate-500">暂无反馈记录</p>
                  <p className="text-sm text-slate-400 mt-1">售后问题将自动推送到这里</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredItems.map((item) => {
                    const severityConfig = SEVERITY_CONFIG[item.severity] || SEVERITY_CONFIG.minor;
                    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                    return (
                      <div
                        key={item.id}
                        onClick={() => setSelectedItem(item)}
                        className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                          selectedItem?.id === item.id ? "bg-blue-50/50" : ""
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-2 rounded-lg ${severityConfig.bg} flex-shrink-0`}>
                            {item.severity === "critical" ? (
                              <AlertTriangle className={`h-4 w-4 ${severityConfig.color}`} />
                            ) : item.severity === "major" ? (
                              <Sparkles className={`h-4 w-4 ${severityConfig.color}`} />
                            ) : (
                              <Palette className={`h-4 w-4 ${severityConfig.color}`} />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              <Badge
                                variant="outline"
                                className={`${severityConfig.color} ${severityConfig.bg} ${severityConfig.border} text-xs`}
                              >
                                {severityConfig.label}
                              </Badge>
                              <Badge
                                className={`${statusConfig.bg} ${statusConfig.color} text-xs`}
                              >
                                {statusConfig.label}
                              </Badge>
                              {item.defectCategory && (
                                <Badge variant="outline" className="text-xs">
                                  {CATEGORY_LABELS[item.defectCategory]}
                                </Badge>
                              )}
                            </div>
                            <h3 className="font-medium text-slate-900 mb-1">{item.title}</h3>
                            <p className="text-sm text-slate-600 line-clamp-2 mb-2">
                              {item.description || "暂无描述"}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-slate-500">
                              {item.styles?.styleNo && (
                                <span>款式：{item.styles.styleNo}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {item.createdAt?.split("T")[0] || "-"}
                              </span>
                              {item.occurrenceCount && item.occurrenceCount > 1 && (
                                <span className="text-amber-600">重复 {item.occurrenceCount} 次</span>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-300 flex-shrink-0" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 详情弹窗 */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-lg">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{selectedItem.title}</CardTitle>
                <CardDescription className="text-xs">设计反馈详情</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setSelectedItem(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 基本信息 */}
              <div className="flex items-center gap-3">
                <Badge
                  variant="outline"
                  className={`${SEVERITY_CONFIG[selectedItem.severity]?.border} ${SEVERITY_CONFIG[selectedItem.severity]?.color} ${SEVERITY_CONFIG[selectedItem.severity]?.bg}`}
                >
                  {SEVERITY_CONFIG[selectedItem.severity]?.label}
                </Badge>
                <Badge className={`${STATUS_CONFIG[selectedItem.status]?.bg} ${STATUS_CONFIG[selectedItem.status]?.color}`}>
                  {STATUS_CONFIG[selectedItem.status]?.label}
                </Badge>
                {selectedItem.defectCategory && (
                  <Badge variant="outline">{CATEGORY_LABELS[selectedItem.defectCategory]}</Badge>
                )}
              </div>

              {/* 描述 */}
              <div>
                <Label className="text-xs mb-1 block">问题描述</Label>
                <div className="p-3 bg-slate-50 rounded-lg text-sm text-slate-700">
                  {selectedItem.description || "暂无描述"}
                </div>
              </div>

              {/* 关联款式 */}
              {selectedItem.styles && (
                <div>
                  <Label className="text-xs mb-1 block">关联款式</Label>
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="font-medium text-blue-900">
                      {selectedItem.styles.styleName || selectedItem.styles.styleNo}
                    </p>
                    {selectedItem.styles.styleNo && (
                      <p className="text-xs text-blue-700 mt-0.5">{selectedItem.styles.styleNo}</p>
                    )}
                  </div>
                </div>
              )}

              {/* 发生次数 */}
              {selectedItem.occurrenceCount && (
                <div>
                  <Label className="text-xs mb-1 block">发生次数</Label>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-amber-600">
                      {selectedItem.occurrenceCount}
                    </span>
                    <span className="text-sm text-slate-600">次</span>
                    {selectedItem.occurrenceCount > 5 && (
                      <Badge className="ml-2 bg-amber-100 text-amber-700">高频问题</Badge>
                    )}
                  </div>
                </div>
              )}

              {/* 关联售后记录 */}
              {selectedItem.relatedAftersaleIds && selectedItem.relatedAftersaleIds.length > 0 && (
                <div>
                  <Label className="text-xs mb-1 block">关联售后记录</Label>
                  <div className="flex flex-wrap gap-1">
                    {selectedItem.relatedAftersaleIds.slice(0, 5).map((id: string) => (
                      <Badge key={id} variant="outline" className="text-xs">
                        {id.slice(-8)}
                      </Badge>
                    ))}
                    {selectedItem.relatedAftersaleIds.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{selectedItem.relatedAftersaleIds.length - 5}
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* 创建时间 */}
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Calendar className="h-3 w-3" />
                创建于 {selectedItem.createdAt?.split("T")[0] || "-"}
              </div>

              {/* 操作按钮 */}
              <div className="pt-4 border-t border-slate-100">
                <Label className="text-xs mb-2 block">更新状态</Label>
                <div className="flex flex-wrap gap-2">
                  {["pending", "in_progress", "resolved", "closed"].map((status) => (
                    <Button
                      key={status}
                      variant={selectedItem.status === status ? "default" : "outline"}
                      size="sm"
                      onClick={() => handleStatusUpdate(selectedItem.id, status)}
                    >
                      {STATUS_CONFIG[status]?.label || status}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}