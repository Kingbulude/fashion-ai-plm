"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Loader2,
  Images,
  CheckCircle,
  AlertCircle,
  Download,
} from "lucide-react";
import { MARKETING_SCENES } from "@/lib/ai/marketing-scenes";

interface MarketingImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  styleId: string;
  styleName?: string;
  onGenerated?: () => void;
}

interface GeneratedImage {
  sceneId: string;
  sceneLabel: string;
  imageUrl: string;
  prompt: string;
  assetId?: string;
}

type Stage = "idle" | "generating" | "done" | "error";

export function MarketingImagesDialog({
  open,
  onOpenChange,
  styleId,
  styleName,
  onGenerated,
}: MarketingImagesDialogProps) {
  const [selectedSceneIds, setSelectedSceneIds] = useState<string[]>(
    MARKETING_SCENES.map((s) => s.id)
  );
  const [customInstruction, setCustomInstruction] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [images, setImages] = useState<GeneratedImage[]>([]);

  const toggleScene = (sceneId: string) => {
    setSelectedSceneIds((prev) =>
      prev.includes(sceneId) ? prev.filter((id) => id !== sceneId) : [...prev, sceneId]
    );
  };

  const handleGenerate = async () => {
    if (selectedSceneIds.length === 0) {
      setError("请至少选择一个场景");
      return;
    }

    setStage("generating");
    setError("");
    setImages([]);

    try {
      const res = await fetch("/api/ai/marketing-images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId,
          sceneIds: selectedSceneIds,
          customInstruction: customInstruction.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "营销图生成失败");
      }

      const data = await res.json();
      setImages(data.images || []);
      setStage("done");
      onGenerated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "营销图生成失败";
      setError(msg);
      setStage("error");
    }
  };

  const reset = () => {
    setSelectedSceneIds(MARKETING_SCENES.map((s) => s.id));
    setCustomInstruction("");
    setStage("idle");
    setError("");
    setImages([]);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Images className="h-4 w-4 text-navy-700" />
            AI 营销场景图自动生成
          </DialogTitle>
          <DialogDescription>
            一次性生成多场景营销图（棚拍/模特/街拍/细节/平铺/生活）
            {styleName ? ` · ${styleName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 场景选择 */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">选择场景（{selectedSceneIds.length}/{MARKETING_SCENES.length}）</p>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedSceneIds(MARKETING_SCENES.map((s) => s.id))}
                disabled={stage === "generating"}
                className="h-7 px-2 text-xs"
              >
                全选
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelectedSceneIds([])}
                disabled={stage === "generating"}
                className="h-7 px-2 text-xs"
              >
                全不选
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {MARKETING_SCENES.map((scene) => {
              const checked = selectedSceneIds.includes(scene.id);
              return (
                <button
                  key={scene.id}
                  type="button"
                  onClick={() => toggleScene(scene.id)}
                  disabled={stage === "generating"}
                  className={`text-left p-3 rounded-lg border transition-all ${
                    checked
                      ? "border-navy-500 bg-navy-50 ring-1 ring-navy-500"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  } ${stage === "generating" ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium">{scene.label}</p>
                    {checked && <CheckCircle className="h-3.5 w-3.5 text-navy-600" />}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {scene.id === "studio_main" && "白底主图，电商上架用"}
                    {scene.id === "model_front" && "模特全身，展示上身效果"}
                    {scene.id === "street_style" && "街拍场景，社交推广"}
                    {scene.id === "detail_closeup" && "细节特写，展示工艺"}
                    {scene.id === "flat_lay" && "平铺展示，搭配道具"}
                    {scene.id === "lifestyle_scene" && "生活场景，氛围渲染"}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* 自定义指令 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">额外要求（可选）</p>
          <textarea
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            placeholder="例如：秋冬款、女性目标人群、气质优雅风格、加入围巾搭配"
            className="w-full min-h-[60px] p-3 text-sm rounded-lg border border-slate-200 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none resize-none"
            disabled={stage === "generating"}
          />
        </div>

        {/* 生成中状态 */}
        {stage === "generating" && (
          <div className="flex flex-col items-center justify-center py-8 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-navy-700" />
            <p className="text-sm text-muted-foreground">
              AI 正在生成 {selectedSceneIds.length} 张营销图，请稍候...
            </p>
            <p className="text-xs text-muted-foreground">每张图约需 10-15 秒</p>
          </div>
        )}

        {/* 结果展示 */}
        {stage === "done" && images.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span>成功生成 {images.length} 张营销图，已自动保存到「设计资产 → AI营销」</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {images.map((img) => (
                <div
                  key={img.sceneId}
                  className="border border-slate-200 rounded-lg overflow-hidden bg-white"
                >
                  <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
                    <img
                      src={img.imageUrl}
                      alt={img.sceneLabel}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="p-2 flex items-center justify-between">
                    <Badge variant="secondary" className="bg-navy-50 text-navy-700">
                      {img.sceneLabel}
                    </Badge>
                    <a
                      href={img.imageUrl}
                      download={`AI营销图_${img.sceneLabel}.png`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-navy-700 hover:text-navy-900 flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" />
                      下载
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={stage === "generating"}
          >
            {stage === "done" ? "完成" : "取消"}
          </Button>
          {stage !== "done" && (
            <Button
              onClick={handleGenerate}
              disabled={selectedSceneIds.length === 0 || stage === "generating"}
              className="bg-navy-700 hover:bg-navy-800 text-white"
            >
              {stage === "generating" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {stage === "generating"
                ? "生成中..."
                : `生成 ${selectedSceneIds.length} 张营销图`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
