"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Plus, Shirt, Sparkles } from "lucide-react";

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
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold mb-1">新建款式</h1>
            <p className="text-muted-foreground">创建一个新的服装款式档案</p>
          </div>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">基本信息</CardTitle>
                <CardDescription>款式的核心识别信息</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="styleNo" className="text-sm font-medium">款号 *</Label>
                    <Input
                      id="styleNo"
                      placeholder="如：SF26SS001"
                      value={formData.styleNo}
                      onChange={(e) => setFormData({ ...formData, styleNo: e.target.value })}
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">款式名称 *</Label>
                    <Input
                      id="name"
                      placeholder="如：极简收腰连衣裙"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={loading}
                      className="h-11"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="season" className="text-sm font-medium">季节</Label>
                    <select
                      id="season"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    <Label htmlFor="category" className="text-sm font-medium">品类</Label>
                    <select
                      id="category"
                      className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                  <Label htmlFor="description" className="text-sm font-medium">设计描述</Label>
                  <textarea
                    id="description"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                    placeholder="描述这款服装的设计特点、风格定位、目标人群等..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="targetCost" className="text-sm font-medium">目标成本（元）</Label>
                  <Input
                    id="targetCost"
                    type="number"
                    placeholder="如：120"
                    value={formData.targetCost}
                    onChange={(e) => setFormData({ ...formData, targetCost: e.target.value })}
                    disabled={loading}
                    className="h-11"
                  />
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">当前状态</CardTitle>
                <CardDescription>选择款式当前所处的阶段</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {statusOptions.map((option) => (
                    <Badge
                      key={option.value}
                      variant={status === option.value ? "default" : "outline"}
                      onClick={() => !loading && setStatus(option.value)}
                      className={`cursor-pointer px-3 py-1.5 text-sm ${status === option.value ? "" : "hover:bg-slate-100"}`}
                    >
                      {option.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-indigo-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">AI 智能辅助</h3>
                    <p className="text-xs text-muted-foreground">上传设计稿自动生成标签</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  创建款式后，上传设计稿，AI 将自动提取色彩、风格、元素等标签。
                </p>
                <Button variant="outline" className="w-full bg-white/50 hover:bg-white/80" disabled>
                  创建后体验
                </Button>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6 space-y-3">
                <h3 className="font-semibold text-sm mb-4">操作</h3>
                <Button 
                  className="w-full h-11" 
                  onClick={handleSubmit} 
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {loading ? "创建中..." : "创建款式"}
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full h-11" 
                  onClick={() => router.back()}
                  disabled={loading}
                >
                  取消
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
