"use client";

import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Building2,
  Workflow,
  Cpu,
  Sparkles,
  ArrowRight,
  Shield,
  Settings,
  Loader2,
  Wand2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ElementType } from "react";

interface AdminModule {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: ElementType;
  accent: "navy" | "terracotta" | "teal" | "amber" | "rose";
  active: boolean;
  badge?: string;
}

const accentStyles = {
  navy: {
    iconBg: "bg-gradient-to-br from-navy-600 to-navy-900",
    softBg: "bg-navy-50",
    text: "text-navy-700",
    border: "border-navy-100",
    ring: "group-hover:ring-navy-200",
  },
  terracotta: {
    iconBg: "bg-gradient-to-br from-terracotta-400 to-terracotta-600",
    softBg: "bg-terracotta-50",
    text: "text-terracotta-600",
    border: "border-terracotta-100",
    ring: "group-hover:ring-terracotta-200",
  },
  teal: {
    iconBg: "bg-gradient-to-br from-[#2a9d8f] to-[#1d6f65]",
    softBg: "bg-[#e6f5f3]",
    text: "text-[#1d6f65]",
    border: "border-[#2a9d8f]/20",
    ring: "group-hover:ring-[#2a9d8f]/30",
  },
  amber: {
    iconBg: "bg-gradient-to-br from-[#d4a373] to-[#a67c52]",
    softBg: "bg-[#faf3eb]",
    text: "text-[#8b6914]",
    border: "border-[#d4a373]/25",
    ring: "group-hover:ring-[#d4a373]/30",
  },
  rose: {
    iconBg: "bg-gradient-to-br from-[#e07a8f] to-[#b85a6d]",
    softBg: "bg-[#fdf2f4]",
    text: "text-[#b85a6d]",
    border: "border-[#e07a8f]/20",
    ring: "group-hover:ring-[#e07a8f]/30",
  },
};

const adminModules: AdminModule[] = [
  {
    id: "people",
    title: "人员与权限",
    description: "管理公司成员、角色层级和品牌分配，控制谁能看到什么。",
    href: "/admin/people",
    icon: Users,
    accent: "navy",
    active: true,
  },
  {
    id: "brands",
    title: "品牌管理",
    description: "设置品牌名称、logo、季次等公司品牌资产与基础信息。",
    href: "/brands",
    icon: Building2,
    accent: "terracotta",
    active: true,
  },
  {
    id: "process-owner-scopes",
    title: "工序主管类型",
    description: "配置设计主管、产品主管、运营主管、售后主管等工序段。",
    href: "/admin/process-owner-scopes",
    icon: Workflow,
    accent: "teal",
    active: true,
  },
  {
    id: "process-roles",
    title: "工序角色",
    description: "管理企划师、设计师、采购员等横向执行角色与页面权限。",
    href: "/admin/process-roles",
    icon: Cpu,
    accent: "amber",
    active: true,
  },
  {
    id: "ai-skills",
    title: "AI Skill 配置",
    description: "按工序和环节配置 AI 智能体、工序总管与个人秘书 skill。",
    href: "/admin/ai-skills",
    icon: Sparkles,
    accent: "rose",
    active: true,
  },
];

export default function AdminPage() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ createdRoles?: number; createdSkills?: number } | null>(null);

  const handleSeedDefaults = async () => {
    if (!confirm("将一键初始化默认工序角色和 AI Skill，是否继续？")) return;
    setSeeding(true);
    try {
      const res = await fetch("/api/admin/seed-defaults", { method: "POST" });
      const json = await res.json().catch(() => ({}));
      if (res.ok) {
        setSeedResult({ createdRoles: json.createdRoles, createdSkills: json.createdSkills });
        setTimeout(() => setSeedResult(null), 5000);
      } else {
        alert(json.error || "初始化失败");
      }
    } catch (error) {
      console.error("Failed to seed defaults:", error);
      alert("初始化失败");
    } finally {
      setSeeding(false);
    }
  };

  return (
    <SidebarLayout>
      <AdminPageContainer>
        <AdminPageHeader
          title="后台配置"
          description="管理中心：人员权限、品牌、工序角色与 AI 技能配置"
          icon={Shield}
        />

        {/* 欢迎提示 */}
        <div className="mb-10 p-6 rounded-2xl border border-border/60 bg-gradient-to-r from-navy-50/80 via-card to-sand-50/50 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-white border border-border/60 flex items-center justify-center shadow-sm flex-shrink-0">
                <Settings className="h-5 w-5 text-navy-700" />
              </div>
              <div className="space-y-1">
                <h2 className="text-base font-semibold text-foreground">系统管理入口</h2>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                  这里是整个 Fashion AI PLM 的系统配置中枢。建议在初始化时先完成「品牌管理」和「人员与权限」，
                  再配置工序角色与 AI Skill，确保后续业务模块正常运行。
                </p>
              </div>
            </div>
            <div className="flex-shrink-0">
              <Button
                variant="outline"
                onClick={handleSeedDefaults}
                disabled={seeding}
                className="border-navy-200 text-navy-700 hover:bg-navy-50 hover:text-navy-800"
              >
                {seeding ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Wand2 className="h-4 w-4 mr-2" />
                )}
                初始化默认角色/Skill
              </Button>
              {seedResult && (
                <p className="text-xs text-green-700 mt-2 text-right">
                  已新增 {seedResult.createdRoles} 个角色、{seedResult.createdSkills} 个 Skill
                </p>
              )}
            </div>
          </div>
        </div>

        {/* 配置模块网格 */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 lg:gap-8">
          {adminModules.map((module, index) => {
            const Icon = module.icon;
            const accent = accentStyles[module.accent];

            return (
              <div
                key={module.id}
                className="group relative flex flex-col rounded-2xl border border-border bg-card overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-premium"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {/* 顶部色条 */}
                <div className={cn("h-1.5 w-full", accent.iconBg)} />

                <div className="flex-1 p-6 flex flex-col">
                  <div className="flex items-start justify-between mb-5">
                    <div
                      className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm transition-transform duration-300 group-hover:scale-105",
                        accent.iconBg
                      )}
                    >
                      <Icon className="h-5 w-5 text-white" />
                    </div>
                    <span className="text-xs font-medium text-muted-foreground/60 font-mono">
                      0{index + 1}
                    </span>
                  </div>

                  <div className="flex-1 space-y-2 mb-6">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-foreground">{module.title}</h3>
                      {module.badge && (
                        <Badge variant="secondary" className="text-[10px] font-normal">
                          {module.badge}
                        </Badge>
                      )}
                      {!module.active && (
                        <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                          待开发
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed min-h-[44px]">
                      {module.description}
                    </p>
                  </div>

                  <Button
                    variant={module.active ? "default" : "outline"}
                    className={cn(
                      "w-full justify-between group/btn transition-all",
                      module.active
                        ? "bg-navy-700 hover:bg-navy-800 text-white"
                        : "text-muted-foreground"
                    )}
                    disabled={!module.active}
                    onClick={() => router.push(module.href)}
                  >
                    <span>进入配置</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-0.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </AdminPageContainer>
    </SidebarLayout>
  );
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
