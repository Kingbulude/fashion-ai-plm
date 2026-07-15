"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Plus, Upload } from "lucide-react";

export default function NewStylePage() {
  const [formData, setFormData] = useState({
    styleNo: "",
    name: "",
    season: "",
    category: "",
    description: "",
    targetCost: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("planning");
  
  const router = useRouter();

  const statusOptions = [
    { value: "planning", label: "企划中" },
    { value: "designing", label: "设计中" },
    { value: "designed", label: "设计定稿" },
    { value: "sampling", label: "打样中" },
    { value: "sampled", label: "封样完成" },
    { value: "producing", label: "大货生产" },
    { value: "produced", label: "大货完成" },
    { value: "selling", label: "销售中" },
    { value: "sold", label: "销售结束" },
    { value: "reviewing", label: "复盘中" },
    { value: "archived", label: "已归档" },
  ];

  const seasonOptions = ["2026SS", "2026AW", "2027SS", "2027AW"];
  const categoryOptions = ["上衣", "裤装", "裙装", "外套", "配饰", "其他"];

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    if (!formData.styleNo || !formData.name) {
      setError("款号和款式名称不能为空");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/styles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, status }),
      });

      if (!response.ok) {
        const data = await response.json();
        setError(data.error || "创建款式失败");
      } else {
        const data = await response.json();
        router.push(`/styles/${data.id}`);
      }
    } catch (err) {
      setError("网络错误，请稍后重试");
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => router.back()}>
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                <span className="text-white text-sm font-bold">SF</span>
              </div>
              <span className="font-bold text-lg">StyleForge</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle>新建款式</CardTitle>
            <CardDescription>创建一个新的服装款式档案</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="styleNo">款号 *</Label>
                <Input
                  id="styleNo"
                  placeholder="如：SF26SS001"
                  value={formData.styleNo}
                  onChange={(e) => setFormData({ ...formData, styleNo: e.target.value })}
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">款式名称 *</Label>
                <Input
                  id="name"
                  placeholder="如：极简收腰连衣裙"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="season">季节</Label>
                <select
                  id="season"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.season}
                  onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                  disabled={loading}
                >
                  <option value="">请选择季节</option>
                  {seasonOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">品类</Label>
                <select
                  id="category"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  disabled={loading}
                >
                  <option value="">请选择品类</option>
                  {categoryOptions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">描述</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                placeholder="描述这款服装的设计特点、风格等..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetCost">目标成本（元）</Label>
              <Input
                id="targetCost"
                type="number"
                placeholder="如：120"
                value={formData.targetCost}
                onChange={(e) => setFormData({ ...formData, targetCost: e.target.value })}
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label>当前状态</Label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map((option) => (
                  <Badge
                    key={option.value}
                    variant={status === option.value ? "default" : "outline"}
                    onClick={() => !loading && setStatus(option.value)}
                    className="cursor-pointer"
                  >
                    {option.label}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button variant="outline" onClick={() => router.back()}>
                取消
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? "创建中..." : "创建款式"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
