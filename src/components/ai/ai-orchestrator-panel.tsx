// AI Orchestrator 执行面板
// 左侧 Skill 列表选中后，右侧展示此面板：输入需求、查看结构化结果

"use client";

import { useState } from "react";
import { AISkill } from "@/lib/auth/tenant-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Send } from "lucide-react";
import { SkillResultCard } from "./skill-result-card";

interface SkillAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

interface OrchestratorResult {
  skillKey: string;
  skillName: string;
  output: {
    summary: string;
    data: Record<string, any>;
    actions?: SkillAction[];
  };
}

interface AIOrchestratorPanelProps {
  skill: AISkill | null;
  seasonId?: string | null;
}

export function AIOrchestratorPanel({ skill, seasonId }: AIOrchestratorPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<OrchestratorResult | null>(null);

  const run = async () => {
    if (!input.trim() || loading) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/ai/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input.trim(),
          skillKey: skill?.key,
          seasonId,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "执行失败");

      setResult(data);
    } catch (err: any) {
      setError(err.message || "执行失败");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (action: SkillAction) => {
    alert(`动作：${action.label}\n后续开发中...`);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-sand-50/30">
        {skill && !result && (
          <div className="text-sm text-muted-foreground">
            已选择「{skill.name}」{skill.description ? `：${skill.description}` : ""}
          </div>
        )}

        {result && (
          <SkillResultCard
            summary={result.output.summary}
            data={result.output.data}
            actions={result.output.actions}
            onAction={handleAction}
          />
        )}

        {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded">{error}</div>}
      </div>

      <div className="p-4 border-t bg-white">
        <div className="flex items-start gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              skill
                ? `向 ${skill.name} 输入需求...`
                : "输入需求，例如：帮我看看 27SS 哪些款滞销"
            }
            className="flex-1 min-h-[80px]"
            disabled={loading}
          />
          <Button
            className="h-10 w-10 bg-navy-700 hover:bg-navy-800 text-white"
            onClick={run}
            disabled={loading || !input.trim()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
