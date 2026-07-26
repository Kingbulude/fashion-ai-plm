"use client";

import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  Loader2,
  RotateCcw,
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle,
  Wand2,
} from "lucide-react";

interface ColorSizeSimulatorProps {
  styleId: string;
  styleName?: string;
  unitCost?: number;
  unitPrice?: number;
}

interface SuggestionData {
  suggestedQuantity: number;
  safetyStock: number;
  colorSizeRatio: { color: string; size: string };
  reasoning: string;
  risks: string[];
  replenishStrategy: string;
  basedOn?: {
    totalSold: number;
    totalRevenue: number;
    unitCost: number;
    currentStock: number;
    testScore: number | null;
  };
}

interface ColorRow {
  name: string;
  ratio: number; // 百分比 0-100
}

interface SizeRow {
  name: string;
  ratio: number;
}

const DEFAULT_COLORS: ColorRow[] = [
  { name: "黑色", ratio: 40 },
  { name: "白色", ratio: 30 },
  { name: "灰色", ratio: 20 },
  { name: "其他", ratio: 10 },
];

const DEFAULT_SIZES: SizeRow[] = [
  { name: "S", ratio: 20 },
  { name: "M", ratio: 35 },
  { name: "L", ratio: 30 },
  { name: "XL", ratio: 15 },
];

// 解析 AI 返回的色码比文本（例如 "黑色40%、白色30%、灰色20%、其他10%"）
function parseColorRatio(text: string): ColorRow[] {
  if (!text) return DEFAULT_COLORS;
  const matches = text.match(/([^,，、%\d\s]+)\s*(\d+(?:\.\d+)?)\s*%/g);
  if (!matches || matches.length === 0) return DEFAULT_COLORS;

  const rows: ColorRow[] = matches.map((m) => {
    const match = m.match(/([^,，、%\d\s]+)\s*(\d+(?:\.\d+)?)\s*%/);
    if (!match) return null;
    return { name: match[1].trim(), ratio: parseFloat(match[2]) };
  }).filter((r): r is ColorRow => r !== null);

  return rows.length > 0 ? rows : DEFAULT_COLORS;
}

function parseSizeRatio(text: string): SizeRow[] {
  if (!text) return DEFAULT_SIZES;
  const matches = text.match(/([A-Za-z]+(?:\/[A-Za-z]+)?)\s*(\d+(?:\.\d+)?)\s*%/g);
  if (!matches || matches.length === 0) return DEFAULT_SIZES;

  const rows: SizeRow[] = matches.map((m) => {
    const match = m.match(/([A-Za-z]+(?:\/[A-Za-z]+)?)\s*(\d+(?:\.\d+)?)\s*%/);
    if (!match) return null;
    return { name: match[1].trim(), ratio: parseFloat(match[2]) };
  }).filter((r): r is SizeRow => r !== null);

  return rows.length > 0 ? rows : DEFAULT_SIZES;
}

export function ColorSizeSimulator({
  styleId,
  styleName,
  unitCost = 0,
  unitPrice = 0,
}: ColorSizeSimulatorProps) {
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionData | null>(null);
  const [totalQuantity, setTotalQuantity] = useState(200);
  const [colors, setColors] = useState<ColorRow[]>(DEFAULT_COLORS);
  const [sizes, setSizes] = useState<SizeRow[]>(DEFAULT_SIZES);
  const [error, setError] = useState("");

  const fetchSuggestion = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/ai/order-suggestion/${styleId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "AI 建议获取失败");
      }
      const data: SuggestionData = await res.json();
      setSuggestion(data);
      setTotalQuantity(data.suggestedQuantity);
      setColors(parseColorRatio(data.colorSizeRatio?.color));
      setSizes(parseSizeRatio(data.colorSizeRatio?.size));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI 建议获取失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [styleId]);

  const resetRatio = () => {
    if (suggestion) {
      setColors(parseColorRatio(suggestion.colorSizeRatio?.color));
      setSizes(parseColorRatio(suggestion.colorSizeRatio?.size) as SizeRow[]);
    } else {
      setColors(DEFAULT_COLORS);
      setSizes(DEFAULT_SIZES);
    }
  };

  // 计算每个颜色 × 尺码的具体数量
  const matrix = useMemo(() => {
    return colors.map((color) => ({
      color: color.name,
      colorRatio: color.ratio,
      sizes: sizes.map((size) => ({
        size: size.name,
        sizeRatio: size.ratio,
        quantity: Math.round((totalQuantity * color.ratio * size.ratio) / 10000),
      })),
    }));
  }, [colors, sizes, totalQuantity]);

  const sizeTotalQuantity = useMemo(() => {
    return sizes.map((s) => ({
      name: s.name,
      total: Math.round((totalQuantity * s.ratio) / 100),
    }));
  }, [sizes, totalQuantity]);

  // 预测指标
  const metrics = useMemo(() => {
    const colorSum = colors.reduce((s, c) => s + c.ratio, 0);
    const sizeSum = sizes.reduce((s, sz) => s + sz.ratio, 0);

    const totalCost = totalQuantity * unitCost;
    const expectedRevenue = totalQuantity * unitPrice;
    const expectedProfit = expectedRevenue - totalCost;
    const profitMargin = expectedRevenue > 0 ? (expectedProfit / expectedRevenue) * 100 : 0;

    // 库存周转天数估算（假设每天销售 totalSold/30 件）
    const dailySales = suggestion?.basedOn?.totalSold
      ? suggestion.basedOn.totalSold / 30
      : totalQuantity / 60; // 兜底：60天售罄
    const turnoverDays = dailySales > 0 ? Math.round(totalQuantity / dailySales) : 0;

    // 风险评估
    let riskLevel: "low" | "medium" | "high" = "low";
    const risks: string[] = [];
    if (Math.abs(colorSum - 100) > 1) {
      risks.push(`颜色比例总和 ${colorSum}%，不等于 100%`);
      riskLevel = "high";
    }
    if (Math.abs(sizeSum - 100) > 1) {
      risks.push(`尺码比例总和 ${sizeSum}%，不等于 100%`);
      riskLevel = "high";
    }
    if (turnoverDays > 90) {
      risks.push(`预计周转 ${turnoverDays} 天，超过 90 天有库存积压风险`);
      riskLevel = riskLevel === "high" ? "high" : "medium";
    }
    if (profitMargin < 20 && expectedRevenue > 0) {
      risks.push(`毛利率 ${profitMargin.toFixed(1)}% 偏低（建议 ≥ 20%）`);
      riskLevel = riskLevel === "high" ? "high" : "medium";
    }

    return {
      colorSum,
      sizeSum,
      totalCost,
      expectedRevenue,
      expectedProfit,
      profitMargin,
      turnoverDays,
      riskLevel,
      risks,
    };
  }, [colors, sizes, totalQuantity, unitCost, unitPrice, suggestion]);

  const updateColorRatio = (idx: number, ratio: number) => {
    setColors((prev) => prev.map((c, i) => (i === idx ? { ...c, ratio } : c)));
  };
  const updateColorName = (idx: number, name: string) => {
    setColors((prev) => prev.map((c, i) => (i === idx ? { ...c, name } : c)));
  };
  const addColor = () => {
    setColors((prev) => [...prev, { name: "新颜色", ratio: 0 }]);
  };
  const removeColor = (idx: number) => {
    setColors((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSizeRatio = (idx: number, ratio: number) => {
    setSizes((prev) => prev.map((s, i) => (i === idx ? { ...s, ratio } : s)));
  };
  const updateSizeName = (idx: number, name: string) => {
    setSizes((prev) => prev.map((s, i) => (i === idx ? { ...s, name } : s)));
  };
  const addSize = () => {
    setSizes((prev) => [...prev, { name: "XXL", ratio: 0 }]);
  };
  const removeSize = (idx: number) => {
    setSizes((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <Card className="card-premium">
      <CardHeader className="pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-navy-700" />
              色码配比模拟器
            </CardTitle>
            <CardDescription>
              接入 AI 下单建议，可视化调整色码比，实时预测销售与库存风险
              {styleName ? ` · ${styleName}` : ""}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={resetRatio}
              disabled={!suggestion || loading}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              恢复 AI 建议
            </Button>
            <Button
              size="sm"
              onClick={fetchSuggestion}
              disabled={loading}
              className="bg-navy-700 hover:bg-navy-800 text-white"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-2" />
              )}
              {loading ? "AI 分析中..." : suggestion ? "重新获取建议" : "获取 AI 建议"}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-5">
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* AI 建议摘要 */}
        {suggestion && (
          <div className="p-4 rounded-lg bg-gradient-to-br from-navy-50 to-indigo-50 border border-navy-100 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-navy-700" />
              <p className="text-sm font-medium text-navy-900">AI 下单建议</p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white/70 rounded-lg p-3 border border-navy-100">
                <p className="text-xs text-muted-foreground">建议首单</p>
                <p className="text-lg font-bold text-navy-800">{suggestion.suggestedQuantity} 件</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-navy-100">
                <p className="text-xs text-muted-foreground">安全库存</p>
                <p className="text-lg font-bold text-navy-800">{suggestion.safetyStock} 件</p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-navy-100">
                <p className="text-xs text-muted-foreground">测款分数</p>
                <p className="text-lg font-bold text-navy-800">
                  {suggestion.basedOn?.testScore ?? "—"}
                </p>
              </div>
              <div className="bg-white/70 rounded-lg p-3 border border-navy-100">
                <p className="text-xs text-muted-foreground">历史销量</p>
                <p className="text-lg font-bold text-navy-800">
                  {suggestion.basedOn?.totalSold ?? 0} 件
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">{suggestion.reasoning}</p>
          </div>
        )}

        {/* 总量调整 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm">生产总量（件）</Label>
            <Input
              type="number"
              value={totalQuantity}
              onChange={(e) => setTotalQuantity(Math.max(0, Number(e.target.value) || 0))}
              min={0}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm">成本/售价（元）</Label>
            <div className="flex gap-2">
              <Input
                type="number"
                value={unitCost}
                disabled
                placeholder="单件成本"
                className="flex-1"
              />
              <Input
                type="number"
                value={unitPrice}
                disabled
                placeholder="单件售价"
                className="flex-1"
              />
            </div>
          </div>
        </div>

        {/* 色码配置 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* 颜色比例 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">颜色比例</Label>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={
                    Math.abs(metrics.colorSum - 100) > 1
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  }
                >
                  总和 {metrics.colorSum}%
                </Badge>
                <Button size="sm" variant="ghost" onClick={addColor} className="h-7 px-2">
                  + 颜色
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {colors.map((color, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={color.name}
                    onChange={(e) => updateColorName(idx, e.target.value)}
                    className="flex-1"
                    disabled={loading}
                  />
                  <div className="relative w-32">
                    <Input
                      type="number"
                      value={color.ratio}
                      onChange={(e) => updateColorRatio(idx, Number(e.target.value) || 0)}
                      min={0}
                      max={100}
                      disabled={loading}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                  <div className="w-16 text-right text-xs text-muted-foreground">
                    {Math.round((totalQuantity * color.ratio) / 100)} 件
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeColor(idx)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* 尺码比例 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">尺码比例</Label>
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className={
                    Math.abs(metrics.sizeSum - 100) > 1
                      ? "bg-red-100 text-red-700"
                      : "bg-emerald-100 text-emerald-700"
                  }
                >
                  总和 {metrics.sizeSum}%
                </Badge>
                <Button size="sm" variant="ghost" onClick={addSize} className="h-7 px-2">
                  + 尺码
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              {sizes.map((size, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <Input
                    value={size.name}
                    onChange={(e) => updateSizeName(idx, e.target.value)}
                    className="flex-1"
                    disabled={loading}
                  />
                  <div className="relative w-32">
                    <Input
                      type="number"
                      value={size.ratio}
                      onChange={(e) => updateSizeRatio(idx, Number(e.target.value) || 0)}
                      min={0}
                      max={100}
                      disabled={loading}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                      %
                    </span>
                  </div>
                  <div className="w-16 text-right text-xs text-muted-foreground">
                    {Math.round((totalQuantity * size.ratio) / 100)} 件
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => removeSize(idx)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 色码矩阵 */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">色码矩阵（具体数量）</Label>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50">
                  <th className="text-left p-2 border border-slate-200 sticky left-0 bg-slate-50">
                    颜色
                  </th>
                  {sizes.map((s) => (
                    <th key={s.name} className="text-center p-2 border border-slate-200 min-w-[80px]">
                      {s.name}
                    </th>
                  ))}
                  <th className="text-center p-2 border border-slate-200 bg-navy-50">合计</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => {
                  const rowTotal = row.sizes.reduce((s, sz) => s + sz.quantity, 0);
                  return (
                    <tr key={row.color}>
                      <td className="p-2 border border-slate-200 font-medium sticky left-0 bg-white">
                        {row.color}
                      </td>
                      {row.sizes.map((sz) => (
                        <td
                          key={sz.size}
                          className="text-center p-2 border border-slate-200 text-muted-foreground"
                        >
                          {sz.quantity}
                        </td>
                      ))}
                      <td className="text-center p-2 border border-slate-200 font-semibold bg-navy-50 text-navy-800">
                        {rowTotal}
                      </td>
                    </tr>
                  );
                })}
                <tr className="bg-slate-50">
                  <td className="p-2 border border-slate-200 font-semibold sticky left-0 bg-slate-50">
                    合计
                  </td>
                  {sizeTotalQuantity.map((s) => (
                    <td
                      key={s.name}
                      className="text-center p-2 border border-slate-200 font-semibold text-navy-800"
                    >
                      {s.total}
                    </td>
                  ))}
                  <td className="text-center p-2 border border-slate-200 font-bold bg-navy-100 text-navy-900">
                    {totalQuantity}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 预测指标 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-1.5 mb-1">
              <Package className="h-3.5 w-3.5 text-blue-500" />
              <p className="text-xs text-muted-foreground">预计总成本</p>
            </div>
            <p className="text-base font-bold">¥{metrics.totalCost.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <p className="text-xs text-muted-foreground">预计销售额</p>
            </div>
            <p className="text-base font-bold">¥{metrics.expectedRevenue.toLocaleString()}</p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-1.5 mb-1">
              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
              <p className="text-xs text-muted-foreground">预计毛利</p>
            </div>
            <p
              className={`text-base font-bold ${
                metrics.expectedProfit >= 0 ? "text-emerald-700" : "text-red-600"
              }`}
            >
              ¥{metrics.expectedProfit.toLocaleString()}
              {metrics.expectedRevenue > 0 && (
                <span className="text-xs font-normal text-muted-foreground ml-1">
                  ({metrics.profitMargin.toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-white">
            <div className="flex items-center gap-1.5 mb-1">
              <RotateCcw className="h-3.5 w-3.5 text-amber-500" />
              <p className="text-xs text-muted-foreground">预计周转</p>
            </div>
            <p className="text-base font-bold">
              {metrics.turnoverDays > 0 ? `${metrics.turnoverDays} 天` : "—"}
            </p>
          </div>
        </div>

        {/* 风险提示 */}
        {metrics.risks.length > 0 && (
          <Alert
            className={
              metrics.riskLevel === "high"
                ? "border-red-200 bg-red-50"
                : "border-amber-200 bg-amber-50"
            }
          >
            <AlertTriangle
              className={`h-4 w-4 ${
                metrics.riskLevel === "high" ? "text-red-500" : "text-amber-500"
              }`}
            />
            <AlertDescription>
              <div className="space-y-1">
                {metrics.risks.map((r, idx) => (
                  <p key={idx} className="text-sm">
                    • {r}
                  </p>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* 补货策略 */}
        {suggestion?.replenishStrategy && (
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <p className="text-xs font-medium text-muted-foreground mb-1">AI 补货策略</p>
            <p className="text-sm text-foreground leading-relaxed">{suggestion.replenishStrategy}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
