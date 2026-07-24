"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTenant, AISkill } from "@/lib/auth/tenant-context";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AIChatDialog } from "@/components/ai/ai-chat-dialog";
import {
  Sparkles,
  UserCircle,
  Layers,
  Cpu,
  ArrowRight,
  Lightbulb,
  Palette,
  Shirt,
  Scissors,
  Microscope,
  ShoppingBag,
  Factory,
  TrendingUp,
  HeadphonesIcon,
  Wand2,
  MessageSquare,
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
  const router = useRouter();
  const { accessibleAISkills, isLoading } = useTenant();

  const [chatOpen, setChatOpen] = useState(false);
  const [activeSkill, setActiveSkill] = useState<AISkill | null>(null);

  const openChat = (skill: AISkill) => {
    setActiveSkill(skill);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setActiveSkill(null);
  };

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
      <div className="p-6 lg:p-8 max-w-[2400px] mx-auto">
        {/* 顶部标题栏 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-10 h-10 rounded-xl gradient-navy flex items-center justify-center shadow-premium">
                <Wand2 className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight">AI 智能体中心</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-13">
              按工序和执行环节组织的 AI 能力矩阵，关键人物配备 AI 秘书，每道工序配备总管 AI 与执行 Skill
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="py-32 text-center text-muted-foreground flex items-center justify-center gap-2">
            <Sparkles className="h-5 w-5 animate-pulse" />
            加载 AI 能力中...
          </div>
        ) : !hasAnySkills ? (
          <Card className="card-premium">
            <CardContent className="py-20 text-center">
              <Sparkles className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">暂无可用 AI 智能体</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                当前账号未被分配任何 AI Skill。请联系管理员在「后台配置 → AI Skill 管理」中为您分配角色或主管类型对应的智能体。
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-10">
            {skillTypeOrder.map((skillType) => {
              const typeGroup = groupedSkills[skillType] || {};
              const typeSkills = Object.values(typeGroup).flat();
              if (typeSkills.length === 0) return null;

              const typeConfig = skillTypeLabels[skillType];
              const TypeIcon = typeConfig.icon;

              return (
                <section key={skillType}>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-lg bg-navy-100 flex items-center justify-center">
                      <TypeIcon className="h-4 w-4 text-navy-700" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">{typeConfig.title}</h2>
                      <p className="text-xs text-muted-foreground">{typeConfig.description}</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {Object.entries(typeGroup).map(([node, skills]) => {
                      if (skills.length === 0) return null;
                      const NodeIcon = processNodeIcons[node] || Sparkles;
                      const nodeLabel = processNodeLabels[node] || node;

                      return (
                        <div key={`${skillType}-${node}`}>
                          <div className="flex items-center gap-2 mb-3 text-sm text-muted-foreground">
                            <NodeIcon className="h-4 w-4" />
                            <span className="font-medium text-foreground">{nodeLabel}</span>
                            <Badge variant="secondary" className="text-xs">
                              {skills.length} 个
                            </Badge>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {skills.map((skill) => (
                              <SkillCard key={skill.id} skill={skill} onChat={openChat} />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        )}

        <AIChatDialog open={chatOpen} onClose={closeChat} skill={activeSkill} />
      </div>
    </SidebarLayout>
  );
}

function SkillCard({ skill, onChat }: { skill: AISkill; onChat: (skill: AISkill) => void }) {
  const router = useRouter();
  const nodeLabel = skill.process_node ? processNodeLabels[skill.process_node] : null;

  return (
    <Card className="card-premium group hover:shadow-premium transition-all duration-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base font-medium truncate">{skill.name}</CardTitle>
            {nodeLabel && (
              <Badge variant="outline" className="mt-1.5 text-xs font-normal">
                {nodeLabel}
              </Badge>
            )}
          </div>
          <div className="w-8 h-8 rounded-lg bg-sand-50 flex items-center justify-center flex-shrink-0 group-hover:bg-navy-50 transition-colors">
            <Sparkles className="h-4 w-4 text-navy-600" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <CardDescription className="text-sm line-clamp-2 min-h-[2.5rem]">
          {skill.description || "暂无描述"}
        </CardDescription>

        <div className="mt-4 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground font-mono truncate">
            {skill.key}
          </span>
          {skill.entry_route ? (
            <Button
              size="sm"
              className="bg-navy-700 hover:bg-navy-800 text-white flex-shrink-0"
              onClick={() => router.push(skill.entry_route!)}
            >
              进入
              <ArrowRight className="h-3.5 w-3.5 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              className="flex-shrink-0 border-navy-200 text-navy-700 hover:bg-navy-50 hover:text-navy-800"
              onClick={() => onChat(skill)}
            >
              <MessageSquare className="h-3.5 w-3.5 mr-1" />
              对话
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


