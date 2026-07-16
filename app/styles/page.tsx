"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  Search,
  Shirt,
  ImageIcon,
} from "lucide-react";

export default function StylesPage() {
  const [styles, setStyles] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/styles");
        const data = await res.json();
        setStyles(data || []);
        setFiltered(data || []);
      } catch {
        console.error("获取数据失败");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!search) {
      setFiltered(styles);
      return;
    }
    const q = search.toLowerCase();
    setFiltered(styles.filter((s) => (s.name || "").toLowerCase().includes(q) || (s.category || "").toLowerCase().includes(q)));
  }, [search, styles]);

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
            <h1 className="text-2xl font-bold mb-1">款式管理</h1>
            <p className="text-muted-foreground">全款式列表与管理</p>
          </div>
          <Button onClick={() => router.push("/dashboard")}>
            <Plus className="h-4 w-4 mr-2" />
            新建款式
          </Button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="搜索款式名称或品类..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>

        {loading ? (
          <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            加载中...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Shirt className="h-16 w-16 text-slate-400 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">
              {search ? "未找到匹配的款式" : "暂无款式"}
            </p>
            {!search && (
              <Button onClick={() => router.push("/dashboard")}>
                <Plus className="h-4 w-4 mr-2" />
                创建第一个款式
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {filtered.map((style) => (
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
