"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/auth/supabase";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutDashboard, Plus, Package, Search, Filter, LogOut } from "lucide-react";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [styles, setStyles] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    const getUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (data.user) {
        setUser(data.user);
      }
    };
    getUser();
  }, []);

  useEffect(() => {
    fetchStyles();
  }, []);

  const fetchStyles = async () => {
    const { data, error } = await supabase.from("styles").select("*");
    if (data) {
      setStyles(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const statusLabels: Record<string, { label: string; variant: "secondary" | "destructive" | "default" | "link" | "outline" | "ghost" }> = {
    planning: { label: "企划中", variant: "default" },
    designing: { label: "设计中", variant: "outline" },
    designed: { label: "设计定稿", variant: "secondary" },
    sampling: { label: "打样中", variant: "outline" },
    sampled: { label: "封样完成", variant: "secondary" },
    producing: { label: "大货生产", variant: "outline" },
    produced: { label: "大货完成", variant: "secondary" },
    selling: { label: "销售中", variant: "outline" },
    sold: { label: "销售结束", variant: "default" },
    reviewing: { label: "复盘中", variant: "outline" },
    archived: { label: "已归档", variant: "default" },
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-black flex items-center justify-center">
                <span className="text-white text-sm font-bold">SF</span>
              </div>
              <span className="font-bold text-lg">StyleForge</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden md:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">欢迎回来，{user?.email}</span>
              </div>
              <Button variant="outline" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                退出
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">工作台</h1>
            <p className="text-muted-foreground">管理您的服装款式全生命周期</p>
          </div>
          <Button onClick={() => router.push("/styles/new")}>
            <Plus className="h-4 w-4 mr-2" />
            新建款式
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">总款式数</p>
                  <p className="text-2xl font-bold mt-1">{styles.length}</p>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Package className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">设计中</p>
                  <p className="text-2xl font-bold mt-1">
                    {styles.filter((s) => s.status === "designing").length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <LayoutDashboard className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">打样中</p>
                  <p className="text-2xl font-bold mt-1">
                    {styles.filter((s) => s.status === "sampling").length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center">
                  <Search className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">生产中</p>
                  <p className="text-2xl font-bold mt-1">
                    {styles.filter((s) => s.status === "producing").length}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <Filter className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>款式列表</CardTitle>
            <CardDescription>查看所有款式及其状态</CardDescription>
          </CardHeader>
          <CardContent>
            {styles.length === 0 ? (
              <div className="text-center py-12">
                <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">暂无款式</p>
                <Button onClick={() => router.push("/styles/new")} className="mt-4">
                  新建第一个款式
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {styles.map((style) => (
                  <div
                    key={style.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/styles/${style.id}`)}
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                        <span className="text-lg font-bold">{style.styleNo.slice(0, 2)}</span>
                      </div>
                      <div>
                        <h3 className="font-semibold">{style.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {style.styleNo} · {style.category} · {style.season}
                        </p>
                      </div>
                    </div>
                    <Badge variant={statusLabels[style.status]?.variant || "default"}>
                      {statusLabels[style.status]?.label || style.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
