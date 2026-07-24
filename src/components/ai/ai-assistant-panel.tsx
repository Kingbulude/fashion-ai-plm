"use client";

import { useRouter } from "next/navigation";
import { useTenant, AISkill } from "@/lib/auth/tenant-context";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Bot, ArrowRight, Cpu, UserCircle, Layers } from "lucide-react";

const skillTypeConfig: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  personal_assistant: { label: "个人秘书", icon: UserCircle, color: "text-purple-600" },
  process_master: { label: "工序总管", icon: Layers, color: "text-navy-600" },
  execution: { label: "执行 Skill", icon: Cpu, color: "text-terracotta-600" },
};

interface AIAssistantPanelProps {
  processNode: string;
  title?: string;
}

export function AIAssistantPanel({ processNode, title }: AIAssistantPanelProps) {
  const router = useRouter();
  const { accessibleAISkills } = useTenant();

  const skills = accessibleAISkills.filter(
    (skill) => skill.process_node === processNode && skill.is_active !== false
  );

  if (skills.length === 0) return null;

  return (
    <Card className="card-premium border-navy-100/50">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-navy-600 to-navy-800 flex items-center justify-center">
            <Bot className="h-3.5 w-3.5 text-white" />
          </div>
          <CardTitle className="text-sm font-semibold">
            {title || "AI 助手"}
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          当前工序可用的 {skills.length} 个 AI 能力
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0 space-y-2">
        {skills.map((skill) => (
          <SkillItem key={skill.id} skill={skill} onNavigate={() => skill.entry_route && router.push(skill.entry_route)} />
        ))}
      </CardContent>
    </Card>
  );
}

function SkillItem({ skill, onNavigate }: { skill: AISkill; onNavigate: () => void }) {
  const config = skillTypeConfig[skill.skill_type] || skillTypeConfig.execution;
  const Icon = config.icon;

  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg border border-border/60 bg-card hover:bg-sand-50/60 transition-colors">
      <div className={`mt-0.5 ${config.color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{skill.name}</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
            {config.label}
          </Badge>
        </div>
        {skill.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {skill.description}
          </p>
        )}
      </div>
      {skill.entry_route ? (
        <Button
          size="icon"
          variant="ghost"
          className="h-7 w-7 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={onNavigate}
        >
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Sparkles className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0 mt-1" />
      )}
    </div>
  );
}
