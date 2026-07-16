"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  X,
  ImageIcon,
  Tag,
} from "lucide-react";

interface InspirationBoardProps {
  planId: string;
}

interface InspirationItem {
  id: string;
  url: string;
  tags: string[];
  note: string;
}

export function InspirationBoard({ planId }: InspirationBoardProps) {
  const [items, setItems] = useState<InspirationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const [form, setForm] = useState({
    url: "",
    note: "",
  });

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    const stored = localStorage.getItem(`inspiration_${planId}`);
    if (stored) {
      try {
        setItems(JSON.parse(stored));
      } catch {
        setItems([]);
      }
    }
  }, [planId]);

  const saveToStorage = (newItems: InspirationItem[]) => {
    localStorage.setItem(`inspiration_${planId}`, JSON.stringify(newItems));
    setItems(newItems);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSave = () => {
    if (!form.url && !form.note) {
      showToast("error", "请填写链接或备注");
      return;
    }
    const newItem: InspirationItem = {
      id: Date.now().toString(),
      url: form.url,
      tags: [...tags],
      note: form.note,
    };
    const newItems = [newItem, ...items];
    saveToStorage(newItems);
    showToast("success", "灵感素材已添加");
    setDialogOpen(false);
    setForm({ url: "", note: "" });
    setTags([]);
  };

  const handleDelete = (id: string) => {
    const newItems = items.filter((i) => i.id !== id);
    saveToStorage(newItems);
    showToast("success", "已删除");
  };

  const isImageUrl = (url: string) => {
    return url.match(/\.(jpg|jpeg|png|gif|webp)$/i) || url.includes("supabase");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">灵感白板</h3>
        <Button size="sm" onClick={() => setDialogOpen(true)}>
          <Plus className="h-3 w-3 mr-2" />
          添加素材
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          <ImageIcon className="h-12 w-12 text-slate-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">暂无灵感素材</p>
          <p className="text-xs text-muted-foreground mt-1">添加图片链接、参考网址或文字备注</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="group relative bg-white rounded-lg border border-slate-100 overflow-hidden hover:shadow-md transition-shadow">
              {item.url && isImageUrl(item.url) ? (
                <div className="aspect-square bg-slate-100">
                  <img src={item.url} alt="灵感素材" className="w-full h-full object-cover" />
                </div>
              ) : item.url ? (
                <div className="aspect-square bg-slate-50 flex items-center justify-center p-4">
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 break-all line-clamp-3 hover:underline">
                    {item.url}
                  </a>
                </div>
              ) : (
                <div className="aspect-square bg-slate-50 flex items-center justify-center p-4">
                  <ImageIcon className="h-8 w-8 text-slate-300" />
                </div>
              )}
              <div className="p-3">
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {item.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                )}
                {item.note && <p className="text-xs text-muted-foreground line-clamp-2">{item.note}</p>}
              </div>
              <button
                onClick={() => handleDelete(item.id)}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-white/80 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加灵感素材</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">图片/链接</Label>
              <Input placeholder="粘贴图片URL或参考链接" value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">备注</Label>
              <Input placeholder="简短描述" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">标签</Label>
              <div className="flex items-center gap-2">
                <Input placeholder="输入标签按回车" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddTag(); } }} />
                <Button size="sm" variant="outline" onClick={handleAddTag}>
                  <Tag className="h-3 w-3" />
                </Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                      {tag} <X className="h-2 w-2 ml-1 inline" />
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>取消</Button>
            <Button onClick={handleSave}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm">
          <div className={`px-4 py-3 rounded-lg shadow-lg border flex items-start gap-3 bg-white ${toast.type === "success" ? "border-green-200" : "border-red-200"}`}>
            {toast.type === "success" ? <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" /> : <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />}
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.type === "success" ? "操作成功" : "操作失败"}</p>
              <p className="text-xs text-muted-foreground">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
