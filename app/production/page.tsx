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
  Loader2,
  Factory,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
  Scissors,
  CircleDot,
  Package,
  Plus,
  Edit,
  Trash2,
  Calendar,
  MapPin,
  ClipboardCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionPage() {
  const [styles, setStyles] = useState<any[]>([]);
  const [productionData, setProductionData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  
  const [orderForm, setOrderForm] = useState({
    styleId: "",
    quantity: "",
    factoryName: "",
    startDate: "",
    expectedDate: "",
  });

  const [qcRecords, setQcRecords] = useState<any[]>([]);

  const router = useRouter();

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const stylesRes = await fetch("/api/styles");
        const stylesData = await stylesRes.json();
        setStyles(stylesData || []);

        const prodMap: Record<string, any[]> = {};
        await Promise.all(
          (stylesData || []).slice(0, 20).map(async (s: any) => {
            try {
              const res = await fetch(`/api/styles/${s.id}/production`);
              if (res.ok) {
                const data = await res.json();
                if (data.orders?.length > 0) {
                  prodMap[s.id] = data.orders;
                }
              }
            } catch {
              // ignore
            }
          })
        );
        setProductionData(prodMap);
        loadQcRecords();
      } catch {
        console.error("获取数据失败");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const loadQcRecords = async () => {
    try {
      const res = await fetch("/api/qc-records");
      if (res.ok) {
        setQcRecords((await res.json()) || []);
      }
    } catch {
      setQcRecords([]);
    }
  };

  const allOrders = Object.entries(productionData).flatMap(([styleId, orders]) =>
    orders.map((o) => ({ ...o, styleId, styleName: styles.find((s) => s.id === styleId)?.name || "未知" }))
  );

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: "待排产", color: "text-slate-600", bg: "bg-slate-100", icon: Clock },
    cutting: { label: "裁剪中", color: "text-blue-600", bg: "bg-blue-50", icon: Scissors },
    sewing: { label: "缝制中", color: "text-amber-600", bg: "bg-amber-50", icon: CircleDot },
    finishing: { label: "后整中", color: "text-purple-600", bg: "bg-purple-50", icon: Package },
    completed: { label: "已完成", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
  };

  const summary = {
    total: allOrders.length,
    inProgress: allOrders.filter((o) => o.status !== "completed" && o.status !== "pending").length,
    completed: allOrders.filter((o) => o.status === "completed").length,
    pending: allOrders.filter((o) => o.status === "pending").length,
  };

  const handleCreateOrder = async () => {
    if (!orderForm.styleId || !orderForm.quantity) {
      showToast("error", "请选择款式并输入数量");
      return;
    }
    try {
      const res = await fetch(`/api/styles/${orderForm.styleId}/production`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quantity: Number(orderForm.quantity),
          factoryName: orderForm.factoryName || null,
          startDate: orderForm.startDate || null,
          expectedDate: orderForm.expectedDate || null,
        }),
      });
      if (!res.ok) throw new Error("创建失败");
      showToast("success", "生产订单创建成功");
      setOrderForm({ styleId: "", quantity: "", factoryName: "", startDate: "", expectedDate: "" });
      fetch("/api/styles").then(r => r.json()).then(data => setStyles(data || []));
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (err) {
      showToast("error", err instanceof Error ? err.message : "创建失败");
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">生产管理</h1>
            <p className="text-muted-foreground">生产订单、进度跟踪、制程质检</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground mb-1">总订单</p>
              <p className="text-xl font-bold">{summary.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-amber-600 mb-1">进行中</p>
              <p className="text-xl font-bold">{summary.inProgress}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-green-600 mb-1">已完成</p>
              <p className="text-xl font-bold">{summary.completed}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs text-slate-500 mb-1">待排产</p>
              <p className="text-xl font-bold">{summary.pending}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="orders" className="space-y-6">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="orders" className="gap-2">
              <Factory className="h-4 w-4" />
              <span className="hidden sm:inline">生产订单</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="gap-2">
              <ArrowRight className="h-4 w-4" />
              <span className="hidden sm:inline">进度跟踪</span>
            </TabsTrigger>
            <TabsTrigger value="qc" className="gap-2">
              <ClipboardCheck className="h-4 w-4" />
              <span className="hidden sm:inline">制程质检</span>
            </TabsTrigger>
          </TabsList>

          {/* 生产订单 */}
          <TabsContent value="orders" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    创建生产订单
                  </CardTitle>
                  <CardDescription>为款式创建新的生产订单</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">选择款式 *</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm" value={orderForm.styleId} onChange={(e) => setOrderForm({ ...orderForm, styleId: e.target.value })}>
                      <option value="">请选择款式</option>
                      {styles.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">生产数量 *</Label>
                    <Input type="number" placeholder="输入数量" value={orderForm.quantity} onChange={(e) => setOrderForm({ ...orderForm, quantity: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">工厂名称</Label>
                    <Input placeholder="输入工厂名称" value={orderForm.factoryName} onChange={(e) => setOrderForm({ ...orderForm, factoryName: e.target.value })} />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs">开始日期</Label>
                      <Input type="date" value={orderForm.startDate} onChange={(e) => setOrderForm({ ...orderForm, startDate: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">预计完成</Label>
                      <Input type="date" value={orderForm.expectedDate} onChange={(e) => setOrderForm({ ...orderForm, expectedDate: e.target.value })} />
                    </div>
                  </div>
                  <Button className="w-full" onClick={handleCreateOrder}>
                    <Plus className="h-4 w-4 mr-2" />
                    创建订单
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Factory className="h-4 w-4" />
                    订单列表
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="py-8 text-center text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                      加载中...
                    </div>
                  ) : allOrders.length === 0 ? (
                    <div className="text-center py-8">
                      <Factory className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">暂无生产订单</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allOrders.map((order) => {
                        const config = statusConfig[order.status] || statusConfig.pending;
                        const Icon = config.icon;
                        return (
                          <div key={order.id} className="p-4 bg-slate-50 rounded-lg flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className={`h-10 w-10 rounded-full ${config.bg} flex items-center justify-center`}>
                                <Icon className={`h-5 w-5 ${config.color}`} />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className={`text-xs ${config.color}`}>{config.label}</Badge>
                                  <span className="font-medium">{order.styleName}</span>
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {order.orderNumber && <span className="mr-2">订单：{order.orderNumber}</span>}
                                  <span className="mr-2">数量：{order.quantity}件</span>
                                  {order.factoryName && <span>工厂：{order.factoryName}</span>}
                                </div>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => router.push(`/styles/${order.styleId}`)}>
                              查看详情
                              <ArrowRight className="h-3 w-3 ml-1" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 进度跟踪 */}
          <TabsContent value="progress" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {allOrders.slice(0, 3).map((order) => {
                const config = statusConfig[order.status] || statusConfig.pending;
                const Icon = config.icon;
                
                const progressMap: Record<string, number> = {
                  pending: 0,
                  cutting: 25,
                  sewing: 50,
                  finishing: 75,
                  completed: 100,
                };
                
                const progress = progressMap[order.status] || 0;
                
                return (
                  <Card key={order.id} className="border-0 shadow-sm">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{order.styleName}</CardTitle>
                        <Badge variant={config.color.includes("green") ? "default" : "outline"} className={config.color}>
                          {config.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {/* 进度条 */}
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">整体进度</span>
                            <span className="font-medium">{progress}%</span>
                          </div>
                          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full" style={{ width: `${progress}%` }} />
                          </div>
                        </div>

                        {/* 工序步骤 */}
                        <div className="space-y-2">
                          {[
                            { step: "裁剪", status: progress >= 25, icon: Scissors },
                            { step: "缝制", status: progress >= 50, icon: CircleDot },
                            { step: "后整", status: progress >= 75, icon: Package },
                            { step: "质检", status: progress >= 100, icon: CheckCircle },
                          ].map((s) => (
                            <div key={s.step} className="flex items-center gap-2">
                              <div className={`h-5 w-5 rounded-full flex items-center justify-center ${s.status ? "bg-green-500 text-white" : "bg-slate-200 text-slate-400"}`}>
                                <s.icon className="h-3 w-3" />
                              </div>
                              <span className={`text-xs ${s.status ? "text-green-600" : "text-muted-foreground"}`}>{s.step}</span>
                            </div>
                          ))}
                        </div>

                        {/* 时间信息 */}
                        {order.startDate || order.expectedDate && (
                          <div className="pt-3 border-t border-slate-100 space-y-2">
                            {order.startDate && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Calendar className="h-3 w-3" />
                                <span>开始日期：{order.startDate}</span>
                              </div>
                            )}
                            {order.expectedDate && (
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                <span>预计完成：{order.expectedDate}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {allOrders.length === 0 && (
                <div className="lg:col-span-3 text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <ArrowRight className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                  <p className="text-muted-foreground">暂无生产订单进度</p>
                  <p className="text-xs text-muted-foreground mt-1">创建生产订单后查看进度</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* 制程质检 */}
          <TabsContent value="qc" className="mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <Card className="lg:col-span-1">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    添加质检记录
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <Label className="text-xs">选择款式</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">请选择款式</option>
                      {styles.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">工序</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">请选择工序</option>
                      <option value="cutting">裁剪</option>
                      <option value="sewing">缝制</option>
                      <option value="finishing">后整</option>
                      <option value="final">终检</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">结果</Label>
                    <select className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm">
                      <option value="">请选择结果</option>
                      <option value="pass">合格</option>
                      <option value="fail">不合格</option>
                      <option value="pending">待检</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">缺陷描述</Label>
                    <textarea className="h-16 w-full rounded-md border border-input bg-background px-2 text-sm" placeholder="描述发现的问题" />
                  </div>
                  <Button className="w-full">
                    <Plus className="h-4 w-4 mr-2" />
                    保存记录
                  </Button>
                </CardContent>
              </Card>

              <Card className="lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    质检记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {qcRecords.length > 0 ? (
                    <div className="space-y-3">
                      {qcRecords.map((record) => (
                        <div key={record.id} className="p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Badge variant={record.result === "pass" ? "default" : record.result === "fail" ? "outline" : "secondary"} className={record.result === "pass" ? "bg-green-100 text-green-700" : record.result === "fail" ? "bg-red-100 text-red-700" : ""}>
                                {record.result === "pass" ? "合格" : record.result === "fail" ? "不合格" : "待检"}
                              </Badge>
                              <span className="text-sm font-medium">{record.styleName || "未知款式"}</span>
                            </div>
                            <span className="text-xs text-muted-foreground">{record.createdAt?.slice(0, 10)}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            工序：{record.process || "-"} · 批次：{record.batch || "-"}
                          </div>
                          {record.defects && (
                            <div className="mt-2 text-xs text-red-600">
                              缺陷：{record.defects}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <ClipboardCheck className="h-12 w-12 text-slate-400 mx-auto mb-3" />
                      <p className="text-sm text-muted-foreground">暂无质检记录</p>
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
              {toast.type === "success" ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /> : <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />}
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