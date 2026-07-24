"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Palette,
  ImageIcon,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AIAssistantPanel } from "@/components/ai/ai-assistant-panel";

export default function DesignPage() {
  const [styles, setStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/styles");
      if (res.ok) {
        const data = await res.json();
        // 防御：确保 styles 始终是数组
        setStyles(Array.isArray(data) ? data : data.data || []);
      } else {
        setError("加载设计资产失败，请稍后重试");
        setStyles([]);
      }
    } catch (err) {
      console.error("获取设计资产失败:", err);
      setError("网络异常，加载设计资产失败");
      setStyles([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; color: string }> = {
      draft: { label: "草稿", color: "text-slate-600" },
      pending: { label: "待审", color: "text-amber-600" },
      approved: { label: "已确认", color: "text-green-600" },
      rejected: { label: "已驳回", color: "text-red-600" },
    };
    const c = config[status] || config.draft;
    return <Badge variant="outline" className={`text-xs ${c.color}`}>{c.label}</Badge>;
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold mb-1">设计资产</h1>
            <p className="text-muted-foreground">全款式设计稿与素材库</p>
          </div>
        </div>

        <div className="flex gap-6">
          <div className="flex-1 min-w-0">
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
        ) : styles.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Palette className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-muted-foreground">暂无设计资产</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {styles.map((style) => (
              <Card key={style.id} className="border-0 shadow-sm cursor-pointer hover:shadow-md transition-shadow overflow-hidden" onClick={() => router.push(`/styles/${style.id}`)}>
                <div className="aspect-[3/4] bg-slate-100 flex items-center justify-center">
                  {style.coverImage ? (
                    <img src={style.coverImage} alt={style.name} className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="h-12 w-12 text-slate-300" />
                  )}
                </div>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    {getStatusBadge(style.status)}
                    <span className="text-xs text-muted-foreground">{style.category || "未分类"}</span>
                  </div>
                  <p className="font-medium text-sm truncate">{style.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{style.seasonId || "无季节"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
          </div>

          <div className="w-80 flex-shrink-0 hidden xl:block">
            <AIAssistantPanel processNode="design" title="设计 AI 助手" />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
