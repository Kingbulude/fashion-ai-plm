"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Palette,
  ImageIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

export default function DesignPage() {
  const [styles, setStyles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/styles");
        if (res.ok) {
          const data = await res.json();
          // 防御：确保 styles 始终是数组
          setStyles(Array.isArray(data) ? data : data.data || []);
        } else {
          setStyles([]);
        }
      } catch {
        console.error("获取数据失败");
        setStyles([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

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

        {loading ? (
          <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
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
                  <p className="text-xs text-muted-foreground mt-1">{style.season || "无季节"}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
