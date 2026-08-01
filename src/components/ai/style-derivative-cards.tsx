// 款式衍生意图卡片
// 在 AI 对话中渲染多个设计方案，支持采纳/拒绝/修改

"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, X, Edit2, Loader2, Shirt, Palette, Package, DollarSign, ImageIcon } from "lucide-react";
import { StyleDerivativeDesign } from "@/lib/skills/handlers/style-derivative";

interface StyleDerivativeCardsProps {
  recommendationId: string;
  designs: StyleDerivativeDesign[];
  onAdopted?: () => void;
}

export function StyleDerivativeCards({ recommendationId, designs, onAdopted }: StyleDerivativeCardsProps) {
  const [loadingMap, setLoadingMap] = useState<Record<string, { action: string; loading: boolean }>>({});
  const [editDesign, setEditDesign] = useState<StyleDerivativeDesign | null>(null);
  const [editJson, setEditJson] = useState("");
  const [editError, setEditError] = useState<string | null>(null);

  const setLoading = (designId: string, action: string, loading: boolean) => {
    setLoadingMap((prev) => ({ ...prev, [designId]: { action, loading } }));
  };

  const handleAdopt = async (design: StyleDerivativeDesign) => {
    setLoading(design.id, "adopt", true);
    try {
      const res = await fetch(`/api/ai/recommendations/${recommendationId}/adopt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designId: design.id }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "采纳失败");
      onAdopted?.();
    } catch (err: any) {
      alert(err.message || "采纳失败");
    } finally {
      setLoading(design.id, "adopt", false);
    }
  };

  const handleReject = async (design: StyleDerivativeDesign, reason?: string) => {
    setLoading(design.id, "reject", true);
    try {
      const res = await fetch(`/api/ai/recommendations/${recommendationId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "拒绝失败");
    } catch (err: any) {
      alert(err.message || "拒绝失败");
    } finally {
      setLoading(design.id, "reject", false);
    }
  };

  const openEdit = (design: StyleDerivativeDesign) => {
    setEditDesign(design);
    setEditJson(JSON.stringify(design, null, 2));
    setEditError(null);
  };

  const handleModify = async () => {
    if (!editDesign) return;
    let modifiedDesign: any;
    try {
      modifiedDesign = JSON.parse(editJson);
    } catch {
      setEditError("JSON 格式错误");
      return;
    }

    setLoading(editDesign.id, "modify", true);
    try {
      const res = await fetch(`/api/ai/recommendations/${recommendationId}/modify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ designId: editDesign.id, modifiedDesign }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "保存修改失败");
      setEditDesign(null);
    } catch (err: any) {
      alert(err.message || "保存修改失败");
    } finally {
      setLoading(editDesign.id, "modify", false);
    }
  };

  return (
    <div className="space-y-3 mt-3">
      {designs.map((design) => {
        const loadingState = loadingMap[design.id];
        const isAdoptLoading = loadingState?.action === "adopt" && loadingState.loading;
        const isRejectLoading = loadingState?.action === "reject" && loadingState.loading;

        return (
          <Card key={design.id} className="border-navy-100/60 bg-white/80">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Shirt className="h-4 w-4 text-navy-600" />
                    {design.name}
                  </CardTitle>
                  <CardDescription className="text-xs mt-0.5 line-clamp-2">
                    {design.description}
                  </CardDescription>
                </div>
                {design.referenceImageUrl ? (
                  <div className="w-16 h-16 rounded-lg bg-slate-100 flex-shrink-0 overflow-hidden">
                    <img
                      src={design.referenceImageUrl}
                      alt={design.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <ImageIcon className="h-6 w-6 text-slate-300" />
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="pt-0 space-y-3">
              <div className="flex flex-wrap gap-1.5">
                {design.category && (
                  <Badge variant="outline" className="text-[10px] h-5">
                    {design.category}
                  </Badge>
                )}
                {design.targetPrice !== undefined && (
                  <Badge variant="outline" className="text-[10px] h-5 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    零售价 {design.targetPrice}
                  </Badge>
                )}
                {design.targetCost !== undefined && (
                  <Badge variant="outline" className="text-[10px] h-5 flex items-center gap-1">
                    <Package className="h-3 w-3" />
                    成本 {design.targetCost}
                  </Badge>
                )}
                {design.colors && design.colors.length > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 flex items-center gap-1">
                    <Palette className="h-3 w-3" />
                    {design.colors.length} 色
                  </Badge>
                )}
              </div>

              {design.tags && design.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {design.tags.map((tag) => (
                    <span
                      key={tag}
                      className="text-[10px] px-1.5 py-0.5 rounded-full bg-sand-100 text-sand-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              {design.bom && design.bom.length > 0 && (
                <div className="text-xs space-y-1">
                  <p className="font-medium text-muted-foreground">BOM 草案</p>
                  {design.bom.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-1 px-2 rounded bg-slate-50"
                    >
                      <span className="truncate">
                        {item.materialName}
                        {item.specification ? ` · ${item.specification}` : ""}
                      </span>
                      <span className="text-muted-foreground flex-shrink-0">
                        {item.unitConsumption} {item.unitPrice !== undefined ? `· ¥${item.unitPrice}` : ""}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <Button
                  size="sm"
                  className="h-8 text-xs bg-navy-700 hover:bg-navy-800 text-white"
                  onClick={() => handleAdopt(design)}
                  disabled={isAdoptLoading || isRejectLoading}
                >
                  {isAdoptLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <Check className="h-3.5 w-3.5 mr-1" />
                  )}
                  采纳
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs"
                  onClick={() => openEdit(design)}
                >
                  <Edit2 className="h-3.5 w-3.5 mr-1" />
                  修改
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-xs text-muted-foreground hover:text-red-600"
                  onClick={() => handleReject(design)}
                  disabled={isAdoptLoading || isRejectLoading}
                >
                  {isRejectLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                  ) : (
                    <X className="h-3.5 w-3.5 mr-1" />
                  )}
                  不感兴趣
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}

      <Dialog open={!!editDesign} onOpenChange={(v) => !v && setEditDesign(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">修改方案：{editDesign?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Textarea
              value={editJson}
              onChange={(e) => setEditJson(e.target.value)}
              className="min-h-[240px] font-mono text-xs"
            />
            {editError && <p className="text-xs text-red-600">{editError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setEditDesign(null)}>
              取消
            </Button>
            <Button
              size="sm"
              className="bg-navy-700 hover:bg-navy-800 text-white"
              onClick={handleModify}
              disabled={editDesign ? loadingMap[editDesign.id]?.action === "modify" && loadingMap[editDesign.id]?.loading : false}
            >
              保存修改
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
