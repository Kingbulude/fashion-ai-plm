"use client";

import React, { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
} from "lucide-react";

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
  const [showAnalysis, setShowAnalysis] = useState(false);

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
      // 防御：确保 styles 始终是数组
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
    setShowAnalysis(true);
    try {
      const res = await fetch("/api/aftersales/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "analyze", days: 30 }),
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

  const handlePushToDesign = async () => {
    if (!analyzeData?.suggestions?.length) return;
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
          action: "push_to_design",
          styleId: topStyle?.styleId,
          items,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showToast("success", `已推送 ${data.createdCount} 条反馈到设计端`);
      }
    } catch (err) {
      console.error("推送失败:", err);
      showToast("error", "推送失败");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

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

  const summary = {
    total: records.length,
    returns: records.filter((r: any) => r.type === "return").length,
    exchanges: records.filter((r: any) => r.type === "exchange").length,
    complaints: records.filter((r: any) => r.type === "complaint").length,
  };

  const typeConfig: Record<string, { label: string; icon: any; color: string; bg: string }> = {
    return: { label: "退货", icon: RotateCcw, color: "text-red-600", bg: "bg-red-50" },
    exchange: { label: "换货", icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50" },
    complaint: { label: "投诉", icon: MessageSquareWarning, color: "text-orange-600", bg: "bg-orange-50" },
  };

  const formatCurrency = (value: number) =>
    value ? `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "";

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">售后记录</h1>
            <p className="text-muted-foreground">退货、换货、投诉管理与复盘</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleAnalyze} disabled={analyzing}>
              <Sparkles className="h-4 w-4 mr-2" />
              {analyzing ? "分析中..." : "缺陷分析"}
            </Button>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              录入售后
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">总记录</p>
              <p className="text-xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-red-500 mb-1">退货</p>
              <p className="text-xl font-bold">{summary.returns}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-blue-500 mb-1">换货</p>
              <p className="text-xl font-bold">{summary.exchanges}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-orange-500 mb-1">投诉</p>
              <p className="text-xl font-bold">{summary.complaints}</p>
            </CardContent>
          </Card>
        </div>

        {showAnalysis && (
          <Card className="border-0 shadow-sm mb-8 bg-gradient-to-br from-amber-50 to-orange-50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-amber-600" />
                  <h3 className="font-semibold text-lg">售后缺陷分析</h3>
                  <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                    近30天
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {analyzeData?.suggestions?.length > 0 && (
                    <Button size="sm" onClick={handlePushToDesign} className="bg-amber-600 hover:bg-amber-700 text-white">
                      <Send className="h-3.5 w-3.5 mr-1.5" />
                      推送设计端
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={() => setShowAnalysis(false)}>
                    收起
                  </Button>
                </div>
              </div>

              {analyzing ? (
                <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  分析中...
                </div>
              ) : !analyzeData ? (
                <div className="py-8 text-center text-muted-foreground text-sm">
                  点击"开始分析"查看售后缺陷统计
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      缺陷分类统计
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(analyzeData.categoryStats || {})
                        .filter(([, v]: any) => v.count > 0)
                        .sort((a: any, b: any) => b[1].count - a[1].count)
                        .map(([key, data]: any) => (
                          <div key={key} className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground w-20 flex-shrink-0">
                              {data.label}
                            </span>
                            <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-amber-500 to-orange-500 rounded-full"
                                style={{
                                  width: `${Math.min(100, (data.count / (analyzeData.totalRecords || 1)) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-xs font-medium w-8 text-right">{data.count}</span>
                          </div>
                        ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" />
                      改进建议
                    </h4>
                    <div className="space-y-2 max-h-[240px] overflow-y-auto">
                      {(analyzeData.suggestions || []).map((s: any, i: number) => (
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
                          <div className="flex items-center gap-2 mb-1">
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
                          <p className="text-xs text-muted-foreground leading-relaxed">{s.suggestion}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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
        ) : records.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <ShieldAlert className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">暂无售后记录</p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              录入第一条售后
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((record) => {
              const config = typeConfig[record.type] || typeConfig.complaint;
              const Icon = config.icon;
              return (
                <Card key={record.id} className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full ${config.bg} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${config.color}`}>{config.label}</Badge>
                          <p className="font-medium">{record.styles?.name || "未知款式"}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">{record.reason}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {record.amount > 0 && <p className="font-semibold text-red-500">-{formatCurrency(record.amount)}</p>}
                      <p className="text-xs text-muted-foreground">{record.quantity || 1} 件 · {record.solution || "待处理"}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>录入售后记录</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">关联款式 *</Label>
                <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.styleId} onChange={(e) => setForm({ ...form, styleId: e.target.value })}>
                  <option value="">请选择款式</option>
                  {styles.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">类型 *</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                    <option value="return">退货</option>
                    <option value="exchange">换货</option>
                    <option value="complaint">投诉</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">状态</Label>
                  <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
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
                  <Input type="number" placeholder="件数" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">金额</Label>
                  <Input type="number" placeholder="¥" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">原因 *</Label>
                <Input placeholder="如：尺码不合适、质量问题" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">处理方案</Label>
                <Input placeholder="如：已退款、已换货" value={form.solution} onChange={(e) => setForm({ ...form, solution: e.target.value })} />
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
