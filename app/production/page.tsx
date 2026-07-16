"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Factory,
  CheckCircle,
  Clock,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProductionPage() {
  const [styles, setStyles] = useState<any[]>([]);
  const [productionData, setProductionData] = useState<Record<string, any[]>>({});
  const [loading, setLoading] = useState(true);
  const router = useRouter();

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
      } catch {
        console.error("获取数据失败");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const allOrders = Object.entries(productionData).flatMap(([styleId, orders]) =>
    orders.map((o) => ({ ...o, styleId, styleName: styles.find((s) => s.id === styleId)?.name || "未知" }))
  );

  const statusConfig: Record<string, { label: string; color: string; bg: string; icon: any }> = {
    pending: { label: "待排产", color: "text-slate-600", bg: "bg-slate-100", icon: Clock },
    cutting: { label: "裁剪中", color: "text-blue-600", bg: "bg-blue-50", icon: Factory },
    sewing: { label: "缝制中", color: "text-amber-600", bg: "bg-amber-50", icon: Factory },
    finishing: { label: "后整中", color: "text-purple-600", bg: "bg-purple-50", icon: Factory },
    completed: { label: "已完成", color: "text-green-600", bg: "bg-green-50", icon: CheckCircle },
  };

  const summary = {
    total: allOrders.length,
    inProgress: allOrders.filter((o) => o.status !== "completed" && o.status !== "pending").length,
    completed: allOrders.filter((o) => o.status === "completed").length,
    pending: allOrders.filter((o) => o.status === "pending").length,
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">生产管理</h1>
            <p className="text-muted-foreground">全款式生产订单统一管理</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
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

        {loading ? (
          <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : allOrders.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Factory className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">暂无生产订单</p>
            <p className="text-xs text-muted-foreground">请在款式详情页的生产 Tab 中创建</p>
          </div>
        ) : (
          <div className="space-y-3">
            {allOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const Icon = config.icon;
              return (
                <Card key={order.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/styles/${order.styleId}`)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full ${config.bg} flex items-center justify-center`}>
                        <Icon className={`h-5 w-5 ${config.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={`text-xs ${config.color}`}>{config.label}</Badge>
                          <p className="font-medium">{order.styleName}</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          订单号：{order.orderNumber || "-"} · 数量：{order.quantity}件 · 工厂：{order.factoryName || "-"}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-400" />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
