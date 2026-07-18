"use client";

import { useState, useEffect } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X, AlertCircle, Brain, Clock, CheckCircle2 } from "lucide-react";
import {
  AIRoleLevelLabels,
  AISpecialistLabels,
  AIAssistantLabels,
  AISuggestionStatus,
} from "@/lib/ai/architecture";

interface AISuggestion {
  id: string;
  ai_role_level: string;
  specialist_type: string | null;
  assistant_type: string | null;
  brand_id: string | null;
  process_node: string | null;
  type: string;
  priority: string;
  title: string;
  content: string;
  proposed_data: any;
  target_table: string | null;
  target_id: string | null;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_comment: string | null;
  created_at: string;
  expire_at: string | null;
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-orange-100 text-orange-700 border-orange-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-slate-100 text-slate-700 border-slate-200",
};

const typeLabels: Record<string, string> = {
  analysis: "分析报告",
  decision: "决策建议",
  prediction: "预测建议",
  optimization: "优化建议",
  alert: "异常提醒",
  automation: "自动化执行",
};

export default function AIReviewPage() {
  const [suggestions, setSuggestions] = useState<AISuggestion[]>([]);
  const [filter, setFilter] = useState<string>("pending");
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<string | null>(null);

  useEffect(() => {
    fetchSuggestions();
  }, [filter]);

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/ai-suggestions?status=${filter}`);
      const data = await res.json();
      setSuggestions(data || []);
    } catch (error) {
      console.error("Failed to fetch suggestions:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (id: string, status: "approved" | "rejected", comment?: string) => {
    setReviewing(id);
    try {
      await fetch("/api/ai-suggestions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, reviewComment: comment }),
      });
      fetchSuggestions();
    } catch (error) {
      console.error("Failed to review:", error);
    } finally {
      setReviewing(null);
    }
  };

  const getAIRoleLabel = (level: string) => AIRoleLevelLabels[level] || level;
  const getSpecialistLabel = (type: string | null) =>
    type ? AISpecialistLabels[type] || type : null;
  const getAssistantLabel = (type: string | null) =>
    type ? AIAssistantLabels[type] || type : null;

  return (
    <SidebarLayout>
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
              <Brain className="h-6 w-6 text-purple-600" />
              AI建议审核中心
            </h1>
            <p className="text-muted-foreground">
              AI驱动的品牌全链路管理 · 所有AI建议需人工审核后生效
            </p>
          </div>
        </div>

        {/* 过滤标签 */}
        <div className="flex items-center gap-2 mb-6">
          {[
            { value: "pending", label: "待审核", icon: Clock },
            { value: "approved", label: "已通过", icon: CheckCircle2 },
            { value: "rejected", label: "已拒绝", icon: X },
            { value: "executed", label: "已执行", icon: Check },
            { value: "all", label: "全部", icon: AlertCircle },
          ].map(tab => (
            <Button
              key={tab.value}
              variant={filter === tab.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(tab.value)}
            >
              <tab.icon className="h-4 w-4 mr-1" />
              {tab.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="py-32 text-center text-muted-foreground">加载中...</div>
        ) : suggestions.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center text-muted-foreground">
              <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>暂无AI建议</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {suggestions.map(suggestion => (
              <Card key={suggestion.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* 标签行 */}
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                          {getAIRoleLabel(suggestion.ai_role_level)}
                        </Badge>
                        {getSpecialistLabel(suggestion.specialist_type) && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {getSpecialistLabel(suggestion.specialist_type)}
                          </Badge>
                        )}
                        {getAssistantLabel(suggestion.assistant_type) && (
                          <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                            {getAssistantLabel(suggestion.assistant_type)}
                          </Badge>
                        )}
                        <Badge variant="outline" className={priorityColors[suggestion.priority] || ""}>
                          {suggestion.priority === "critical" ? "紧急" :
                           suggestion.priority === "high" ? "高" :
                           suggestion.priority === "medium" ? "中" : "低"}
                        </Badge>
                        <Badge variant="secondary">
                          {typeLabels[suggestion.type] || suggestion.type}
                        </Badge>
                        {suggestion.status !== "pending" && (
                          <Badge variant="outline">
                            {suggestion.status === "approved" ? "已通过" :
                             suggestion.status === "rejected" ? "已拒绝" :
                             suggestion.status === "executed" ? "已执行" : suggestion.status}
                          </Badge>
                        )}
                      </div>

                      {/* 标题和内容 */}
                      <h3 className="font-semibold text-base mb-2">{suggestion.title}</h3>
                      <p className="text-sm text-muted-foreground mb-3 whitespace-pre-wrap">
                        {suggestion.content}
                      </p>

                      {/* 时间信息 */}
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span>{new Date(suggestion.created_at).toLocaleString("zh-CN")}</span>
                        {suggestion.expire_at && (
                          <span>过期时间：{new Date(suggestion.expire_at).toLocaleString("zh-CN")}</span>
                        )}
                      </div>
                    </div>

                    {/* 操作按钮 */}
                    {suggestion.status === "pending" && (
                      <div className="flex flex-col gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => handleReview(suggestion.id, "approved")}
                          disabled={reviewing === suggestion.id}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <Check className="h-4 w-4 mr-1" />
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReview(suggestion.id, "rejected")}
                          disabled={reviewing === suggestion.id}
                          className="text-red-600 border-red-200 hover:bg-red-50"
                        >
                          <X className="h-4 w-4 mr-1" />
                          拒绝
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </SidebarLayout>
  );
}
