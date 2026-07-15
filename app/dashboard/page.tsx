"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/auth/supabase";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Package,
  Search,
  Filter,
  Calendar,
  TrendingUp,
  Shirt,
  Clock,
  ArrowRight,
} from "lucide-react";

export default function DashboardPage() {
  const [styles, setStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    try {
      const { data, error } = await supabase.from("styles").select("*").order("createdAt", { ascending: false });
      if (data) {
        setStyles(data);
      }
    } catch (err) {
      console.error("Failed to fetch styles");
    }
    setLoading(false);
  };

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    planning: { label: "企划中", color: "text-slate-700", bg: "bg-slate-100" },
    designing: { label: "设计中", color: "text-blue-700", bg: "bg-blue-100" },
    designed: { label: "设计定稿", color: "text-indigo-700", bg: "bg-indigo-100" },
    sampling: { label: "打样中", color: "text-amber-700", bg: "bg-amber-100" },
    sampled: { label: "封样完成", color: "text-yellow-700", bg: "bg-yellow-100" },
    producing: { label: "大货生产", color: "text-green-700", bg: "bg-green-100" },
    produced: { label: "大货完成", color: "text-emerald-700", bg: "bg-emerald-100" },
    selling: { label: "销售中", color: "text-purple-700", bg: "bg-purple-100" },
    sold: { label: "销售结束", color: "text-gray-700", bg: "bg-gray-100" },
    reviewing: { label: "复盘中", color: "text-pink-700", bg: "bg-pink-100" },
    archived: { label: "已归档", color: "text-slate-500", bg: "bg-slate-100" },
  };

  const stats = [
    {
      label: "总款式数",
      value: styles.length,
      icon: Package,
      trend: "+12%",
      color: "from-blue-500 to-blue-600",
      iconBg: "bg-blue-100",
      iconColor: "text-blue-600",
    },
    {
      label: "设计中",
      value: styles.filter((s) => s.status === "designing").length,
      icon: Shirt,
      trend: "+3款",
      color: "from-indigo-500 to-indigo-600",
      iconBg: "bg-indigo-100",
      iconColor: "text-indigo-600",
    },
    {
      label: "打样中",
      value: styles.filter((s) => s.status === "sampling").length,
      icon: Clock,
      trend: "进行中",
      color: "from-amber-500 to-amber-600",
      iconBg: "bg-amber-100",
      iconColor: "text-amber-600",
    },
    {
      label: "生产中",
      value: styles.filter((s) => s.status === "producing").length,
      icon: TrendingUp,
      trend: "+2款",
      color: "from-green-500 to-green-600",
      iconBg: "bg-green-100",
      iconColor: "text-green-600",
    },
  ];

  const recentActivity = [
    { text: "新增款式 SF26SS001", time: "2小时前" },
    { text: "设计稿上传 v2", time: "5小时前" },
    { text: "打样完成", time: "昨天" },
    { text: "BOM清单确认", time: "2天前" },
  ];

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">工作台</h1>
            <p className="text-muted-foreground">管理您的服装款式全生命周期</p>
          </div>
          <Button onClick={() => router.push("/styles/new")} className="h-10 px-5">
            <Plus className="h-4 w-4 mr-2" />
            新建款式
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border-0 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                    <p className="text-xs text-green-600 mt-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {stat.trend}
                    </p>
                  </div>
                  <div className={`w-11 h-11 rounded-xl ${stat.iconBg} flex items-center justify-center`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-semibold">最近款式</h2>
                    <p className="text-sm text-muted-foreground">最新创建的款式档案</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => {}}>
                    查看全部
                    <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>

                {loading ? (
                  <div className="py-12 text-center text-muted-foreground">加载中...</div>
                ) : styles.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-muted-foreground mb-4">暂无款式档案</p>
                    <Button onClick={() => router.push("/styles/new")}>
                      <Plus className="h-4 w-4 mr-2" />
                      创建第一款
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {styles.slice(0, 5).map((style) => {
                      const status = statusConfig[style.status] || statusConfig.planning;
                      return (
                        <div
                          key={style.id}
                          className="flex items-center gap-4 p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition-colors group"
                          onClick={() => router.push(`/styles/${style.id}`)}
                        >
                          <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                            <Shirt className="h-5 w-5 text-white" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium truncate">{style.name}</h3>
                            <p className="text-sm text-muted-foreground truncate">
                              {style.styleNo} · {style.category || "未分类"} · {style.season || "-"}
                            </p>
                          </div>
                          <Badge variant="secondary" className={`${status.bg} ${status.color} border-0`}>
                            {status.label}
                          </Badge>
                          <ArrowRight className="h-4 w-4 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-1">快捷操作</h2>
                <p className="text-sm text-muted-foreground mb-4">常用功能快速访问</p>
                <div className="space-y-2">
                  <Button variant="secondary" className="w-full justify-start h-11" onClick={() => router.push("/styles/new")}>
                    <Plus className="h-4 w-4 mr-3" />
                    新建款式
                  </Button>
                  <Button variant="secondary" className="w-full justify-start h-11" onClick={() => {}}>
                    <Search className="h-4 w-4 mr-3" />
                    搜索款式
                  </Button>
                  <Button variant="secondary" className="w-full justify-start h-11" onClick={() => {}}>
                    <Filter className="h-4 w-4 mr-3" />
                    筛选视图
                  </Button>
                  <Button variant="secondary" className="w-full justify-start h-11" onClick={() => {}}>
                    <Calendar className="h-4 w-4 mr-3" />
                    上款日历
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold mb-1">最近动态</h2>
                <p className="text-sm text-muted-foreground mb-4">团队最新操作记录</p>
                <div className="space-y-4">
                  {recentActivity.map((item, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
                      <div>
                        <p className="text-sm">{item.text}</p>
                        <p className="text-xs text-muted-foreground">{item.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
