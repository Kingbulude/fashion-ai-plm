// 品牌详情页 - 品牌 DNA + 季节列表 + 款式统计

"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Shirt,
  Loader2,
  AlertCircle,
  Palette,
  Tag,
  Sparkles,
  Target,
  Edit,
  Plus,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  planning: { label: "企划中", color: "text-slate-700", bg: "bg-slate-100" },
  designing: { label: "设计中", color: "text-blue-700", bg: "bg-blue-100" },
  sampling: { label: "打样中", color: "text-amber-700", bg: "bg-amber-100" },
  producing: { label: "生产中", color: "text-green-700", bg: "bg-green-100" },
  selling: { label: "销售中", color: "text-purple-700", bg: "bg-purple-100" },
  archived: { label: "已归档", color: "text-slate-500", bg: "bg-slate-50" },
};

const SEASON_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  upcoming: { label: "未开始", color: "bg-slate-50 text-slate-700" },
  active: { label: "进行中", color: "bg-green-50 text-green-700" },
  closed: { label: "已结束", color: "bg-slate-50 text-slate-500" },
};

export default function BrandDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBrand();
  }, [id]);

  const fetchBrand = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/brands/${id}`);
      if (!res.ok) throw new Error("获取品牌失败");
      const json = await res.json();
      setData(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <SidebarLayout>
        <div className="py-20 text-center text-slate-500 flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          加载品牌信息...
        </div>
      </SidebarLayout>
    );
  }

  if (error || !data) {
    return (
      <SidebarLayout>
        <div className="p-6">
          <Button variant="ghost" onClick={() => router.push("/brands")} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回品牌列表
          </Button>
          <Card className="border-red-200 bg-red-50">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <AlertCircle className="h-5 w-5 text-red-500" />
                <p className="text-red-700">{error || "品牌不存在"}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </SidebarLayout>
    );
  }

  const { brand, dna, seasons, stats } = data;
  const stageStats = stats?.stageStats || {};
  const stageEntries: [string, number][] = Object.entries(stageStats as Record<string, number>).sort((a, b) => b[1] - a[1]);

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1400px] mx-auto">
        {/* 顶部导航 */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900">{brand.name}</h1>
                <p className="text-sm text-slate-500">
                  {brand.description || "时尚品牌"}
                  {brand.target_audience && ` · 定位：${brand.target_audience}`}
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm">
            <Edit className="h-4 w-4 mr-2" />
            编辑品牌
          </Button>
        </div>

        {/* 4 大指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-blue-50">
                  <Shirt className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{stats.totalStyles}</p>
              <p className="text-xs text-slate-500 mt-0.5">款式总数</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-purple-50">
                  <Calendar className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">{seasons.length}</p>
              <p className="text-xs text-slate-500 mt-0.5">季节总数</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-green-50">
                  <Sparkles className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {seasons.filter((s: any) => s.status === "active").length}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">活跃季节</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="p-2 rounded-lg bg-amber-50">
                  <Tag className="h-4 w-4 text-amber-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-slate-900">
                {dna ? Object.keys(dna).filter((k) => !["id", "brandId", "createdAt", "updatedAt"].includes(k) && dna[k]).length : 0}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">DNA 维度</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* 品牌 DNA */}
          <div className="lg:col-span-2">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-indigo-500" />
                      品牌 DNA
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">品牌的核心定位与风格特征</CardDescription>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Edit className="h-3.5 w-3.5 mr-1.5" />
                    编辑
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {dna ? (
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "stylePositioning", label: "风格定位", icon: Palette, color: "text-blue-600" },
                      { key: "targetAudience", label: "目标客群", icon: Target, color: "text-purple-600" },
                      { key: "priceRange", label: "价格区间", icon: Tag, color: "text-green-600" },
                      { key: "designPhilosophy", label: "设计理念", icon: Sparkles, color: "text-amber-600" },
                      { key: "coreColors", label: "核心色系", icon: Palette, color: "text-pink-600" },
                      { key: "materialPreference", label: "材质偏好", icon: Tag, color: "text-indigo-600" },
                    ].map((item) => {
                      const value = dna[item.key];
                      if (!value) return null;
                      return (
                        <div key={item.key} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-1.5 mb-1">
                            <item.icon className={`h-3.5 w-3.5 ${item.color}`} />
                            <p className="text-xs text-slate-500">{item.label}</p>
                          </div>
                          <p className="text-sm font-medium text-slate-800">
                            {Array.isArray(value) ? value.join("、") : value}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Sparkles className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm mb-3">尚未配置品牌 DNA</p>
                    <Button variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1.5" />
                      配置品牌 DNA
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 阶段分布 */}
          <div>
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">款式阶段分布</CardTitle>
                <CardDescription className="text-xs">各阶段款式数量</CardDescription>
              </CardHeader>
              <CardContent>
                {stageEntries.length === 0 ? (
                  <p className="text-sm text-slate-400 py-6 text-center">暂无款式</p>
                ) : (
                  <div className="space-y-2.5">
                    {stageEntries.slice(0, 6).map(([status, count]: any) => {
                      const config = STATUS_LABELS[status] || STATUS_LABELS.planning;
                      const pct = stats.totalStyles > 0 ? (count / stats.totalStyles) * 100 : 0;
                      return (
                        <div key={status}>
                          <div className="flex items-center justify-between mb-1">
                            <Badge variant="outline" className={`${config.bg} ${config.color} border-0 text-xs`}>
                              {config.label}
                            </Badge>
                            <span className="text-sm font-semibold text-slate-700">{count}</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                status === "selling" ? "bg-purple-400" :
                                status === "producing" ? "bg-green-400" :
                                status === "sampling" ? "bg-amber-400" :
                                "bg-slate-300"
                              }`}
                              style={{ width: `${pct}%` }}
                            />
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

        {/* 季节列表 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-purple-500" />
                  季节管理
                </CardTitle>
                <CardDescription className="text-xs mt-1">品牌的季节企划与款式分布</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                新增季节
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {seasons.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-10 w-10 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">暂无季节</p>
                <p className="text-xs text-slate-400 mt-1">创建第一个季节以组织款式</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {seasons.map((s: any) => {
                  const statusConfig = SEASON_STATUS_CONFIG[s.status] || SEASON_STATUS_CONFIG.upcoming;
                  const styleCount = stats.seasonStyles[s.id] || 0;
                  return (
                    <div key={s.id} className="p-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-slate-800">{s.name}</p>
                          <Badge variant="outline" className={`${statusConfig.color} border-0 text-xs`}>
                            {statusConfig.label}
                          </Badge>
                          <Badge variant="secondary" className="text-[10px]">
                            {s.seasonType || s.season_type}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-500">
                          {s.startDate?.split("T")[0] || s.start_date?.split("T")[0]} ~ {s.endDate?.split("T")[0] || s.end_date?.split("T")[0]}
                          {styleCount > 0 && ` · ${styleCount} 个款式`}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {styleCount > 0 && (
                          <Link href={`/styles?seasonId=${s.id}`}>
                            <Button variant="ghost" size="sm">
                              查看款式
                              <ChevronRight className="h-3.5 w-3.5 ml-1" />
                            </Button>
                          </Link>
                        )}
                        <Button variant="ghost" size="icon">
                          <Edit className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </SidebarLayout>
  );
}
