"use client";

import { useState, useRef, useCallback } from "react";
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
import { Upload, File as FileIcon, X, Sparkles, Loader2, CheckCircle, AlertCircle } from "lucide-react";

type AssetType = "inspiration" | "design" | "ai_derivative" | "3d_sample";

interface AssetUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  styleId: string;
  defaultType?: AssetType;
  onUploaded: () => void;
  onAnalyzed?: () => void;
}

const ASSET_TYPES: { value: AssetType; label: string; description: string }[] = [
  { value: "design", label: "设计稿", description: "完整设计图，支持 AI 标签提取" },
  { value: "inspiration", label: "灵感图", description: "设计参考素材" },
  { value: "ai_derivative", label: "AI衍生", description: "AI生成的衍生设计" },
  { value: "3d_sample", label: "3D样衣", description: "3D建模预览图" },
];

type UploadStage = "idle" | "uploading" | "analyzing" | "done" | "error";

export function AssetUploadDialog({
  open,
  onOpenChange,
  styleId,
  defaultType = "design",
  onUploaded,
  onAnalyzed,
}: AssetUploadDialogProps) {
  const [selectedType, setSelectedType] = useState<AssetType>(defaultType);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [stage, setStage] = useState<UploadStage>("idle");
  const [error, setError] = useState("");
  const [aiResult, setAiResult] = useState<{ tags: string[]; colors: string[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setPreviewUrl(null);
    setStage("idle");
    setError("");
    setAiResult(null);
    setSelectedType(defaultType);
  }, [defaultType]);

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // 校验类型
    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(selected.type)) {
      setError("仅支持 PNG/JPEG/WEBP/GIF 图片格式");
      return;
    }

    // 校验大小（10MB）
    if (selected.size > 10 * 1024 * 1024) {
      setError("文件大小不能超过 10MB");
      return;
    }

    setError("");
    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setStage("idle");
    setAiResult(null);
  };

  const removeFile = () => {
    setFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setStage("idle");
  };

  const handleUpload = async () => {
    if (!file) {
      setError("请先选择文件");
      return;
    }

    setStage("uploading");
    setError("");

    try {
      // 1. 上传文件
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", selectedType);

      const uploadRes = await fetch(`/api/styles/${styleId}/assets`, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const data = await uploadRes.json().catch(() => ({}));
        throw new Error(data.error || "上传失败");
      }

      const asset = await uploadRes.json();
      onUploaded();

      // 2. 仅对设计稿自动触发 AI 分析
      if (selectedType === "design" && asset.file_url) {
        setStage("analyzing");
        try {
          const analyzeRes = await fetch(`/api/styles/${styleId}/analyze-design`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assetId: asset.id,
              imageUrl: asset.file_url,
            }),
          });

          if (analyzeRes.ok) {
            const result = await analyzeRes.json();
            setAiResult({
              tags: result.tags || [],
              colors: result.colors || [],
            });
            onAnalyzed?.();
          }
          // AI 分析失败不阻塞整体流程
        } catch {
          // 忽略 AI 分析错误
        }
      }

      setStage("done");
    } catch (err) {
      const message = err instanceof Error ? err.message : "上传失败";
      setError(message);
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>上传设计资产</DialogTitle>
          <DialogDescription>
            支持设计稿、灵感图等资产上传，设计稿可触发 AI 自动提取标签
          </DialogDescription>
        </DialogHeader>

        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* 资产类型选择 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">资产类型</p>
          <div className="grid grid-cols-2 gap-2">
            {ASSET_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => !file && setSelectedType(t.value)}
                disabled={!!file && stage !== "idle" && stage !== "error"}
                className={`text-left p-3 rounded-lg border transition-all ${
                  selectedType === t.value
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : "border-slate-200 hover:border-slate-300 bg-white"
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                <p className="text-sm font-medium">{t.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 文件选择 / 预览 */}
        <div className="space-y-2">
          <p className="text-sm font-medium">设计文件</p>
          {!file ? (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 border-2 border-dashed border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/40 transition-all flex flex-col items-center gap-2"
            >
              <Upload className="h-8 w-8 text-slate-400" />
              <p className="text-sm text-muted-foreground">点击选择文件</p>
              <p className="text-xs text-slate-400">PNG / JPEG / WEBP / GIF，最大 10MB</p>
            </button>
          ) : (
            <div className="flex items-center gap-3 p-3 border rounded-lg bg-slate-50">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt={file.name}
                  className="w-14 h-14 object-cover rounded-md border"
                />
              ) : (
                <div className="w-14 h-14 flex items-center justify-center bg-slate-200 rounded-md">
                  <FileIcon className="h-6 w-6 text-slate-500" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(1)} KB
                </p>
              </div>
              {stage === "idle" || stage === "error" ? (
                <Button variant="ghost" size="icon-sm" onClick={removeFile}>
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={handleFileSelect}
            className="hidden"
          />
        </div>

        {/* AI 分析结果 */}
        {aiResult && (aiResult.tags.length > 0 || aiResult.colors.length > 0) && (
          <div className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">AI 分析完成</p>
            </div>
            {aiResult.tags.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">自动标签</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="bg-white text-blue-700 border border-blue-200">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {aiResult.colors.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs text-muted-foreground">提取色彩</p>
                <div className="flex flex-wrap gap-1.5">
                  {aiResult.colors.map((color) => (
                    <Badge key={color} variant="outline" className="bg-white gap-2">
                      <span className="w-3 h-3 rounded-full border" style={{ backgroundColor: color }} />
                      <span className="text-xs font-mono">{color}</span>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 状态指示 */}
        {(stage === "uploading" || stage === "analyzing" || stage === "done") && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              {stage === "uploading" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span>正在上传文件...</span>
                </>
              )}
              {stage === "analyzing" && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                  <span>AI 正在分析设计稿，请稍候...</span>
                </>
              )}
              {stage === "done" && (
                <>
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span>
                    {aiResult
                      ? "上传并完成 AI 分析"
                      : selectedType === "design"
                      ? "上传完成（AI 分析未启用或失败）"
                      : "上传完成"}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={stage === "uploading" || stage === "analyzing"}>
            {stage === "done" ? "完成" : "取消"}
          </Button>
          {stage !== "done" && (
            <Button
              onClick={handleUpload}
              disabled={!file || stage === "uploading" || stage === "analyzing"}
            >
              {(stage === "uploading" || stage === "analyzing") && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {stage === "analyzing"
                ? "分析中..."
                : stage === "uploading"
                ? "上传中..."
                : selectedType === "design"
                ? "上传并 AI 分析"
                : "上传"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
