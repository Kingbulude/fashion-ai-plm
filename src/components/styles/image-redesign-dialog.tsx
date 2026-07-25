"use client";

import { useState, useCallback } from "react";
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
  Wand2,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";
import { REDESIGN_PRESETS, type RedesignPreset } from "@/lib/ai/redesign-presets";

interface AssetOption {
  id: string;
  fileName: string;
  fileUrl?: string;
  thumbnailUrl?: string;
  type: string;
}

interface ImageRedesignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  styleId: string;
  styleName?: string;
  assets?: AssetOption[];
  onGenerated?: () => void;
}

type Stage = "idle" | "generating" | "done" | "error";

interface RedesignResult {
  imageUrl: string;
  summary: string;
  styleType: string;
  colors: string[];
  prompt: string;
  asset?: { id: string } | null;
}

export function ImageRedesignDialog({
  open,
  onOpenChange,
  styleId,
  styleName,
  assets = [],
  onGenerated,
}: ImageRedesignDialogProps) {
  const [presets] = useState<RedesignPreset[]>(REDESIGN_PRESETS);
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [instruction, setInstruction] = useState("");
  const [sourceAssetId, setSourceAssetId] = useState<string | "">("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<RedesignResult | null>(null);

  const reset = useCallback(() => {
    setSelectedPresetId(null);
    setInstruction("");
    setSourceAssetId("");
    setStage("idle");
    setError("");
    setResult(null);
  }, []);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handlePresetClick = (preset: RedesignPreset) => {
    setSelectedPresetId(preset.id);
    setInstruction(preset.hint);
  };

  const handleGenerate = async () => {
    if (!instruction.trim()) {
      setError("请输入改款指令");
      return;
    }

    setStage("generating");
    setError("");
    setResult(null);

    try {
      const res = await fetch("/api/ai/image-redesign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          styleId,
          sourceAssetId: sourceAssetId || undefined,
          instruction: instruction.trim(),
          saveAsAsset: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "AI 改款失败");
      }

      const data: RedesignResult = await res.json();
      setResult(data);
      setStage("done");
      onGenerated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI 改款失败";
      setError(msg);
      setStage("error");
    }
  };

  const handleClose = () => {
    if (stage === "done") {
      handleOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-4 w-4 text-navy-700" />
            AI 图生图改款
          </DialogTitle>
          <DialogDescription>
            选择源设计稿（可选）+ 改款指令，AI 自动生成衍生款
            {styleName ? ` · 当前款式：${styleName}` : ""}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 源资产选择 */}
        {assets.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">源设计稿（可选）</p>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                onClick={() => setSourceAssetId("")}
                className={`flex-shrink-0 px-3 py-2 rounded-lg border text-xs transition-all ${
                  sourceAssetId === ""
                    ? "border-navy-500 bg-navy-50 text-navy-700"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                不指定
              </button>
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => setSourceAssetId(asset.id)}
                  className={`flex-shrink-0 flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                    sourceAssetId === asset.id
                      ? "border-navy-500 bg-navy-50"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                  style={{ width: 80 }}
                >
                  <div className="w-12 h-12 bg-slate-100 rounded overflow-hidden flex items-center justify-center">
                    {asset.thumbnailUrl ? (
                      <img
                        src={asset.thumbnailUrl}
                        alt={asset.fileName}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                  <span className="text-xs truncate w-full text-center">
                    {asset.fileName}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 预设改款方向 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">改款方向</p>
          <div className="grid grid-cols-3 gap-2">
            {presets.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => handlePresetClick(preset)}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  selectedPresetId === preset.id
                    ? "border-navy-500 bg-navy-50 ring-1 ring-navy-500"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                }`}
              >
                <p className="text-sm font-medium">{preset.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                  {preset.hint}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* 自定义指令 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">改款指令</p>
          <textarea
            value={instruction}
            onChange={(e) => {
              setInstruction(e.target.value);
              setSelectedPresetId(null);
            }}
            placeholder="例如：改为黑色宽松版型，加入金属拉链细节"
            className="w-full min-h-[80px] p-3 text-sm rounded-lg border border-slate-200 focus:border-navy-500 focus:ring-1 focus:ring-navy-500 outline-none resize-none"
            disabled={stage === "generating"}
          />
        </div>

        {/* 结果展示 */}
        {result && stage === "done" && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <CheckCircle className="h-4 w-4" />
              <span>{result.summary}</span>
            </div>
            <div className="aspect-[4/3] bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center">
              <img
                src={result.imageUrl}
                alt="AI 改款结果"
                className="w-full h-full object-cover"
              />
            </div>
            {result.colors && result.colors.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {result.colors.map((color, idx) => (
                  <Badge key={idx} variant="secondary" className="bg-navy-50 text-navy-700">
                    {color}
                  </Badge>
                ))}
              </div>
            )}
            {result.asset?.id && (
              <p className="text-xs text-muted-foreground">
                已自动保存到「设计资产 → AI衍生」
              </p>
            )}
          </div>
        )}

        {/* 状态指示 */}
        {stage === "generating" && (
          <div className="flex items-center gap-2 text-sm text-navy-700 py-4 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>AI 正在生成改款图，请稍候...</span>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={stage === "generating"}>
            {stage === "done" ? "完成" : "取消"}
          </Button>
          {stage !== "done" && (
            <Button
              onClick={handleGenerate}
              disabled={!instruction.trim() || stage === "generating"}
              className="bg-navy-700 hover:bg-navy-800 text-white"
            >
              {stage === "generating" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {stage === "generating" ? "生成中..." : "生成改款"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
