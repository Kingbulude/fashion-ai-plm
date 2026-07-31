"use client";

import { useMemo, useState } from "react";
import { useTenant, AISkill } from "@/lib/auth/tenant-context";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AIOrchestratorPanel } from "@/components/ai/ai-orchestrator-panel";
import {
  Sparkles,
  UserCircle,
  Layers,
  Cpu,
  Lightbulb,
  Palette,
  Shirt,
  Microscope,
  ShoppingBag,
  Factory,
  TrendingUp,
  HeadphonesIcon,
  Wand2,
} from "lucide-react";

const processNodeLabels: Record<string, string> = {
  planning: "企划",
  design: "设计",
  sampling: "打样",
  testing: "测款",
  procurement: "采购",
  stocking: "备货/生产",
  sales: "销售",
  aftersales: "售后",
};

const skillTypeLabels: Record<string, { title: string; description: string; icon: React.ElementType }> = {
  personal_assistant: {
    title: "个人 AI 秘书",
    description: "为关键岗位角色配备的专属智能助理，统筹管理、分配任务、跟进进度",
    icon: UserCircle,
  },
  process_master: {
    title: "工序总管 AI",
    description: "负责单道工序的整体统筹与决策支持，协调该工序下的执行环节",
    icon: Layers,
  },
  execution: {
    title: "执行环节 AI Skill",
    description: "针对具体执行步骤的专项 AI 能力，产出结果清单供下一环节使用",
    icon: Cpu,
  },
};

const processNodeIcons: Record<string, React.ElementType> = {
  planning: Lightbulb,
  design: Palette,
  sampling: Shirt,
  testing: Microscope,
  procurement: ShoppingBag,
  stocking: Factory,
  sales: TrendingUp,
  aftersales: HeadphonesIcon,
};

const skillTypeOrder = ["personal_assistant", "process_master", "execution"];

export default function AIWorkspacePage() {
  const { accessibleAISkills, isLoading, currentSeason } = useTenant();

  const [activeSkill, setActiveSkill] = useState<AISkill | null>(null);

  const groupedSkills = useMemo(() => {
    const result: Record<string, Record<string, AISkill[]>> = {};

    skillTypeOrder.forEach((type) => {
      result[type] = {};
    });

    accessibleAISkills.forEach((skill) => {
      const type = skill.skill_type || "execution";
      const node = skill.process_node || "other";

      if (!result[type]) {
        result[type] = {};
      }
      if (!result[type][node]) {
        result[type][node] = [];
      }
      result[type][node].push(skill);
    });

    return result;
  }, [accessibleAISkills]);

  const hasAnySkills = accessibleAISkills.length > 0;

  return (
    <SidebarLayout>
      <div className="h-[calc(100vh-4rem)] flex">
        {/* 左侧 Skill 列表 */}
        <div className="w-80 border-r bg-white overflow-y-auto flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-navy flex items-center justify-center">
                <Wand2 className="h-4 w-4 text-white" />
              </div>
              <h2 className="text-lg font-semibold">AI Skill</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1">选择智能体并开始对话</p>
          </div>

          <div className="flex-1 p-3 space-y-4">
            {isLoading ? (
              <div className="py-12 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4 animate-pulse" />
                加载中...
              </div>
            ) : !hasAnySkills ? (
              <Card>
                <CardContent className="py-8 text-center text-sm text-muted-foreground">
                  暂无可用 AI 智能体
                </CardContent>
              </Card>
            ) : (
              skillTypeOrder.map((skillType) => {
                const typeGroup = groupedSkills[skillType] || {};
                const typeSkills = Object.values(typeGroup).flat();
                if (typeSkills.length === 0) return null;

                const typeConfig = skillTypeLabels[skillType];
                const TypeIcon = typeConfig.icon;

                return (
                  <div key={skillType}>
                    <div className="flex items-center gap-2 mb-2 px-1">
                      <TypeIcon className="h-3.5 w-3.5 text-navy-600" />
                      <span className="text-xs font-medium text-navy-700">{typeConfig.title}</span>
                    </div>

                    <div className="space-y-1">
                      {Object.entries(typeGroup).map(([node, skills]) =>
                        skills.map((skill) => {
                          const NodeIcon = processNodeIcons[node] || Sparkles;
                          const nodeLabel = processNodeLabels[node] || node;
                          const isActive = activeSkill?.id === skill.id;

                          return (
                            <button
                              key={skill.id}
                              onClick={() => setActiveSkill(skill)}
                              className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                                isActive
                                  ? "bg-navy-50 text-navy-800 border border-navy-200"
                                  : "hover:bg-sand-50 border border-transparent"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-medium truncate">{skill.name}</span>
                                {skill.process_node && (
                                  <Badge variant="outline" className="text-[10px] h-5 px-1 font-normal shrink-0">
                                    <NodeIcon className="h-3 w-3 mr-0.5" />
                                    {nodeLabel}
                                  </Badge>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                                {skill.description || "暂无描述"}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 右侧执行面板 */}
        <div className="flex-1 flex flex-col bg-sand-50/30">
          <div className="px-6 py-4 border-b bg-white">
            <h1 className="text-xl font-bold">
              {activeSkill ? activeSkill.name : "AI 智能体中心"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {activeSkill
                ? activeSkill.description || ""
                : "从左侧选择一个 Skill，或直接输入需求"}
            </p>
          </div>
          <div className="flex-1 overflow-hidden">
            <AIOrchestratorPanel skill={activeSkill} seasonId={currentSeason?.id} />
          </div>
        </div>
      </div>
    </SidebarLayout>
  );
}
