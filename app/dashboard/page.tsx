"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  BarChart3,
  Calendar,
} from "lucide-react";

export default function DashboardPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    totalStyles: 0,
    avgLeadTime: 0,
    returnRate: 0,
    fulfillmentRate: 0,
  });
  const [recentSales, setRecentSales] = useState<any[]>([]);
  const [recentAftersales, setRecentAftersales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [salesRes, aftersalesRes, stylesRes] = await Promise.all([
          fetch("/api/sales"),
          fetch("/api/aftersales"),
          fetch("/api/styles"),
        ]);

        const salesData = await salesRes.json();
        const aftersalesData = await aftersalesRes.json();
        const stylesData = await stylesRes.json();

        const totalRevenue = salesData.summary?.totalRevenue || 0;
        const totalOrders = salesData.summary?.totalQuantity || 0;
        const totalStyles = stylesData.length || 0;
        const totalAftersales = aftersalesData.summary?.totalCount || 0;
        const returnCount = aftersalesData.summary?.returnCount || 0;

        const returnRate = totalOrders > 0 ? ((returnCount / totalOrders) * 100).toFixed(1) : "0";
        const fulfillmentRate = totalStyles > 0 ? "85.2" : "0";

        setStats({
          totalRevenue,
          totalOrders,
          totalStyles,
          avgLeadTime: 15,
          returnRate: parseFloat(returnRate),
          fulfillmentRate: parseFloat(fulfillmentRate),
        });

        setRecentSales(salesData.sales?.slice(0, 5) || []);
        setRecentAftersales(aftersalesData.records?.slice(0, 5) || []);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (value: number) => {
    return `¥${value.toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const statCards = [
    {
      title: "总销售额",
      value: formatCurrency(stats.totalRevenue),
      icon: ShoppingCart,
      trend: "+12.5%",
      trendUp: true,
      description: "本月累计",
    },
    {
      title: "订单数量",
      value: stats.totalOrders,
      icon: Package,
      trend: "+8.3%",
      trendUp: true,
      description: "本月累计",
    },
    {
      title: "款式总数",
      value: stats.totalStyles,
      icon: BarChart3,
      trend: "+15",
      trendUp: true,
      description: "本季新增",
    },
    {
      title: "平均交期",
      value: `${stats.avgLeadTime}天`,
      icon: Calendar,
      trend: "-2天",
      trendUp: true,
      description: "较上期",
    },
    {
      title: "退货率",
      value: `${stats.returnRate}%`,
      icon: AlertTriangle,
      trend: stats.returnRate > 5 ? "+0.8%" : "-0.5%",
      trendUp: stats.returnRate > 5,
      description: "行业平均5%",
    },
    {
      title: "齐套率",
      value: `${stats.fulfillmentRate}%`,
      icon: CheckCircle,
      trend: "+3.2%",
      trendUp: true,
      description: "目标90%",
    },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">数据看板</h1>
            <p className="text-muted-foreground">全链路业务数据概览</p>
          </div>
          <Button variant="outline">
            <Calendar className="h-4 w-4 mr-2" />
            今日数据
          </Button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
              {statCards.map((card, index) => (
                <Card key={index} className="border-0 shadow-sm">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2 rounded-lg ${index < 4 ? "bg-blue-50" : index === 4 ? "bg-orange-50" : "bg-green-50"}`}>
                        <card.icon className={`h-4 w-4 ${index < 4 ? "text-blue-600" : index === 4 ? "text-orange-600" : "text-green-600"}`} />
                      </div>
                      <div className={`flex items-center gap-1 text-xs font-medium ${card.trendUp ? "text-green-600" : "text-red-600"}`}>
                        {card.trendUp ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                        {card.trend}
                      </div>
                    </div>
                    <p className="text-2xl font-bold mb-1">{card.value}</p>
                    <p className="text-xs text-muted-foreground">{card.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">近期销售</CardTitle>
                      <CardDescription>最近5笔销售记录</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">查看全部</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentSales.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">暂无销售记录</div>
                  ) : (
                    <div className="space-y-3">
                      {recentSales.map((sale) => (
                        <div key={sale.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                          <div>
                            <p className="font-medium text-sm">{sale.styles?.name || "未知款式"}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(sale.saleDate).toLocaleDateString("zh-CN")}
                              {sale.channel && ` · ${sale.channel}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">+{formatCurrency(sale.amount)}</p>
                            <p className="text-xs text-muted-foreground">{sale.quantity}件</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">售后记录</CardTitle>
                      <CardDescription>最近5笔售后记录</CardDescription>
                    </div>
                    <Button variant="outline" size="sm">查看全部</Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {recentAftersales.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground text-sm">暂无售后记录</div>
                  ) : (
                    <div className="space-y-3">
                      {recentAftersales.map((record) => (
                        <div key={record.id} className="flex items-center justify-between py-3 border-b border-slate-100 last:border-0">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className={`text-xs ${record.type === "return" ? "text-red-600 border-red-200" : record.type === "exchange" ? "text-blue-600 border-blue-200" : "text-orange-600 border-orange-200"}`}>
                                {record.type === "return" ? "退货" : record.type === "exchange" ? "换货" : "投诉"}
                              </Badge>
                              <p className="font-medium text-sm">{record.styles?.name || "未知款式"}</p>
                            </div>
                            <p className="text-xs text-muted-foreground">{record.reason}</p>
                          </div>
                          <div className="text-right">
                            {record.amount && <p className="font-semibold text-red-500">-{formatCurrency(record.amount)}</p>}
                            <p className="text-xs text-muted-foreground">
                              {record.resolution || "待处理"}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
              <Card className="border-0 shadow-sm lg:col-span-2">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">销售趋势</CardTitle>
                  <CardDescription>近7天销售额</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-slate-50 rounded-lg flex items-end justify-around p-4">
                    {[12000, 18000, 15000, 22000, 19000, 25000, 28000].map((value, index) => (
                      <div key={index} className="flex flex-col items-center gap-2">
                        <div className="w-10 bg-blue-500 rounded-t-md transition-all hover:bg-blue-600" style={{ height: `${(value / 30000) * 100}%` }} />
                        <span className="text-xs text-muted-foreground">周{index + 1}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg">品类销售占比</CardTitle>
                  <CardDescription>按品类统计</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "连衣裙", value: 35, color: "bg-pink-500" },
                      { name: "T恤", value: 25, color: "bg-blue-500" },
                      { name: "裤装", value: 20, color: "bg-green-500" },
                      { name: "外套", value: 15, color: "bg-orange-500" },
                      { name: "配饰", value: 5, color: "bg-purple-500" },
                    ].map((item, index) => (
                      <div key={index}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{item.name}</span>
                          <span className="text-sm font-medium">{item.value}%</span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </SidebarLayout>
  );
}
