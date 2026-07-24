"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  LayoutGrid,
  Plus,
  Image,
  Tag,
  Search,
  Calendar,
  Loader2,
  Palette,
  Sparkles,
  ChevronRight,
  Trash2,
  Edit,
  X,
} from "lucide-react";
import { useTenant } from "@/lib/auth/tenant-context";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InspirationBoard {
  id: string;
  title: string;
  description: string | null;
  themeTags: string[];
  coverImageUrl: string | null;
  itemCount: number;
  createdAt: string;
}

export default function InspirationPage() {
  const { currentBrand } = useTenant();
  const [boards, setBoards] = useState<InspirationBoard[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    themeTags: "",
    coverImageUrl: "",
  });

  useEffect(() => {
    fetchBoards();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBrand?.id]);

  const fetchBoards = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (currentBrand?.id) params.set("brandId", currentBrand.id);
      const res = await fetch(`/api/inspiration-boards?${params}`);
      if (res.ok) {
        const data = await res.json();
        setBoards(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("获取灵感白板失败:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/inspiration-boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || null,
          brandId: currentBrand?.id || null,
          themeTags: form.themeTags
            ? form.themeTags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          coverImageUrl: form.coverImageUrl || null,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm({ title: "", description: "", themeTags: "", coverImageUrl: "" });
        fetchBoards();
      }
    } catch (err) {
      console.error("创建失败:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[1800px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center shadow-premium">
                <Palette className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">灵感白板</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              企划阶段的视觉素材聚合，按主题管理灵感图片与标签
            </p>
          </div>
          <Button onClick={() => setDialogOpen(true)} className="bg-navy-700 hover:bg-navy-800 text-white">
            <Plus className="h-4 w-4 mr-2" />
            新建白板
          </Button>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载中...
          </div>
        ) : boards.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
              <Image className="h-8 w-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">还没有灵感白板</h3>
            <p className="text-sm text-muted-foreground mb-6">
              创建第一个白板，开始收集你的设计灵感
            </p>
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              新建白板
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {boards.map((board) => (
              <Link key={board.id} href={`/inspiration/${board.id}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-all overflow-hidden group cursor-pointer h-full">
                  <div className="aspect-[4/3] bg-gradient-to-br from-purple-100 via-pink-50 to-amber-100 relative overflow-hidden">
                    {board.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={board.coverImageUrl}
                        alt={board.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-purple-300" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-white/90 backdrop-blur-sm text-slate-700">
                        <Image className="h-3 w-3 mr-1" />
                        {board.itemCount}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <h3 className="font-medium mb-1 group-hover:text-navy-700 transition-colors">
                      {board.title}
                    </h3>
                    {board.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {board.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(board.createdAt).toLocaleDateString("zh-CN")}
                      </div>
                      {board.themeTags && board.themeTags.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-3 w-3 text-purple-500" />
                          <span className="text-xs text-purple-600">
                            {board.themeTags[0]}
                            {board.themeTags.length > 1 && ` +${board.themeTags.length - 1}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>新建灵感白板</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>白板标题</Label>
                <Input
                  placeholder="例如：24秋冬大衣灵感"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>描述</Label>
                <textarea
                  className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="描述这个白板的主题和用途..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>主题标签</Label>
                <Input
                  placeholder="多个标签用逗号分隔，如：复古,格纹,大地色"
                  value={form.themeTags}
                  onChange={(e) => setForm({ ...form, themeTags: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>封面图 URL（可选）</Label>
                <Input
                  placeholder="https://..."
                  value={form.coverImageUrl}
                  onChange={(e) => setForm({ ...form, coverImageUrl: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleCreate} disabled={saving || !form.title.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                创建
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );
}
