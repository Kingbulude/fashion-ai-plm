"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  Play,
  Pause,
  Layers,
  ArrowLeftRight,
  Plus,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface DesignAsset {
  id: string;
  type: string;
  fileName: string;
  fileUrl: string;
  thumbnailUrl: string | null;
  version: number;
}

interface Sample3dViewerProps {
  styleId: string;
}

export function Sample3dViewer({ styleId }: Sample3dViewerProps) {
  const [samples, setSamples] = useState<DesignAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVersion, setSelectedVersion] = useState<DesignAsset | null>(null);
  const [compareVersion, setCompareVersion] = useState<DesignAsset | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    fileName: "",
    fileUrl: "",
    thumbnailUrl: "",
    frames: "36",
  });

  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const fetchSamples = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/styles/${styleId}/design-assets?type=3d_sample`);
      if (res.ok) {
        const data = await res.json();
        const assets = data.assets || [];
        setSamples(assets);
        if (assets.length > 0 && !selectedVersion) {
          setSelectedVersion(assets[0]);
        }
      }
    } catch (err) {
      console.error("获取3D样衣失败:", err);
    } finally {
      setLoading(false);
    }
  }, [styleId, selectedVersion]);

  useEffect(() => {
    fetchSamples();
  }, [fetchSamples]);

  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setCurrentFrame((prev) => (prev + 1) % 36);
        setRotation((prev) => (prev + 10) % 360);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const deltaX = e.clientX - startX;
    const rotationDelta = deltaX * 0.5;
    setRotation((prev) => prev + rotationDelta);
    setStartX(e.clientX);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const deltaX = e.touches[0].clientX - startX;
    const rotationDelta = deltaX * 0.5;
    setRotation((prev) => prev + rotationDelta);
    setStartX(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.2, 3));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.2, 0.5));
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setIsPlaying(false);
  };

  const handleAddSample = async () => {
    if (!form.fileUrl.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/styles/${styleId}/design-assets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "3d_sample",
          fileName: form.fileName || "3d-sample",
          fileUrl: form.fileUrl,
          thumbnailUrl: form.thumbnailUrl || null,
          version: samples.length + 1,
        }),
      });
      if (res.ok) {
        setAddDialogOpen(false);
        setForm({ fileName: "", fileUrl: "", thumbnailUrl: "", frames: "36" });
        fetchSamples();
      }
    } catch (err) {
      console.error("添加失败:", err);
    } finally {
      setSaving(false);
    }
  };

  const sortedSamples = [...samples].sort((a, b) => b.version - a.version);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">3D 样衣</h3>
          <p className="text-sm text-muted-foreground">
            拖拽旋转查看，支持版本对比
          </p>
        </div>
        <div className="flex items-center gap-2">
          {samples.length >= 2 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setCompareMode(!compareMode);
                if (!compareMode && sortedSamples[1]) {
                  setCompareVersion(sortedSamples[1]);
                } else {
                  setCompareVersion(null);
                }
              }}
              className={compareMode ? "bg-navy-50 text-navy-700 border-navy-200" : ""}
            >
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              {compareMode ? "退出对比" : "版本对比"}
            </Button>
          )}
          <Button size="sm" onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            上传3D样衣
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          加载中...
        </div>
      ) : samples.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-100 to-blue-100 flex items-center justify-center mx-auto mb-4">
            <Layers className="h-8 w-8 text-cyan-500" />
          </div>
          <h3 className="text-lg font-medium mb-2">还没有3D样衣</h3>
          <p className="text-sm text-muted-foreground mb-6">
            上传3D样衣，支持360°旋转查看和版本对比
          </p>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            上传3D样衣
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1 space-y-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">版本历史</p>
            {sortedSamples.map((sample) => (
              <div
                key={sample.id}
                onClick={() => setSelectedVersion(sample)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedVersion?.id === sample.id
                    ? "border-navy-400 bg-navy-50 ring-1 ring-navy-200"
                    : "border-border hover:border-slate-300 bg-white"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <Badge variant="secondary" className="mb-1">
                      V{sample.version}
                    </Badge>
                    <p className="text-sm font-medium line-clamp-1">{sample.fileName}</p>
                  </div>
                  {compareMode && compareVersion?.id === sample.id && (
                    <Badge className="bg-amber-100 text-amber-700">对比</Badge>
                  )}
                </div>
                {compareMode && selectedVersion?.id !== sample.id && (
                  <Button
                    variant="outline"
                    size="xs"
                    className="w-full mt-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCompareVersion(sample);
                    }}
                  >
                    {compareVersion?.id === sample.id ? "已选为对比" : "选作对比"}
                  </Button>
                )}
              </div>
            ))}
          </div>

          <div className="lg:col-span-3">
            <div className="grid grid-cols-1 gap-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="secondary">当前版本 V{selectedVersion?.version}</Badge>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={handleZoomOut}>
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="text-xs text-muted-foreground w-12 text-center">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button variant="ghost" size="icon" onClick={handleZoomIn}>
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setIsPlaying(!isPlaying)}>
                      {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={handleReset}>
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Card className="border-0 shadow-sm overflow-hidden">
                  <div
                    ref={containerRef}
                    className="aspect-square bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center cursor-grab active:cursor-grabbing select-none overflow-hidden relative"
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                  >
                    {selectedVersion?.thumbnailUrl || selectedVersion?.fileUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selectedVersion.thumbnailUrl || selectedVersion.fileUrl}
                        alt={`3D样衣 V${selectedVersion.version}`}
                        className="max-w-[80%] max-h-[80%] object-contain transition-transform select-none pointer-events-none"
                        style={{
                          transform: `scale(${zoom}) rotateY(${rotation}deg) perspective(1000px)`,
                          transformStyle: "preserve-3d",
                        }}
                        draggable={false}
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <Layers className="h-16 w-16 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">3D模型预览</p>
                      </div>
                    )}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-2 py-1 rounded-full">
                      {Math.round(rotation % 360)}°
                    </div>
                  </div>
                </Card>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  拖动鼠标旋转 · 滚轮/按钮缩放
                </p>
              </div>

              {compareMode && compareVersion && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                      对比版本 V{compareVersion.version}
                    </Badge>
                  </div>
                  <Card className="border-0 shadow-sm overflow-hidden">
                    <div className="aspect-square bg-gradient-to-br from-amber-50 to-orange-50 flex items-center justify-center">
                      {compareVersion.thumbnailUrl || compareVersion.fileUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={compareVersion.thumbnailUrl || compareVersion.fileUrl}
                          alt={`对比 V${compareVersion.version}`}
                          className="max-w-[80%] max-h-[80%] object-contain opacity-80"
                          style={{
                            transform: `scale(${zoom})`,
                          }}
                          draggable={false}
                        />
                      ) : (
                        <div className="text-center text-muted-foreground">
                          <Layers className="h-16 w-16 mx-auto mb-2 opacity-30" />
                          <p className="text-sm">对比版本</p>
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>上传3D样衣</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>文件名称</Label>
              <Input
                placeholder="如：大衣版V1"
                value={form.fileName}
                onChange={(e) => setForm({ ...form, fileName: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label>预览图 URL</Label>
              <Input
                placeholder="https://..."
                value={form.fileUrl}
                onChange={(e) => setForm({ ...form, fileUrl: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                支持图片预览，后续可接入真实3D模型
              </p>
            </div>
            <div className="space-y-1">
              <Label>缩略图 URL（可选）</Label>
              <Input
                placeholder="https://..."
                value={form.thumbnailUrl}
                onChange={(e) => setForm({ ...form, thumbnailUrl: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>
              取消
            </Button>
            <Button onClick={handleAddSample} disabled={saving || !form.fileUrl.trim()}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              添加
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
