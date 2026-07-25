"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Loader2,
  RefreshCcw,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Package,
  Coins,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ReorderSimulationCardProps {
  styleId: string;
  styleName?: string;
}

interface SimulationData {
  shouldReorder: boolean;
  recommendedQuantity: number;
  urgentLevel: "low" | "medium" | "high";
  bestReorderDate: string;
  estimatedSellOutDate: string;
  colorSizePriority: { color: string; size: string; quantity: number };
  reasoning: string;
  financialImpact: {
    estimatedRevenue: number;
    estimatedProfit: number;
    stockoutCost: number;
  };
  risks: string[];
  basedOn?: {
    totalSold: number;
    totalRevenue: number;
    currentStock: number;
    daysOnSale: number;
    unitCost: number;
    unitPrice: number;
  };
  topColorSizeSales?: { color: string; size: string; quantity: number }[];
}

const URGENT_CONFIG = {
  high: { label: "紧急", color: "bg-red-100 text-red-700 border-red-200" },
  medium: { label: "中等", color: "bg-amber-100 text-amber-700 border-amber-200" },
  low: { label: "低", color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export function ReorderSimulationCard({ styleId, styleName }: ReorderSimulationCardProps) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<SimulationData | null>(null);
  const [error, setError] = useState("");

  const fetchSimulation = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ai/reorder-simulation/${styleId}`);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "翻单模拟失败");
      }
      const result: SimulationData = await res.json();
      setData(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "翻单模拟失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [styleId]);

  return (
    <Card className="card-premium">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCcw className="h-4 w-4 text-navy-700" />
              翻单模拟测算
            </CardTitle>
            <CardDescription>
              AI 基于销售数据 + 库存预测翻单最佳时机与数量
              {styleName ? ` · ${styleName}` : ""}
            </CardDescription>
          </div>
          <Button
            size="sm"
            onClick={fetchSimulation}
            disabled={loading}
            className="bg-navy-700 hover:bg-navy-800 text-white"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {loading ? "AI 模拟中..." : data ? "重新模拟" : "开始翻单模拟"}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {!data && !loading && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            点击「开始翻单模拟」按钮，AI 将基于历史销售数据和当前库存
            <br />
            给出最佳翻单时机、数量、色码优先级和财务影响测算
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-10 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-navy-700" />
            <p className="text-sm text-muted-foreground">AI 正在分析销售数据、库存与销售周期...</p>
          </div>
        )}

        {data && !loading && (
          <>
            {/* 核心结论 */}
            <div
              className={`p-4 rounded-lg border-2 ${
                data.shouldReorder
                  ? data.urgentLevel === "high"
                    ? "border-red-200 bg-red-50"
                    : data.urgentLevel === "medium"
                      ? "border-amber-200 bg-amber-50"
                      : "border-emerald-200 bg-emerald-50"
                  : "border-slate-200 bg-slate-50"
              } space-y-3`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {data.shouldReorder ? (
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                  ) : (
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  )}
                  <p className="text-base font-semibold">
                    {data.shouldReorder ? "建议翻单" : "暂不需要翻单"}
                  </p>
                </div>
                {data.shouldReorder && (
                  <Badge className={URGENT_CONFIG[data.urgentLevel].color}>
                    {URGENT_CONFIG[data.urgentLevel].label}优先级
                  </Badge>
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed">{data.reasoning}</p>
            </div>

            {/* 关键指标 */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <Package className="h-3.5 w-3.5 text-blue-500" />
                  <p className="text-xs text-muted-foreground">推荐数量</p>
                </div>
                <p className="text-base font-bold text-navy-800">
                  {data.recommendedQuantity > 0 ? `${data.recommendedQuantity} 件` : "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-amber-500" />
                  <p className="text-xs text-muted-foreground">最佳下单日</p>
                </div>
                <p className="text-sm font-bold">{data.bestReorderDate}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <Calendar className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-xs text-muted-foreground">预计售罄日</p>
                </div>
                <p className="text-sm font-bold">{data.estimatedSellOutDate}</p>
              </div>
              <div className="p-3 rounded-lg border border-slate-200 bg-white">
                <div className="flex items-center gap-1.5 mb-1">
                  <TrendingUp className="h-3.5 w-3.5 text-purple-500" />
                  <p className="text-xs text-muted-foreground">优先色码</p>
                </div>
                <p className="text-sm font-bold">
                  {data.colorSizePriority.color}/{data.colorSizePriority.size}
                  {data.colorSizePriority.quantity > 0 && (
                    <span className="text-xs font-normal text-muted-foreground ml-1">
                      ({data.colorSizePriority.quantity}件)
                    </span>
                  )}
                </p>
              </div>
            </div>

            {/* 财务影响 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <Coins className="h-3.5 w-3.5 text-emerald-600" />
                  <p className="text-xs text-muted-foreground">预计销售额</p>
                </div>
                <p className="text-base font-bold text-emerald-700">
                  ¥{data.financialImpact.estimatedRevenue.toLocaleString()}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <p className="text-xs text-muted-foreground">预计利润</p>
                </div>
                <p className="text-base font-bold text-emerald-700">
                  ¥{data.financialImpact.estimatedProfit.toLocaleString()}
                </p>
              </div>
              <div
                className={`p-3 rounded-lg border ${
                  data.financialImpact.stockoutCost > 0
                    ? "bg-red-50 border-red-200"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <XCircle
                    className={`h-3.5 w-3.5 ${
                      data.financialImpact.stockoutCost > 0 ? "text-red-600" : "text-slate-400"
                    }`}
                  />
                  <p className="text-xs text-muted-foreground">缺货损失风险</p>
                </div>
                <p
                  className={`text-base font-bold ${
                    data.financialImpact.stockoutCost > 0 ? "text-red-700" : "text-slate-500"
                  }`}
                >
                  ¥{data.financialImpact.stockoutCost.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 畅销色码 TOP5 */}
            {data.topColorSizeSales && data.topColorSizeSales.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">畅销色码 TOP5</p>
                <div className="flex flex-wrap gap-2">
                  {data.topColorSizeSales.map((cs, idx) => (
                    <Badge
                      key={idx}
                      variant="outline"
                      className="bg-white border-navy-200 text-navy-700"
                    >
                      {cs.color}/{cs.size} · {cs.quantity}件
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* 数据基础 */}
            {data.basedOn && (
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                <p className="text-xs font-medium text-muted-foreground mb-2">模拟数据基础</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">总销量：</span>
                    <span className="font-medium">{data.basedOn.totalSold} 件</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">总销售额：</span>
                    <span className="font-medium">¥{data.basedOn.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">销售周期：</span>
                    <span className="font-medium">{data.basedOn.daysOnSale} 天</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">当前库存：</span>
                    <span className="font-medium">{data.basedOn.currentStock} 件</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">单件成本：</span>
                    <span className="font-medium">¥{data.basedOn.unitCost.toFixed(2)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">单件售价：</span>
                    <span className="font-medium">¥{data.basedOn.unitPrice.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}

            {/* 风险提示 */}
            {data.risks.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                <AlertDescription>
                  <div className="space-y-1">
                    {data.risks.map((r, idx) => (
                      <p key={idx} className="text-sm">
                        • {r}
                      </p>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
