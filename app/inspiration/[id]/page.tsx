"use client";

export const runtime = "edge";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Plus,
  Image,
  Tag,
  Search,
  Loader2,
  Sparkles,
  ExternalLink,
  Grid3X3,
  LayoutList,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface InspirationItem {
  id: string;
  title: string | null;
  description: string | null;
  imageUrl: string;
  sourceUrl: string | null;
  sourceType: string;
  tags: string[];
  category: string | null;
  colorTags: string[];
  styleTags: string[];
}

export default function InspirationBoardDetailPage() {
  const params = useParams();
  const boardId = params.id as string;
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "masonry">("grid");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InspirationItem | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    imageUrl: "",
    sourceUrl: "",
    tags: "",
    category: "",
  });
  const [board, setBoard] = useState<any>(null);

  const fetchItems = useCallback(async () => {
    if (!boardId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedTag) params.set("tag", selectedTag);
      const res = await fetch(`/api/inspiration-boards/${boardId}/items?${params}`);
      if (res.ok) {
        const data = await res.json();
        setItems(data.items || []);
        setAllTags(data.allTags || []);
      }
    } catch (err) {
      console.error("获取灵感素材失败:", err);
    } finally {
      setLoading(false);
    }
  }, [boardId, selectedTag]);

  const fetchBoardInfo = useCallback(async () => {
    if (!boardId) return;
    try {
      const res = await fetch(`/api/inspiration-boards`);
      if (res.ok) {
        const data = await res.json();
        const found = (data || []).find((b: any) => b.id === boardId);
        if (found) setBoard(found);
      }
    } catch {
      // 忽略
    }
  }, [boardId]);

  useEffect(() => {
    fetchBoardInfo();
    fetchItems();
  }, [fetchBoardInfo, fetchItems]);

  const handleAddItem = async () => {
    if (!form.imageUrl.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inspiration-boards/${boardId}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title || null,
          description: form.description || null,
          imageUrl: form.imageUrl,
          sourceUrl: form.sourceUrl || null,
          tags: form.tags
            ? form.tags
                .split(",")
                .map((t) => t.trim())
                .filter(Boolean)
            : [],
          category: form.category || null,
        }),
      });
      if (res.ok) {
        setDialogOpen(false);
        setForm({ title: "", description: "", imageUrl: "", sourceUrl: "", tags: "", category: "" });
        fetchItems();
      }
    } catch (err) {
      console.error("添加失败:", err);
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (search) {
      const q = search.toLowerCase();
      const title = item.title || "";
      const desc = item.description || "";
      const tags = (item.tags || []).join(" ");
      if (
        !title.toLowerCase().includes(q) &&
        !desc.toLowerCase().includes(q) &&
        !tags.toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    return true;
  });

  return (
    <SidebarLayout>
      <div className="max-w-[1800px]">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <Link
              href="/inspiration"
              className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              返回白板列表
            </Link>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center shadow-premium">
                <Sparkles className="h-4 w-4 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">
                {board?.title || "灵感白板"}
              </h1>
            </div>
            <p className="text-sm text-muted-foreground ml-10">
              {board?.itemCount !== undefined ? `${board.itemCount} 张素材` : "加载中..."}
              {board?.description && ` · ${board.description}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-xl border border-border bg-card p-0.5 shadow-sm">
              <button
                onClick={() => setViewMode("grid")}
                className={`px-3 h-8 text-xs font-medium flex items-center gap-1 rounded-lg transition-all ${
                  viewMode === "grid"
                    ? "bg-navy-700 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Grid3X3 className="h-3.5 w-3.5" />
                网格
              </button>
              <button
                onClick={() => setViewMode("masonry")}
                className={`px-3 h-8 text-xs font-medium flex items-center gap-1 rounded-lg transition-all ${
                  viewMode === "masonry"
                    ? "bg-navy-700 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <LayoutList className="h-3.5 w-3.5" />
                瀑布流
              </button>
            </div>
            <Button
              onClick={() => setDialogOpen(true)}
              className="bg-navy-700 hover:bg-navy-800 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              添加素材
            </Button>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="搜索素材标题、标签..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">标签筛选：</span>
            <Badge
              variant="outline"
              className={`cursor-pointer ${
                selectedTag === null
                  ? "bg-navy-100 text-navy-700 border-navy-200"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100"
              }`}
              onClick={() => setSelectedTag(null)}
            >
              全部
            </Badge>
            {allTags.slice(0, 10).map((tag) => (
              <Badge
                key={tag}
                variant="outline"
                className={`cursor-pointer ${
                  selectedTag === tag
                    ? "bg-purple-100 text-purple-700 border-purple-200"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                }`}
                onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
              >
                <Tag className="h-3 w-3 mr-1" />
                {tag}
              </Badge>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            加载中...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 flex items-center justify-center mx-auto mb-4">
              <Image className="h-8 w-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-medium mb-2">
              {search || selectedTag ? "没有匹配的素材" : "还没有灵感素材"}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {search || selectedTag ? "试试其他搜索条件" : "添加第一张灵感图片，开始你的素材收集"}
            </p>
            {!search && !selectedTag && (
              <Button onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                添加素材
              </Button>
            )}
          </div>
        ) : (
          <div
            className={`grid gap-4 ${
              viewMode === "grid"
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
                : "columns-2 md:columns-3 lg:columns-4 xl:columns-5"
            }`}
          >
            {filteredItems.map((item) => (
              <Card
                key={item.id}
                className={`border-0 shadow-sm hover:shadow-md transition-all overflow-hidden cursor-pointer group ${
                  viewMode === "masonry" ? "mb-4 break-inside-avoid" : ""
                }`}
                onClick={() => setSelectedItem(item)}
              >
                <div className="relative bg-slate-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.title || "灵感素材"}
                    className={`w-full object-cover ${
                      viewMode === "grid" ? "aspect-square" : ""
                    }`}
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all" />
                  {(item.tags?.length || 0) > 0 && (
                    <div className="absolute bottom-2 left-2 right-2 flex flex-wrap gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {item.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          className="bg-white/90 backdrop-blur-sm text-slate-700 text-[10px]"
                        >
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {item.title && (
                  <CardContent className="p-3">
                    <p className="text-sm font-medium line-clamp-1">{item.title}</p>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>添加灵感素材</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="space-y-1">
                <Label>图片 URL *</Label>
                <Input
                  placeholder="https://example.com/image.jpg"
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                />
              </div>
              {form.imageUrl && (
                <div className="rounded-lg border border-border overflow-hidden bg-slate-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.imageUrl}
                    alt="预览"
                    className="w-full h-48 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
              <div className="space-y-1">
                <Label>标题</Label>
                <Input
                  placeholder="素材标题（可选）"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>描述</Label>
                <textarea
                  className="w-full h-20 rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  placeholder="描述这个素材的特点..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>分类</Label>
                  <Input
                    placeholder="如：面料、款式、色彩"
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>来源链接</Label>
                  <Input
                    placeholder="https://..."
                    value={form.sourceUrl}
                    onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label>标签</Label>
                <Input
                  placeholder="多个标签用逗号分隔，如：复古,格纹,大地色"
                  value={form.tags}
                  onChange={(e) => setForm({ ...form, tags: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                取消
              </Button>
              <Button onClick={handleAddItem} disabled={saving || !form.imageUrl.trim()}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                添加
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
          <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
            {selectedItem && (
              <div className="flex flex-col md:flex-row max-h-[80vh]">
                <div className="md:w-2/3 bg-slate-100 flex items-center justify-center min-h-[300px] md:min-h-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={selectedItem.imageUrl}
                    alt={selectedItem.title || "灵感素材"}
                    className="max-w-full max-h-[50vh] md:max-h-[80vh] object-contain"
                  />
                </div>
                <div className="md:w-1/3 p-6 flex flex-col">
                  <div className="flex-1 overflow-y-auto space-y-4">
                    {selectedItem.title && (
                      <div>
                        <h3 className="font-semibold text-lg">{selectedItem.title}</h3>
                      </div>
                    )}
                    {selectedItem.description && (
                      <div>
                        <p className="text-sm text-muted-foreground">{selectedItem.description}</p>
                      </div>
                    )}
                    {selectedItem.category && (
                      <div>
                        <Label className="text-xs text-muted-foreground">分类</Label>
                        <p className="text-sm font-medium mt-1">{selectedItem.category}</p>
                      </div>
                    )}
                    {(selectedItem.tags?.length || 0) > 0 && (
                      <div>
                        <Label className="text-xs text-muted-foreground">标签</Label>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedItem.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                    {selectedItem.sourceUrl && (
                      <div>
                        <Label className="text-xs text-muted-foreground">来源</Label>
                        <a
                          href={selectedItem.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-navy-600 hover:underline flex items-center gap-1 mt-1"
                        >
                          查看来源
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SidebarLayout>
  );
}
