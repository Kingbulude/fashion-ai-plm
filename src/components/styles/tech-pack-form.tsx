"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Save,
  Sparkles,
  Loader2,
  Plus,
  Trash2,
  CheckCircle,
  History,
} from "lucide-react";

interface SizeRow {
  size: string;
  chest: string;
  waist: string;
  hip: string;
  length: string;
  shoulder: string;
  sleeve: string;
}

interface PrintItem {
  type: string;
  position: string;
  description: string;
}

interface TechPack {
  id?: string;
  version?: number;
  sizeChart: SizeRow[];
  processNotes: string;
  sewingStandard: string;
  printEmbroidery: PrintItem[];
  aiGenerated?: boolean;
  approved?: boolean;
  createdAt?: string;
}

interface TechPackFormProps {
  styleId: string;
  styleName: string;
  styleDescription?: string;
  onCostUpdated?: () => void;
}

const EMPTY_SIZE_ROW: SizeRow = {
  size: "",
  chest: "",
  waist: "",
  hip: "",
  length: "",
  shoulder: "",
  sleeve: "",
};

const DEFAULT_SIZES = ["S", "M", "L", "XL"];

function createEmptyTechPack(): TechPack {
  return {
    sizeChart: DEFAULT_SIZES.map((size) => ({ ...EMPTY_SIZE_ROW, size })),
    processNotes: "",
    sewingStandard: "",
    printEmbroidery: [],
  };
}

export function TechPackForm({ styleId, styleName, styleDescription, onCostUpdated }: TechPackFormProps) {
  const [techPacks, setTechPacks] = useState<TechPack[]>([]);
  const [current, setCurrent] = useState<TechPack>(createEmptyTechPack());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showToast = (type: "success" | "error", message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchTechPacks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/styles/${styleId}/tech-packs`);
      if (!res.ok) throw new Error("获取工艺包失败");
      const data = await res.json();
      setTechPacks(data || []);
      if (data && data.length > 0) {
        setCurrent(data[0]);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "获取工艺包失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [styleId]);

  useEffect(() => {
    fetchTechPacks();
  }, [fetchTechPacks]);

  const handleSizeChange = (index: number, field: keyof SizeRow, value: string) => {
    const next = [...current.sizeChart];
    next[index] = { ...next[index], [field]: value };
    setCurrent({ ...current, sizeChart: next });
  };

  const handleAddSize = () => {
    setCurrent({ ...current, sizeChart: [...current.sizeChart, { ...EMPTY_SIZE_ROW }] });
  };

  const handleRemoveSize = (index: number) => {
    setCurrent({ ...current, sizeChart: current.sizeChart.filter((_, i) => i !== index) });
  };

  const handlePrintChange = (index: number, field: keyof PrintItem, value: string) => {
    const next = [...current.printEmbroidery];
    next[index] = { ...next[index], [field]: value };
    setCurrent({ ...current, printEmbroidery: next });
  };

  const handleAddPrint = () => {
    setCurrent({
      ...current,
      printEmbroidery: [...current.printEmbroidery, { type: "", position: "", description: "" }],
    });
  };

  const handleRemovePrint = (index: number) => {
    setCurrent({ ...current, printEmbroidery: current.printEmbroidery.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const url = current.id
        ? `/api/styles/${styleId}/tech-packs/${current.id}`
        : `/api/styles/${styleId}/tech-packs`;
      const method = current.id ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sizeChart: current.sizeChart,
          processNotes: current.processNotes,
          sewingStandard: current.sewingStandard,
          printEmbroidery: current.printEmbroidery,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "保存失败");
      }

      showToast("success", "工艺包保存成功");
      fetchTechPacks();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "保存失败";
      setError(msg);
      showToast("error", msg);
    } finally {
      setSaving(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch(`/api/styles/${styleId}/tech-packs/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "AI 生成失败");
      }
      const result = await res.json();
      if (result.techPack) {
        setCurrent(result.techPack);
      }
      showToast("success", `AI 生成工艺包成功${result.bomSuggestion?.length ? "，含 " + result.bomSuggestion.length + " 条 BOM 建议" : ""}`);
      fetchTechPacks();
      onCostUpdated?.();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI 生成失败";
      setError(msg);
      showToast("error", msg);
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    if (!current.id) return;
    try {
      const res = await fetch(`/api/styles/${styleId}/tech-packs/${current.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approved: !current.approved }),
      });
      if (!res.ok) throw new Error("审批失败");
      const updated = await res.json();
      setCurrent(updated);
      showToast("success", updated.approved ? "工艺包已审批通过" : "已取消审批");
      fetchTechPacks();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "审批失败";
      showToast("error", msg);
    }
  };

  const handleSwitchVersion = (techPack: TechPack) => {
    setCurrent(techPack);
  };

  if (loading) {
    return (
      <div className="py-12 text-center text-muted-foreground flex items-center justify-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        加载工艺包...
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          {current.version && (
            <Badge variant="secondary" className="bg-blue-50 text-blue-700">
              v{current.version}
            </Badge>
          )}
          {current.aiGenerated && (
            <Badge variant="secondary" className="bg-purple-50 text-purple-700">
              <Sparkles className="h-3 w-3 mr-1" />
              AI 生成
            </Badge>
          )}
          {current.approved && (
            <Badge variant="secondary" className="bg-green-50 text-green-700">
              <CheckCircle className="h-3 w-3 mr-1" />
              已审批
            </Badge>
          )}
          {techPacks.length > 1 && (
            <div className="flex items-center gap-1 ml-2">
              <History className="h-3 w-3 text-muted-foreground" />
              <select
                className="text-xs border border-slate-200 rounded-md px-2 py-1 bg-white"
                value={current.id}
                onChange={(e) => {
                  const found = techPacks.find((t) => t.id === e.target.value);
                  if (found) handleSwitchVersion(found);
                }}
              >
                {techPacks.map((t) => (
                  <option key={t.id} value={t.id}>
                    v{t.version} {t.aiGenerated ? "(AI)" : ""} {t.approved ? "✓" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleGenerate}
            disabled={generating}
            className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200 hover:bg-blue-100"
          >
            {generating ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            {generating ? "AI 生成中..." : "AI 生成草稿"}
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            {saving ? "保存中..." : "保存"}
          </Button>
          {current.id && (
            <Button
              variant={current.approved ? "outline" : "default"}
              size="sm"
              onClick={handleApprove}
              className={current.approved ? "" : "bg-green-600 hover:bg-green-700"}
            >
              <CheckCircle className="h-4 w-4 mr-2" />
              {current.approved ? "取消审批" : "审批"}
            </Button>
          )}
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 尺寸表 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">尺寸表</CardTitle>
              <CardDescription>各码位的尺寸数据（单位：cm）</CardDescription>
            </div>
            <Button variant="outline" size="xs" onClick={handleAddSize}>
              <Plus className="h-3 w-3 mr-1" />
              添加码位
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left p-2 font-medium text-muted-foreground">码位</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">胸围</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">腰围</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">臀围</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">衣长</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">肩宽</th>
                  <th className="text-left p-2 font-medium text-muted-foreground">袖长</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {current.sizeChart.map((row, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="p-2">
                      <Input
                        className="h-8 w-16"
                        value={row.size}
                        onChange={(e) => handleSizeChange(i, "size", e.target.value)}
                        placeholder="S"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 w-16"
                        type="number"
                        value={row.chest}
                        onChange={(e) => handleSizeChange(i, "chest", e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 w-16"
                        type="number"
                        value={row.waist}
                        onChange={(e) => handleSizeChange(i, "waist", e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 w-16"
                        type="number"
                        value={row.hip}
                        onChange={(e) => handleSizeChange(i, "hip", e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 w-16"
                        type="number"
                        value={row.length}
                        onChange={(e) => handleSizeChange(i, "length", e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 w-16"
                        type="number"
                        value={row.shoulder}
                        onChange={(e) => handleSizeChange(i, "shoulder", e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <Input
                        className="h-8 w-16"
                        type="number"
                        value={row.sleeve}
                        onChange={(e) => handleSizeChange(i, "sleeve", e.target.value)}
                        placeholder="0"
                      />
                    </td>
                    <td className="p-2">
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={() => handleRemoveSize(i)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* 工艺说明 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">工艺说明</CardTitle>
            <CardDescription>工艺要求、面料处理、注意事项等</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder="如：面料预缩水处理，前片采用斜裁，领口包边工艺..."
              value={current.processNotes}
              onChange={(e) => setCurrent({ ...current, processNotes: e.target.value })}
            />
          </CardContent>
        </Card>

        {/* 缝制标准 */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">缝制标准</CardTitle>
            <CardDescription>针距、线迹、缝型等标准要求</CardDescription>
          </CardHeader>
          <CardContent>
            <textarea
              className="flex min-h-[180px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
              placeholder="如：明线针距 14针/3cm，包缝四线，领口压 0.5cm 明线..."
              value={current.sewingStandard}
              onChange={(e) => setCurrent({ ...current, sewingStandard: e.target.value })}
            />
          </CardContent>
        </Card>
      </div>

      {/* 印花绣花 */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">印花 / 绣花</CardTitle>
              <CardDescription>图案位置、工艺类型、规格说明</CardDescription>
            </div>
            <Button variant="outline" size="xs" onClick={handleAddPrint}>
              <Plus className="h-3 w-3 mr-1" />
              添加
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {current.printEmbroidery.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">暂无印花绣花记录</p>
          ) : (
            current.printEmbroidery.map((item, i) => (
              <div key={i} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end p-3 bg-slate-50 rounded-lg">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">类型</Label>
                  <select
                    className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={item.type}
                    onChange={(e) => handlePrintChange(i, "type", e.target.value)}
                  >
                    <option value="">请选择</option>
                    <option value="印花">印花</option>
                    <option value="绣花">绣花</option>
                    <option value="烫画">烫画</option>
                    <option value="其他">其他</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">位置</Label>
                  <Input
                    className="h-8"
                    placeholder="如：前胸"
                    value={item.position}
                    onChange={(e) => handlePrintChange(i, "position", e.target.value)}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label className="text-xs text-muted-foreground">规格说明</Label>
                  <div className="flex gap-2">
                    <Input
                      className="h-8 flex-1"
                      placeholder="如：宽 8cm × 高 6cm，四色丝印"
                      value={item.description}
                      onChange={(e) => handlePrintChange(i, "description", e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleRemovePrint(i)}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 z-50 max-w-sm">
          <div
            className={`px-4 py-3 rounded-lg shadow-lg border flex items-start gap-3 bg-white ${
              toast.type === "success" ? "border-green-200" : "border-red-200"
            }`}
          >
            {toast.type === "success" ? (
              <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
            ) : (
              <FileText className="h-4 w-4 text-red-500 mt-0.5" />
            )}
            <div className="flex-1">
              <p className="text-sm font-medium">{toast.type === "success" ? "操作成功" : "操作失败"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{toast.message}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
