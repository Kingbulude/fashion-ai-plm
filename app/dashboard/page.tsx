"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/auth/supabase";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toCamelCase } from "@/lib/db/mappers";
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

interface ActivityItem {
  text: string;
  time: string;
  date: Date;
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "刚刚";
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString("zh-CN", { month: "short", day: "numeric" });
}

export default function DashboardPage() {
  const [styles, setStyles] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);
  const [activityLoading, setActivityLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchStyles();
    fetchRecentActivity();
  }, []);

  const fetchStyles = async () => {
    try {
      const { data, error } = await supabase.from("styles").select("*").order("created_at", { ascending: false });
      if (data) {
        setStyles(toCamelCase<any[]>(data) || []);
      }
    } catch (err) {
      console.error("Failed to fetch styles");
    }
    setLoading(false);
  };

  const fetchRecentActivity = async () => {
    setActivityLoading(true);
    try {
      // 并行查询多个表获取最近动态
      const [stylesRes, assetsRes, techPacksRes, samplingRes, qcRes, bomRes] = await Promise.all([
        supabase.from("styles").select("name, style_no, created_at, updated_at").order("created_at", { ascending: false }).limit(3),
        supabase.from("design_assets").select("file_name, version, created_at, styles:style_id(name, style_no)").order("created_at", { ascending: false }).limit(2),
        supabase.from("tech_packs").select("version, created_at, styles:style_id(name, style_no)").order("created_at", { ascending: false }).limit(2),
        supabase.from("sampling_records").select("round, status, created_at, styles:style_id(name, style_no)").order("created_at", { ascending: false }).limit(2),
        supabase.from("qc_records").select("type, created_at, styles:style_id(name, style_no)").order("created_at", { ascending: false }).limit(2),
        supabase.from("bom_items").select("material_name, created_at, styles:style_id(name, style_no)").order("created_at", { ascending: false }).limit(2),
      ]);

      const activities: ActivityItem[] = [];

      if (stylesRes.data) {
        for (const s of stylesRes.data) {
          const camel = toCamelCase<any>(s);
          if (!camel) continue;
          activities.push({
            text: `新增款式 ${camel.styleNo || camel.name}`,
            time: formatTimeAgo(new Date(camel.createdAt)),
            date: new Date(camel.createdAt),
          });
        }
      }

      if (assetsRes.data) {
        for (const a of assetsRes.data) {
          const camel = toCamelCase<any>(a);
          if (!camel) continue;
          const styleName = camel.styles?.name || "";
          activities.push({
            text: `${styleName} 上传设计稿 v${camel.version || 1}`,
            time: formatTimeAgo(new Date(camel.createdAt)),
            date: new Date(camel.createdAt),
          });
        }
      }

      if (techPacksRes.data) {
        for (const t of techPacksRes.data) {
          const camel = toCamelCase<any>(t);
          if (!camel) continue;
          const styleName = camel.styles?.name || "";
          activities.push({
            text: `${styleName} 生成工艺包 v${camel.version || 1}`,
            time: formatTimeAgo(new Date(camel.createdAt)),
            date: new Date(camel.createdAt),
          });
        }
      }

      if (samplingRes.data) {
        for (const s of samplingRes.data) {
          const camel = toCamelCase<any>(s);
          if (!camel) continue;
          const styleName = camel.styles?.name || "";
          const statusMap: Record<string, string> = {
            pending: "待发送", in_progress: "打样中", received: "已收到",
            reviewing: "审版中", approved: "通过", rejected: "退回",
          };
          activities.push({
            text: `${styleName} 第${camel.round || 1}轮打样${statusMap[camel.status] || ""}`,
            time: formatTimeAgo(new Date(camel.createdAt)),
            date: new Date(camel.createdAt),
          });
        }
      }

      if (qcRes.data) {
        for (const q of qcRes.data) {
          const camel = toCamelCase<any>(q);
          if (!camel) continue;
          const styleName = camel.styles?.name || "";
          const typeMap: Record<string, string> = {
            incoming: "来料检", sampling_review: "样衣检", in_process: "过程检",
            final: "成品检", warehouse_inspection: "入库检",
          };
          activities.push({
            text: `${styleName} ${typeMap[camel.type] || camel.type}`,
            time: formatTimeAgo(new Date(camel.createdAt)),
            date: new Date(camel.createdAt),
          });
        }
      }

      if (bomRes.data) {
        for (const b of bomRes.data) {
          const camel = toCamelCase<any>(b);
          if (!camel) continue;
          const styleName = camel.styles?.name || "";
          activities.push({
            text: `${styleName} 新增 BOM 物料 ${camel.materialName || ""}`,
            time: formatTimeAgo(new Date(camel.createdAt)),
            date: new Date(camel.createdAt),
          });
        }
      }

      // 按时间倒序取前 8 条
      activities.sort((a, b) => b.date.getTime() - a.date.getTime());
      setRecentActivity(activities.slice(0, 8));
    } catch {
      // ignore
    }
    setActivityLoading(false);
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

  const filteredStyles = searchQuery.trim()
    ? styles.filter(
        (s) =>
          s.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.styleNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.season?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : styles;

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

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">工作台</h1>
            <p className="text-muted-foreground">管理您的服装款式全生命周期</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索款号、名称、品类..."
                className="pl-9 h-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={() => router.push("/styles/new")} className="h-10 px-4">
              <Plus className="h-4 w-4 mr-2" />
              新建款式
            </Button>
          </div>
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
                    <h2 className="text-lg font-semibold">
                      {searchQuery ? `搜索结果 (${filteredStyles.length})` : "最近款式"}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery ? "匹配的款式档案" : "最新创建的款式档案"}
                    </p>
                  </div>
                  {searchQuery && (
                    <Button variant="ghost" size="sm" onClick={() => setSearchQuery("")}>
                      清除搜索
                    </Button>
                  )}
                </div>

                {loading ? (
                  <div className="py-12 text-center text-muted-foreground">加载中...</div>
                ) : filteredStyles.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Package className="h-8 w-8 text-slate-400" />
                    </div>
                    <p className="text-muted-foreground mb-4">
                      {searchQuery ? "未找到匹配的款式" : "暂无款式档案"}
                    </p>
                    {!searchQuery && (
                      <Button onClick={() => router.push("/styles/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        创建第一款
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredStyles.slice(0, 10).map((style) => {
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
                {activityLoading ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">加载中...</div>
                ) : recentActivity.length === 0 ? (
                  <div className="py-8 text-center text-muted-foreground text-sm">暂无动态</div>
                ) : (
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
