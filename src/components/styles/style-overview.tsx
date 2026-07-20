"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  Package,
  Palette,
  ShoppingCart,
  Factory,
  TrendingUp,
  Calendar,
  User,
  FileText,
  Wrench,
  Image as ImageIcon,
  Box,
  Sparkles,
  CircleDot,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";

interface StyleOverviewProps {
  styleId: string;
  style: any;
  onNavigate: (tab: string) => void;
  transitions?: any[];
  completion?: any;
  onTransition?: (toStatus: string, event: string) => void;
}

const statusConfig: Record<string, { label: string; color: string; bg: string; progress: number }> = {
  planning: { label: "企划中", color: "text-slate-700", bg: "bg-slate-100", progress: 10 },
  designing: { label: "设计中", color: "text-blue-700", bg: "bg-blue-100", progress: 25 },
  designed: { label: "设计定稿", color: "text-indigo-700", bg: "bg-indigo-100", progress: 35 },
  sampling: { label: "打样中", color: "text-amber-700", bg: "bg-amber-100", progress: 50 },
  sampled: { label: "封样完成", color: "text-yellow-700", bg: "bg-yellow-100", progress: 65 },
  producing: { label: "大货生产", color: "text-green-700", bg: "bg-green-100", progress: 80 },
  produced: { label: "大货完成", color: "text-emerald-700", bg: "bg-emerald-100", progress: 90 },
  selling: { label: "销售中", color: "text-purple-700", bg: "bg-purple-100", progress: 95 },
  sold: { label: "销售结束", color: "text-gray-700", bg: "bg-gray-100", progress: 100 },
  reviewing: { label: "复盘中", color: "text-pink-700", bg: "bg-pink-100", progress: 100 },
  archived: { label: "已归档", color: "text-slate-500", bg: "bg-slate-100", progress: 100 },
};

const stageFlow = [
  { key: "design", label: "设计", icon: Palette, tabs: "assets" },
  { key: "techpack", label: "工艺包", icon: FileText, tabs: "techpack" },
  { key: "bom", label: "BOM", icon: Package, tabs: "bom" },
  { key: "sampling", label: "打样", icon: Wrench, tabs: "sampling" },
  { key: "procurement", label: "采购", icon: ShoppingCart, tabs: "procurement" },
  { key: "production", label: "生产", icon: Factory, tabs: "production" },
  { key: "inventory", label: "库存", icon: Box, tabs: "inventory" },
];

export function StyleOverview({ styleId, style, onNavigate, transitions = [], completion = {}, onTransition }: StyleOverviewProps) {
  const [bomCount, setBomCount] = useState<number | null>(null);
  const [samplingCount, setSamplingCount] = useState<number | null>(null);
  const [assetCount, setAssetCount] = useState<number | null>(null);
  const [techPackCount, setTechPackCount] = useState<number | null>(null);
  const [procurementCount, setProcurementCount] = useState<number | null>(null);
  const [productionCount, setProductionCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [bom, sampling, assets, techPacks, procurement, production] = await Promise.all([
          fetch(`/api/styles/${styleId}/bom-items`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`/api/styles/${styleId}/sampling`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`/api/styles/${styleId}/assets`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`/api/styles/${styleId}/tech-packs`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`/api/styles/${styleId}/procurement`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
          fetch(`/api/styles/${styleId}/production`).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        ]);
        setBomCount(Array.isArray(bom) ? bom.length : 0);
        setSamplingCount(Array.isArray(sampling) ? sampling.length : 0);
        setAssetCount(Array.isArray(assets) ? assets.length : 0);
        setTechPackCount(Array.isArray(techPacks) ? techPacks.length : 0);
        setProcurementCount(Array.isArray(procurement) ? procurement.length : 0);
        setProductionCount(Array.isArray(production) ? production.length : 0);
      } catch (err) {
        console.error("加载概览数据失败:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchCounts();
  }, [styleId]);

  const status = statusConfig[style?.status] || statusConfig.planning;

  // 检查关键数据是否就绪
  const risks: { type: "warning" | "error" | "info"; message: string; action?: string; tab?: string }[] = [];
  if (!assetCount || assetCount === 0) {
    risks.push({ type: "warning", message: "尚未上传设计资产", action: "去上传", tab: "assets" });
  }
  if (!techPackCount || techPackCount === 0) {
    risks.push({ type: "info", message: "工艺包尚未创建", action: "去创建", tab: "techpack" });
  }
  if (!bomCount || bomCount === 0) {
    risks.push({ type: "info", message: "BOM清单为空", action: "去填写", tab: "bom" });
  }
  if (style?.targetCost && style?.actualCost && style.actualCost > style.targetCost) {
    risks.push({ type: "error", message: `实际成本 ¥${style.actualCost} 超出目标 ¥${style.targetCost}`, action: "查看BOM", tab: "bom" });
  }

  return (
    <div className="space-y-4">
      {/* 1. 顶部摘要：10秒内理解当前情况 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="lg:col-span-2 border-0 shadow-sm bg-gradient-to-br from-white to-slate-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs text-slate-500">当前阶段</span>
              <Badge className={`${status.bg} ${status.color} border-0`}>
                {status.label}
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500">整体进度</span>
                <span className="font-semibold text-slate-700">{status.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                  style={{ width: `${status.progress}%` }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t">
              <div>
                <p className="text-xs text-slate-500">款号</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{style?.styleNo || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">目标成本</p>
                <p className="text-sm font-semibold text-slate-800">
                  {style?.targetCost ? `¥${style.targetCost}` : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">实际成本</p>
                <p className={`text-sm font-semibold ${style?.actualCost > style?.targetCost ? "text-red-600" : "text-slate-800"}`}>
                  {style?.actualCost ? `¥${style.actualCost}` : "-"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <User className="h-3.5 w-3.5" />
              负责人
            </div>
            <p className="text-base font-semibold text-slate-800">{style?.createdByName || "未指定"}</p>
            <p className="text-xs text-slate-400 mt-1">创建于 {new Date(style?.createdAt).toLocaleDateString("zh-CN") || "-"}</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
              <Calendar className="h-3.5 w-3.5" />
              关键日期
            </div>
            <p className="text-base font-semibold text-slate-800">暂无排期</p>
            <Button variant="link" size="sm" className="px-0 h-auto text-xs mt-1">
              设置交期
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* 2. 风险/阻塞项 */}
      {risks.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-amber-500" />
              待处理事项
              <Badge variant="secondary" className="ml-auto">{risks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {risks.map((risk, i) => (
              <Alert
                key={i}
                variant={risk.type === "error" ? "destructive" : "default"}
                className={`py-2 ${risk.type === "warning" ? "border-amber-200 bg-amber-50" : ""} ${risk.type === "info" ? "border-blue-200 bg-blue-50" : ""}`}
              >
                <div className="flex items-center justify-between w-full">
                  <AlertDescription className="text-sm">{risk.message}</AlertDescription>
                  {risk.tab && (
                    <Button variant="link" size="sm" onClick={() => onNavigate(risk.tab!)} className="h-auto p-0">
                      {risk.action} →
                    </Button>
                  )}
                </div>
              </Alert>
            ))}
          </CardContent>
        </Card>
      )}

      {/* 3. 开发流水线：6大区域一图看全 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-indigo-500" />
            开发流水线
          </CardTitle>
          <CardDescription className="text-xs">点击任意阶段快速进入对应详情</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-2">
            {stageFlow.map((stage, idx) => {
              const Icon = stage.icon;
              const isCompleted = (() => {
                if (stage.tabs === "assets") return (assetCount || 0) > 0;
                if (stage.tabs === "techpack") return (techPackCount || 0) > 0;
                if (stage.tabs === "bom") return (bomCount || 0) > 0;
                if (stage.tabs === "sampling") return (samplingCount || 0) > 0;
                if (stage.tabs === "procurement") return (procurementCount || 0) > 0;
                if (stage.tabs === "production") return (productionCount || 0) > 0;
                return false;
              })();
              const count = (() => {
                if (stage.tabs === "assets") return assetCount;
                if (stage.tabs === "techpack") return techPackCount;
                if (stage.tabs === "bom") return bomCount;
                if (stage.tabs === "sampling") return samplingCount;
                if (stage.tabs === "procurement") return procurementCount;
                if (stage.tabs === "production") return productionCount;
                return null;
              })();

              return (
                <button
                  key={stage.key}
                  onClick={() => onNavigate(stage.tabs)}
                  className={`relative p-3 rounded-lg border transition-all hover:shadow-md ${
                    isCompleted
                      ? "border-green-200 bg-green-50/50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isCompleted ? "bg-green-100" : "bg-slate-100"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${
                          isCompleted ? "text-green-600" : "text-slate-500"
                        }`}
                      />
                    </div>
                    {isCompleted ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <CircleDot className="h-3.5 w-3.5 text-slate-300" />
                    )}
                  </div>
                  <p className="text-xs font-medium text-slate-700 text-left">{stage.label}</p>
                  <p className="text-xs text-slate-400 text-left mt-0.5">
                    {loading ? "..." : count !== null ? `${count}项` : "未开始"}
                  </p>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* 4. 状态机：可执行的状态转换 */}
      {transitions.length > 0 && (
        <Card className="border-0 shadow-sm bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-indigo-500" />
              推进到下一阶段
            </CardTitle>
            <CardDescription className="text-xs">
              状态机会自动校验必填数据并生成待办
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {transitions.map((t: any) => (
                <Button
                  key={t.event}
                  size="sm"
                  onClick={() => onTransition?.(t.to, t.event)}
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600"
                >
                  {t.description}
                  <ChevronRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 5. 关键信息速览 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-500" />
              最近设计资产
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-slate-400">加载中...</p>
            ) : (assetCount || 0) === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-slate-400 mb-2">暂无设计资产</p>
                <Button variant="outline" size="sm" onClick={() => onNavigate("assets")}>
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  上传设计稿
                </Button>
              </div>
            ) : (
              <p className="text-sm text-slate-600">共 {assetCount} 个设计资产</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-purple-500" />
              AI 分析结果
            </CardTitle>
          </CardHeader>
          <CardContent>
            {style?.aiTags && style.aiTags.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {style.aiTags.slice(0, 6).map((tag: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
                {style.aiTags.length > 6 && (
                  <Badge variant="secondary" className="text-xs">+{style.aiTags.length - 6}</Badge>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400">尚未进行 AI 分析</p>
            )}
            {style?.aiColorPalette && style.aiColorPalette.length > 0 && (
              <div className="flex gap-1.5 mt-3">
                {style.aiColorPalette.slice(0, 8).map((color: string, i: number) => (
                  <div
                    key={i}
                    className="w-6 h-6 rounded border border-slate-200"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
