// 款式售后 Tab - 退货/换货/投诉管理
// 款式维度的售后明细，与 /analytics 联动

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Plus,
  Loader2,
  RotateCcw,
  RefreshCw,
  MessageSquareWarning,
  X,
  Calendar,
  TrendingDown,
  ShieldAlert,
} from "lucide-react";

const TYPE_CONFIG: Record<string, { label: string; icon: any; color: string; bg: string; border: string }> = {
  return: { label: "退货", icon: RotateCcw, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
  exchange: { label: "换货", icon: RefreshCw, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
  complaint: { label: "投诉", icon: MessageSquareWarning, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
};

export function StyleAfterSalesTab({ styleId, styleName }: { styleId: string; styleName: string }) {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    type: "return",
    reason: "",
    quantity: "1",
    amount: "",
    status: "pending",
    solution: "",
  });

  useEffect(() => {
    fetchRecords();
  }, [styleId]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/styles/${styleId}/aftersales`);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      }
    } catch (err) {
      console.error("获取售后数据失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!form.reason) {
      alert("请填写原因");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/aftersales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId,
          type: form.type,
          reason: form.reason,
          quantity: form.quantity ? Number(form.quantity) : 1,
          amount: form.amount ? Number(form.amount) : null,
          status: form.status || "pending",
          solution: form.solution || null,
        }),
      });
      if (!res.ok) throw new Error("创建失败");
      setShowAdd(false);
      setForm({ type: "return", reason: "", quantity: "1", amount: "", status: "pending", solution: "" });
      fetchRecords();
    } catch (err: any) {
      alert(err.message || "创建失败");
    } finally {
      setSubmitting(false);
    }
  };

  // 统计
  const stats = {
    total: records.length,
    return: records.filter((r) => r.type === "return").length,
    exchange: records.filter((r) => r.type === "exchange").length,
    complaint: records.filter((r) => r.type === "complaint").length,
    totalAmount: records.reduce((s, r) => s + (r.amount || 0), 0),
  };

  return (
    <div className="space-y-4">
      {/* 顶部统计 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-slate-50">
                <ShieldAlert className="h-4 w-4 text-slate-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900">{stats.total}</p>
            <p className="text-xs text-slate-500 mt-0.5">总售后数</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-red-50">
                <RotateCcw className="h-4 w-4 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.return}</p>
            <p className="text-xs text-slate-500 mt-0.5">退货</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-blue-50">
                <RefreshCw className="h-4 w-4 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-blue-600">{stats.exchange}</p>
            <p className="text-xs text-slate-500 mt-0.5">换货</p>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="p-2 rounded-lg bg-amber-50">
                <MessageSquareWarning className="h-4 w-4 text-amber-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-amber-600">{stats.complaint}</p>
            <p className="text-xs text-slate-500 mt-0.5">投诉</p>
          </CardContent>
        </Card>
      </div>

      {/* 操作栏 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">售后明细</h3>
          <p className="text-xs text-slate-500 mt-0.5">款式「{styleName}」的售后记录</p>
        </div>
        <Button onClick={() => setShowAdd(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          录入售后
        </Button>
      </div>

      {/* 售后列表 */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-16 text-center text-slate-500 flex items-center justify-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              加载中...
            </div>
          ) : records.length === 0 ? (
            <div className="py-16 text-center">
              <ShieldAlert className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-500">暂无售后记录</p>
              <p className="text-sm text-slate-400 mt-1">点击右上角录入第一条售后</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {records.map((r) => {
                const config = TYPE_CONFIG[r.type] || TYPE_CONFIG.complaint;
                const Icon = config.icon;
                return (
                  <div key={r.id} className="p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                        <Icon className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Badge variant="outline" className={`${config.color} ${config.bg} ${config.border}`}>
                            {config.label}
                          </Badge>
                          {r.amount > 0 && (
                            <span className="text-sm font-semibold text-red-600">
                              -¥{r.amount.toLocaleString("zh-CN")}
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px]">
                            {r.quantity || 1} 件
                          </Badge>
                          {r.status && (
                            <Badge variant="outline" className="text-[10px]">
                              {r.status === "pending" ? "待处理" : r.status === "processing" ? "处理中" : r.status === "resolved" ? "已解决" : r.status === "closed" ? "已关闭" : r.status}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-800 mb-1">{r.reason}</p>
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {r.createdAt?.split("T")[0] || "-"}
                          </span>
                          {r.solution && (
                            <>
                              <span>·</span>
                              <span>处理：{r.solution}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 录入售后弹窗 */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">录入售后记录</CardTitle>
                <CardDescription className="text-xs">{styleName}</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setShowAdd(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-xs">售后类型 *</Label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {Object.entries(TYPE_CONFIG).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setForm({ ...form, type: k })}
                      className={`p-2 rounded-lg border-2 text-xs font-medium transition-all ${
                        form.type === k
                          ? `${v.bg} ${v.color} ${v.border}`
                          : "border-slate-200 text-slate-500 hover:border-slate-300"
                      }`}
                    >
                      <v.icon className="h-3.5 w-3.5 inline mr-1" />
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-xs">原因 *</Label>
                <Input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  placeholder="如：尺码不合适、质量问题"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">数量 *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    placeholder="件数"
                  />
                </div>
                <div>
                  <Label className="text-xs">金额（可选）</Label>
                  <Input
                    type="number"
                    min="0"
                    value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })}
                    placeholder="元"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
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
                <div>
                  <Label className="text-xs">处理方案</Label>
                  <Input
                    value={form.solution}
                    onChange={(e) => setForm({ ...form, solution: e.target.value })}
                    placeholder="如：已退款、已换货"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-3">
                <Button variant="outline" onClick={() => setShowAdd(false)}>取消</Button>
                <Button onClick={handleAdd} disabled={submitting}>
                  {submitting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  保存
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
