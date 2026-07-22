"use client";

import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  Workflow,
  Cpu,
  Sparkles,
  ArrowRight,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface AdminModule {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: React.ElementType;
  active: boolean;
}

const adminModules: AdminModule[] = [
  {
    id: "people",
    title: "人员与权限",
    description: "管理公司成员、角色层级和品牌分配",
    href: "/admin/people",
    icon: Users,
    active: true,
  },
  {
    id: "brands",
    title: "品牌管理",
    description: "设置品牌名称、logo、季次等公司品牌资产",
    href: "/brands",
    icon: Building2,
    active: true,
  },
  {
    id: "process-owners",
    title: "工序主管类型",
    description: "配置设计主管、产品主管、运营主管、售后主管等工序段",
    href: "/admin/process-owners",
    icon: Workflow,
    active: true,
  },
  {
    id: "process-roles",
    title: "工序角色",
    description: "管理企划师、设计师、采购员等横向执行角色",
    href: "/admin/process-roles",
    icon: Cpu,
    active: true,
  },
  {
    id: "ai-skills",
    title: "AI Skill 配置",
    description: "按工序和环节配置 AI 智能体与执行 skill",
    href: "/admin/ai-skills",
    icon: Sparkles,
    active: true,
  },
];

export default function AdminPage() {
  const router = useRouter();

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center shadow-premium">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">后台配置</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-13">
              管理中心：人员权限、品牌、工序角色与 AI 技能配置
            </p>
          </div>
        </div>

        {/* 配置模块网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {adminModules.map((module) => {
            const Icon = module.icon;
            return (
              <Card
                key={module.id}
                className={`card-premium transition-all ${
                  module.active
                    ? "hover:shadow-premium hover:-translate-y-0.5"
                    : "opacity-70"
                }`}
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 section-title !before:hidden">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      module.active ? "bg-navy-100 text-navy-700" : "bg-slate-100 text-slate-500"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    {module.title}
                    {!module.active && (
                      <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                        待开发
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground min-h-[40px]">
                    {module.description}
                  </p>
                  <Button
                    variant={module.active ? "default" : "outline"}
                    className={`w-full ${
                      module.active
                        ? "bg-navy-700 hover:bg-navy-800 text-white"
                        : "text-slate-500"
                    }`}
                    disabled={!module.active}
                    onClick={() => router.push(module.href)}
                  >
                    进入配置
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </SidebarLayout>
  );
}
