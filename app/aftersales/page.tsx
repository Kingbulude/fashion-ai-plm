"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  RotateCcw,
  MessageSquareWarning,
  ShieldAlert,
  BarChart3,
  Sparkles,
  Send,
  Search,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  Brain,
  Factory,
  ShoppingBag,
  ShieldCheck,
  FileDown,
} from "lucide-react";

const DEFECT_CATEGORIES = [
  { key: "fabric", label: "面料问题", color: "text-purple-600", bg: "bg-purple-50" },
  { key: "workmanship", label: "做工问题", color: "text-blue-600", bg: "bg-blue-50" },
  { key: "size", label: "尺码问题", color: "text-green-600", bg: "bg-green-50" },
  { key: "color", label: "颜色问题", color: "text-pink-600", bg: "bg-pink-50" },
  { key: "detail", label: "细节问题", color: "text-amber-600", bg: "bg-amber-50" },
  { key: "design", label: "设计问题", color: "text-indigo-600", bg: "bg-indigo-50" },
  { key: "other", label: "其他问题", color: "text-slate-600", bg: "bg-slate-50" },
];

const PUSH_TARGETS = [
  { key: "design", label: "设计端", icon: Sparkles, color: "bg-indigo-500" },
  { key: "production", label: "生产端", icon: Factory, color: "bg-orange-500" },
  { key: "procurement", label: "采购端", icon: ShoppingBag, color: "bg-green-500" },
  { key: "quality", label: "品控端", icon: ShieldCheck, color: "bg-blue-500" },
];

export default function AftersalesPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [styles, setStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [analyzeData, setAnalyzeData] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("records");
  const [analyzeDays, setAnalyzeDays] = useState(30);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [pushingTarget, setPushingTarget] = useState<string | null>(null);
  const [detailRecord, setDetailRecord] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [categorizing, setCategorizing] = useState(false);
  const [batchCategorizing, setBatchCategorizing] = useState(false);

  const [form, setForm] = useState({
    styleId: "",
    type: "return",
    reason: "",
    quantity: "1",
    amount: "",
    status: "pending",
    solution: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [recordsRes, stylesRes] = await Promise.all([
        fetch("/api/aftersales"),
        fetch("/api/styles"),
      ]);
      const recordsData = recordsRes.ok ? await recordsRes.json() : { records: [] };
      const stylesData = stylesRes.ok ? await stylesRes.json() : [];
      if (!recordsRes.ok && !stylesRes.ok) {
        setError("加载售后数据失败，请稍后重试");
      }
      setRecords(recordsData.records || []);
      setStyles(Array.isArray(stylesData) ? stylesData : stylesData.data || []);
    } catch (err) {
      console.error("获取售后数据失败:", err);
      setError("网络异常，加载售后数据失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch("/api/aftersales/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", days: analyzeDays }),
      });
      if (res.ok) {
        const data = await res.json();
        setAnalyzeData(data);
      }
    } catch (err) {
      console.error("分析失败:", err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handleBatchAICategorize = async () => {
    setBatchCategorizing(true);
    try {
      const res = await fetch("/api/aftersales/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batch_ai_categorize", days: analyzeDays }),
      });
      if (res.ok) {
        const data = await res.json();
        showToast("success", `AI批量分类完成：处理 ${data.processed}/${data.total} 条`);
        fetchData();
        handleAnalyze();
      }
    } catch (err) {
      console.error("批量分类失败:", err);
      showToast("error", "批量分类失败");
    } finally {
      setBatchCategorizing(false);
    }
  };

  const handleAICategorize = async (recordId: string) => {
    setCategorizing(true);
    try {
      const res = await fetch("/api/aftersales/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "ai_categorize", recordId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          showToast("success", `AI分类完成：${data.categoryLabel}`);
          fetchData();
          if (detailRecord?.id === recordId) {
            setDetailRecord({ ...detailRecord, ...data });
          }
        }
      }
    } catch (err) {
      console.error("AI分类失败:", err);
      showToast("error", "AI分类失败");
    } finally {
      setCategorizing(false);
    }
  };

  const handlePushToTarget = async (target: string) => {
    if (!analyzeData?.suggestions?.length) return;
    setPushingTarget(target);
    try {
      const items = analyzeData.suggestions.map((s: any) => ({
        category: s.category,
        title: `${s.label}优化建议`,
        description: s.suggestion,
        severity: s.severity,
        count: analyzeData.categoryStats[s.category]?.count || 0,
      }));

      const topStyle = analyzeData.topStyles?.[0];
      const res = await fetch("/api/aftersales/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "push_to_target",
          target,
          styleId: topStyle?.styleId,
          items,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast("success", `已推送 ${data.createdCount} 条反馈到${data.targetLabel}`);
      }
    } catch (err) {
      console.error("推送失败:", err);
      showToast("error", "推送失败");
    } finally {
      setPushingTarget(null);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (activeTab === "analysis" && !analyzeData && !analyzing) {
      handleAnalyze();
    }
  }, [activeTab]);

  const handleSave = async () => {
    if (!form.styleId || !form.reason) {
      showToast("error", "款式和原因不能为空");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/aftersales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId: form.styleId,
          type: form.type,
          reason: form.reason,
          quantity: form.quantity ? Number(form.quantity) : 1,
          amount: form.amount ? Number(form.amount) : null,
          status: form.status || "pending",
          solution: form.solution || null,
        }),
      });
      if (!res.ok) throw new Error("保存失败");
      showToast("success", "售后记录已添加");
      setDialogOpen(false);
      setForm({ styleId: "", type: "return", reason: "", quantity: "1", amount: "", status: "pending", solution: "" });
      fetchData();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const styleMap = useMemo(() => {
    const map: Record<string, any> = {};
    for (const s of styles) map[s.id] = s;
    return map;
  }, [styles]);

  const filteredRecords = useMemo(() => {
    let result = [...records];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter((r) => {
        const styleName = styleMap[r.styleId]?.name?.toLowerCase() || "";
        const styleNo = styleMap[r.styleId]?.styleNo?.toLowerCase() || "";
        const reason = r.reason?.toLowerCase() || "";
        return styleName.includes(q) || styleNo.includes(q) || reason.includes(q);
      });
    }
    if (typeFilter) {
      result = result.filter((r) => r.type === typeFilter);
    }
    if (statusFilter) {
      result = result.filter((r) => r.status === statusFilter);
    }
    return result;
  }, [records, searchQuery, typeFilter, statusFilter, styleMap]);

  const summary = {
    total: records.length,
    returns: records.filter((r: any) => r.type === "return").length,
    exchanges: records.filter((r: any) => r.type === "exchange").length,
    complaints: records.filter((r: any) => r.type === "complaint").length,
    pending: records.filter((r: any) => r.status === "pending").length,
    processing: records.filter((r: any) => r.status === "processing").length,
    resolved: records.filter((r: any) => r.status === "resolved").length,
    totalAmount: records.reduce((sum: number, r: any) => sum + (r.amount || 0), 0),
  };

  const typeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    return: { label: "退货", icon: RotateCcw, color: "text-red-600", bg: "bg-red-50" },
    exchange: { label: "换货", icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
    complaint: { label: "投诉", icon: MessageSquareWarning, color: "text-orange-600", bg: "bg-orange-50" },
  };

  const statusConfig: Record<string, { label: string; icon: any; color: string }> = {
    pending: { label: "待处理", icon: Clock, color: "text-amber-600" },
    processing: { label: "处理中", icon: Loader2, color: "text-blue-600" },
    resolved: { label: "已解决", icon: CheckCircle2, color: "text-green-600" },
    closed: { label: "已关闭", icon: XCircle, color: "text-slate-500" },
  };

  const formatCurrency = (value: number) =>
    value ? `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "¥0.00";

  const getCategoryInfo = (key: string) => {
    return DEFECT_CATEGORIES.find((c) => c.key === key) || DEFECT_CATEGORIES[6];
  };

  return (
    <SidebarLayout>
      <div className="max-w-[1600px]">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1">售后管理</h1>
            <p className="text-muted-foreground">退货、换货、投诉管理与缺陷复盘</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              刷新
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              录入售后
            </Button>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="records">售后记录</TabsTrigger>
            <TabsTrigger value="analysis">缺陷分析</TabsTrigger>
            <TabsTrigger value="styles">款式排行</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-slate-50">
                      <ShieldAlert className="h-5 w-5 text-slate-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold">{summary.total}</p>
                      <p className="text-xs text-muted-foreground">总记录</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-red-500">退货 {summary.returns}</span>
                    <span className="text-blue-500">换货 {summary.exchanges}</span>
                    <span className="text-orange-500">投诉 {summary.complaints}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-amber-50">
                      <Clock className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-amber-600">{summary.pending}</p>
                      <p className="text-xs text-muted-foreground">待处理</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-blue-500">处理中 {summary.processing}</span>
                    <span className="text-green-500">已解决 {summary.resolved}</span>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-red-50">
                      <DollarSign className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-red-600">{formatCurrency(summary.totalAmount)}</p>
                      <p className="text-xs text-muted-foreground">售后金额</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-muted-foreground">
                    平均单笔 {summary.total > 0 ? formatCurrency(summary.totalAmount / summary.total) : "¥0.00"}
                  </div>
                </CardContent>
              </Card>
              <Card className="border-0 shadow-sm">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-purple-50">
                      <Brain className="h-5 w-5 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-purple-600">
                        {records.filter((r: any) => r.defectCategory).length}
                      </p>
                      <p className="text-xs text-muted-foreground">已AI分类</p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs"
                      onClick={handleBatchAICategorize}
                      disabled={batchCategorizing}
                    >
                      {batchCategorizing && <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />}
                      批量AI分类
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="搜索款式名称、款号、售后原因..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">全部类型</option>
                <option value="return">退货</option>
                <option value="exchange">换货</option>
                <option value="complaint">投诉</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="h-10 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">全部状态</option>
                <option value="pending">待处理</option>
                <option value="processing">处理中</option>
                <option value="resolved">已解决</option>
                <option value="closed">已关闭</option>
              </select>
            </div>

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
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <ShieldAlert className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  {searchQuery || typeFilter || statusFilter ? "没有匹配的售后记录" : "暂无售后记录"}
                </p>
                {!searchQuery && !typeFilter && !statusFilter && (
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    录入第一条售后
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredRecords.map((record) => {
                  const config = typeConfig[record.type] || typeConfig.complaint;
                  const Icon = config.icon;
                  const statusInfo = statusConfig[record.status] || statusConfig.pending;
                  const StatusIcon = statusInfo.icon;
                  const categoryInfo = record.defectCategory ? getCategoryInfo(record.defectCategory) : null;
                  return (
                    <Card
                      key={record.id}
                      className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => {
                        setDetailRecord(record);
                        setDetailOpen(true);
                      }}
                    >
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-full ${config.bg} flex items-center justify-center`}>
                            <Icon className={`h-5 w-5 ${config.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${config.color}`}>{config.label}</Badge>
                              <p className="font-medium">{styleMap[record.styleId]?.name || "未知款式"}</p>
                              {categoryInfo && (
                                <Badge variant="secondary" className={`text-[10px] ${categoryInfo.color} ${categoryInfo.bg}`}>
                                  {categoryInfo.label}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1 max-w-md">
                              {record.reason}
                            </p>
                            <p className="text-[11px] text-muted-foreground mt-1">
                              {new Date(record.createdAt).toLocaleDateString("zh-CN")}
                              {record.quantity > 1 && ` · ${record.quantity} 件`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            {record.amount > 0 && (
                              <p className="font-semibold text-red-500">-{formatCurrency(record.amount)}</p>
                            )}
                            <div className={`flex items-center gap-1 justify-end text-xs ${statusInfo.color}`}>
                              <StatusIcon className={`h-3 w-3 ${record.status === "processing" ? "animate-spin" : ""}`} />
                              <span>{statusInfo.label}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-amber-500" />
                <h2 className="text-lg font-semibold">售后缺陷分析</h2>
              </div>
              <div className="flex items-center gap-2">
                <select
                  value={analyzeDays}
                  onChange={(e) => setAnalyzeDays(parseInt(e.target.value))}
                  className="h-9 px-3 rounded-md border border-slate-200 text-sm bg-white"
                >
                  <option value="7">近 7 天</option>
                  <option value="30">近 30 天</option>
                  <option value="90">近 90 天</option>
                </select>
                <Button variant="outline" size="sm" onClick={handleAnalyze} disabled={analyzing}>
                  {analyzing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  刷新分析
                </Button>
                <Button variant="outline" size="sm" onClick={handleBatchAICategorize} disabled={batchCategorizing || !records.length}>
                  {batchCategorizing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Brain className="h-4 w-4 mr-1.5" />
                  批量AI分类
                </Button>
              </div>
            </div>

            {analyzing && !analyzeData ? (
              <div className="py-16 text-center text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="h-5 w-5 animate-spin" />
                分析中...
              </div>
            ) : !analyzeData ? (
              <Card className="border-0 shadow-sm">
                <CardContent className="py-12 text-center">
                  <BarChart3 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                  <p className="text-muted-foreground">点击"刷新分析"查看售后缺陷统计</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-red-50">
                          <ShieldAlert className="h-5 w-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-red-600">{analyzeData.totalRecords || 0}</p>
                          <p className="text-xs text-muted-foreground">售后记录</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-amber-50">
                          <DollarSign className="h-5 w-5 text-amber-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-amber-600">{formatCurrency(analyzeData.totalAmount || 0)}</p>
                          <p className="text-xs text-muted-foreground">损失金额</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-purple-50">
                          <Brain className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-purple-600">{analyzeData.categorizedRecords || 0}</p>
                          <p className="text-xs text-muted-foreground">已AI分类</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-0 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-blue-50">
                          <Sparkles className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold text-blue-600">{analyzeData.suggestions?.length || 0}</p>
                          <p className="text-xs text-muted-foreground">改进建议</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <Card className="border-0 shadow-sm lg:col-span-2">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-amber-500" />
                        售后趋势
                      </CardTitle>
                      <CardDescription className="text-xs">近{analyzeDays}天售后数量趋势</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-48 flex items-end gap-1">
                        {(analyzeData.dailyTrend || []).map((day: any, i: number) => {
                          const maxCount = Math.max(...(analyzeData.dailyTrend || []).map((d: any) => d.count));
                          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-1">
                              <div
                                className={`w-full rounded-t-md transition-all ${
                                  day.count > (analyzeData.avgDaily || 0) ? "bg-red-400" : "bg-slate-300"
                                }`}
                                style={{ height: `${Math.max(height, 4)}%` }}
                              />
                              <span className="text-[10px] text-slate-500">{day.day}</span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
                        <span>日均: {Math.round((analyzeData.avgDaily || 0) * 10) / 10} 条</span>
                        <span className={`flex items-center gap-1 ${
                          (analyzeData.trend || 0) >= 0 ? "text-red-500" : "text-green-500"
                        }`}>
                          {(analyzeData.trend || 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {Math.abs(analyzeData.trend || 0).toFixed(1)}% 较上期
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                        缺陷分类统计
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {Object.entries(analyzeData.categoryStats || {})
                          .filter(([, v]: any) => v.count > 0)
                          .sort((a: any, b: any) => b[1].count - a[1].count)
                          .slice(0, 5)
                          .map(([key, data]: any) => {
                            const catInfo = getCategoryInfo(key);
                            return (
                              <div key={key}>
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2">
                                    <span className={`text-xs px-2 py-0.5 rounded ${catInfo.bg} ${catInfo.color}`}>
                                      {catInfo.label}
                                    </span>
                                  </div>
                                  <span className="font-semibold text-slate-700 w-8 text-right">{data.count}</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${catInfo.bg.replace("50", "400")} rounded-full`}
                                    style={{
                                      width: `${Math.min(100, (data.count / (analyzeData.totalRecords || 1)) * 100)}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500" />
                        AI 改进建议
                      </CardTitle>
                      <CardDescription className="text-xs">基于售后数据的智能改进建议</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
                        {(analyzeData.suggestions || []).map((s: any, i: number) => {
                          const catInfo = getCategoryInfo(s.category);
                          return (
                            <div
                              key={i}
                              className={`p-3 rounded-lg border ${
                                s.severity === "critical"
                                  ? "border-red-200 bg-red-50"
                                  : s.severity === "major"
                                  ? "border-amber-200 bg-amber-50"
                                  : "border-slate-200 bg-white"
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2">
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] ${
                                      s.severity === "critical"
                                        ? "bg-red-100 text-red-700 border-red-200"
                                        : s.severity === "major"
                                        ? "bg-amber-100 text-amber-700 border-amber-200"
                                        : "bg-slate-100 text-slate-600 border-slate-200"
                                    }`}
                                  >
                                    {s.severity === "critical" ? "严重" : s.severity === "major" ? "重要" : "一般"}
                                  </Badge>
                                  <span className="text-sm font-medium">{s.label}</span>
                                </div>
                                <Badge variant="secondary" className={`text-[10px] ${catInfo.color} ${catInfo.bg}`}>
                                  推送至{s.target === "design" ? "设计" : s.target === "production" ? "生产" : s.target === "procurement" ? "采购" : "品控"}
                                </Badge>
                              </div>
                              <p className="text-xs text-slate-600 leading-relaxed">{s.suggestion}</p>
                            </div>
                          );
                        })}
                        {(!analyzeData.suggestions || analyzeData.suggestions.length === 0) && (
                          <p className="text-sm text-slate-400 py-6 text-center">暂无改进建议</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-0 shadow-sm">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Package className="h-4 w-4 text-red-500" />
                        风险款式排行
                      </CardTitle>
                      <CardDescription className="text-xs">售后问题最多的款式</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {!analyzeData.topStyles?.length ? (
                        <p className="text-sm text-slate-400 py-4 text-center">暂无数据</p>
                      ) : (
                        <div className="space-y-2">
                          {analyzeData.topStyles.slice(0, 5).map((style: any, i: number) => (
                            <div key={style.styleId} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50">
                              <div
                                className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                  i === 0
                                    ? "bg-red-100 text-red-700"
                                    : i === 1
                                    ? "bg-orange-100 text-orange-700"
                                    : i === 2
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-600"
                                }`}
                              >
                                {i + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-800 truncate">{style.styleName}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-semibold text-red-600">{style.total} 条</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                <Card className="border-0 shadow-sm bg-gradient-to-br from-slate-50 to-slate-100/50">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Send className="h-4 w-4 text-navy-600" />
                      反向推送至各环节
                    </CardTitle>
                    <CardDescription className="text-xs">
                      将售后缺陷分析结果推送到对应环节，形成闭环改进
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {PUSH_TARGETS.map((target) => {
                        const TargetIcon = target.icon;
                        return (
                          <Button
                            key={target.key}
                            variant="outline"
                            className="h-auto py-4 flex flex-col items-center gap-2 hover:bg-white"
                            onClick={() => handlePushToTarget(target.key)}
                            disabled={pushingTarget === target.key || !analyzeData.suggestions?.length}
                          >
                            <div className={`p-2 rounded-lg ${target.color} text-white`}>
                              <TargetIcon className="h-5 w-5" />
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium">{target.label}</p>
                              <p className="text-[11px] text-muted-foreground">
                                {pushingTarget === target.key ? "推送中..." : "推送反馈"}
                              </p>
                            </div>
                            {pushingTarget === target.key && (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            )}
                          </Button>
                        );
                      })}
                    </div>
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-xs text-muted-foreground">
                        已推送 {analyzeData.suggestions?.filter((s: any) => s.pushed).length || 0}/{analyzeData.suggestions?.length || 0} 条建议
                      </p>
                      <Button variant="ghost" size="sm" className="h-8 text-xs">
                        <FileDown className="h-3 w-3 mr-1.5" />
                        导出分析报告
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </TabsContent>

          <TabsContent value="styles" className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Package className="h-4 w-4 text-red-500" />
                  售后款式排行
                </CardTitle>
                <CardDescription className="text-xs">按售后问题数量排序</CardDescription>
              </CardHeader>
              <CardContent>
                {!analyzeData?.topStyles?.length ? (
                  <p className="text-sm text-slate-400 py-8 text-center">暂无数据，请先运行分析</p>
                ) : (
                  <div className="space-y-2">
                    {analyzeData.topStyles.map((style: any, i: number) => (
                      <div key={style.styleId} className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50">
                        <div
                          className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                            i === 0
                              ? "bg-red-100 text-red-700"
                              : i === 1
                              ? "bg-orange-100 text-orange-700"
                              : i === 2
                              ? "bg-amber-100 text-amber-700"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">{style.styleName}</p>
                          <p className="text-xs text-slate-500">{style.styleNo}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-red-600">{style.total} 条售后</p>
                          <p className="text-xs text-slate-500">{formatCurrency(style.amount || 0)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>录入售后记录</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">关联款式 *</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                  value={form.styleId}
                  onChange={(e) => setForm({ ...form, styleId: e.target.value })}
                >
                  <option value="">请选择款式</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">类型 *</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="return">退货</option>
                    <option value="exchange">换货</option>
                    <option value="complaint">投诉</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">状态</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value })}
                  >
                    <option value="pending">待处理</option>
                    <option value="processing">处理中</option>
                    <option value="resolved">已解决</option>
                    <option value="closed">已关闭</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">数量 *</Label>
                  <Input
                    type="number"
                    placeholder="件数"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">金额</Label>
                  <Input
                    type="number"
                    placeholder="¥"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">原因 *</Label>
                <Input
                  placeholder="如：尺码不合适、质量问题"
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">处理方案</Label>
                <Input
                  placeholder="如：已退款、已换货"
                  value={form.solution}
                  onChange={(e) => setForm({ ...form, solution: e.target.value })}
                />
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

        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>售后详情</DialogTitle>
            </DialogHeader>
            {detailRecord && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">款式</p>
                    <p className="text-sm font-medium">{styleMap[detailRecord.styleId]?.name || "未知款式"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">类型</p>
                    <p className="text-sm font-medium">
                      {typeConfig[detailRecord.type]?.label || detailRecord.type}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">数量</p>
                    <p className="text-sm font-medium">{detailRecord.quantity || 1} 件</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">金额</p>
                    <p className="text-sm font-medium text-red-600">{formatCurrency(detailRecord.amount || 0)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">状态</p>
                    <p className="text-sm font-medium">
                      {statusConfig[detailRecord.status]?.label || detailRecord.status}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">创建时间</p>
                    <p className="text-sm font-medium">
                      {new Date(detailRecord.createdAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-1">售后原因</p>
                  <p className="text-sm">{detailRecord.reason}</p>
                </div>

                {detailRecord.solution && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">处理方案</p>
                    <p className="text-sm">{detailRecord.solution}</p>
                  </div>
                )}

                {detailRecord.defectCategory ? (
                  <div className="p-3 rounded-lg bg-purple-50 border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <p className="text-sm font-medium text-purple-700">AI 分类结果</p>
                      {detailRecord.aiConfidence != null && (
                        <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-300">
                          置信度 {Math.round((detailRecord.aiConfidence || 0) * 100)}%
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-purple-600 font-medium">缺陷分类：</span>
                        <span className="text-sm">{getCategoryInfo(detailRecord.defectCategory).label}</span>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            detailRecord.defectSeverity === "critical"
                              ? "bg-red-100 text-red-700 border-red-200"
                              : detailRecord.defectSeverity === "major"
                              ? "bg-amber-100 text-amber-700 border-amber-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {detailRecord.defectSeverity === "critical"
                            ? "严重"
                            : detailRecord.defectSeverity === "major"
                            ? "重要"
                            : "一般"}
                        </Badge>
                      </div>
                      {detailRecord.rootCause && (
                        <p className="text-xs text-purple-700">
                          <span className="font-medium">根本原因：</span>
                          {detailRecord.rootCause}
                        </p>
                      )}
                      {detailRecord.designSuggestion && (
                        <p className="text-xs text-purple-700">
                          <span className="font-medium">改进建议：</span>
                          {detailRecord.designSuggestion}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <Button variant="outline" className="w-full" onClick={() => handleAICategorize(detailRecord.id)} disabled={categorizing}>
                    {categorizing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    <Brain className="h-4 w-4 mr-2" />
                    AI 智能分类
                  </Button>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailOpen(false)}>关闭</Button>
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
