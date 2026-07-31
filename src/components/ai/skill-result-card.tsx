// 结构化 Skill 结果渲染卡片
// 根据 Skill 输出类型渲染主题企划、库存盘活等结果

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface SkillAction {
  label: string;
  action: string;
  payload?: Record<string, unknown>;
}

interface SkillResultCardProps {
  summary: string;
  data: Record<string, any>;
  actions?: SkillAction[];
  onAction?: (action: SkillAction) => void;
}

export function SkillResultCard({ summary, data, actions, onAction }: SkillResultCardProps) {
  const themes = data.themes;
  const underperformers = data.underperformers;

  return (
    <Card className="border-navy-100">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-medium">{summary}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {Array.isArray(themes) && themes.length > 0 && (
          <div className="space-y-3">
            {themes.map((t: any, idx: number) => (
              <div key={idx} className="rounded-lg bg-sand-50 p-3">
                <p className="font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">{t.concept}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  {t.categories && (
                    <span className="px-2 py-1 bg-white rounded border">品类：{t.categories}</span>
                  )}
                  {t.colors && (
                    <span className="px-2 py-1 bg-white rounded border">色彩：{t.colors}</span>
                  )}
                  {t.fabrics && (
                    <span className="px-2 py-1 bg-white rounded border">面料：{t.fabrics}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {Array.isArray(underperformers) && underperformers.length > 0 && (
          <div className="space-y-3">
            {underperformers.map((item: any, idx: number) => (
              <div key={idx} className="rounded-lg bg-red-50 p-3">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{item.name}</p>
                  <span className="text-xs text-muted-foreground">售罄率 {item.sellThrough}%</span>
                </div>
                <p className="text-sm mt-1">{item.suggestion}</p>
                <p className="text-xs text-muted-foreground mt-1">预期效果：{item.expectedEffect}</p>
              </div>
            ))}
          </div>
        )}

        {actions && actions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            {actions.map((action, idx) => (
              <Button key={idx} size="sm" variant="outline" onClick={() => onAction?.(action)}>
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
