"use client";

import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";

export default function ForbiddenPage() {
  const router = useRouter();

  return (
    <SidebarLayout>
      <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mb-6">
          <ShieldAlert className="h-8 w-8 text-amber-600" />
        </div>
        <h1 className="text-4xl font-bold text-navy-700 mb-2">403</h1>
        <p className="text-lg text-muted-foreground mb-2">您没有权限访问该页面</p>
        <p className="text-sm text-muted-foreground/80 mb-8 text-center max-w-md">
          如果您认为这是一个错误，请联系公司管理员或老板调整您的角色权限和品牌访问范围。
        </p>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回上一页
          </Button>
          <Button onClick={() => router.push("/dashboard")} className="bg-navy-700 hover:bg-navy-800 text-white">
            返回工作台
          </Button>
        </div>
      </div>
    </SidebarLayout>
  );
}
