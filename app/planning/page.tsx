"use client";

import { useState, useEffect, useCallback } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/auth/tenant-context";
import { useApi } from "@/lib/api/use-api";
import {
  Brain,
  Search,
  Lightbulb,
  Package,
  Palette,
  Sparkles,
  Wind,
  CheckCircle2,
  Loader2,
  Wand2,
  X,
  TrendingUp,
  ShoppingBag,
  Shirt,
  DollarSign,
  Calendar,
} from "lucide-react";
import { AIAssistantPanel } from "@/components/ai/ai-assistant-panel";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

interface Skill {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgGradient: string;
  endpoint: string;
  skillKey: string;
}

const SKILLS: Skill[] = [
  {
    id: "brand-dna",
    name: "品牌基因",
    description: "品牌基因拆解规划，对齐品牌核心定位",
    icon: Brain,
    color: "text-blue-600",
    bgGradient: "from-blue-50 to-indigo-50",
    endpoint: "/api/planning/ai/chat",
    skillKey: "brand-dna-analyst",
  },
  {
    id: "market-insight",
    name: "市场需求",
    description: "分析市场趋势、热门商品和消费者需求",
    icon: Search,
    color: "text-green-600",
    bgGradient: "from-green-50 to-emerald-50",
    endpoint: "/api/planning/ai/chat",
    skillKey: "trend-researcher",
  },
  {
    id: "theme-inspiration",
    name: "企划主题",
    description: "分析大牌企划主题，提供灵感参考",
    icon: Lightbulb,
    color: "text-amber-600",
    bgGradient: "from-amber-50 to-orange-50",
    endpoint: "/api/planning/ai/chat",
    skillKey: "theme-planner",
  },
  {
    id: "product-planning",
    name: "商品企划",
    description: "基于市场洞察生成完整商品企划方案",
    icon: Package,
    color: "text-purple-600",
    bgGradient: "from-purple-50 to-violet-50",
    endpoint: "/api/planning/ai/chat",
    skillKey: "theme-planner",
  },
  {
    id: "design-planning",
    name: "设计企划",
    description: "辅助设计师寻找灵感和搭配方向",
    icon: Palette,
    color: "text-pink-600",
    bgGradient: "from-pink-50 to-rose-50",
    endpoint: "/api/planning/ai/chat",
    skillKey: "style-derivative",
  },
  {
    id: "color-planning",
    name: "色彩企划",
    description: "基于流行趋势和品牌基因制定色彩方案",
    icon: Sparkles,
    color: "text-cyan-600",
    bgGradient: "from-cyan-50 to-teal-50",
    endpoint: "/api/planning/ai/chat",
    skillKey: "theme-planner",
  },
  {
    id: "fabric-planning",
    name: "面料企划",
    description: "搜索面料商信息，找到符合主题的面料",
    icon: Wind,
    color: "text-indigo-600",
    bgGradient: "from-indigo-50 to-blue-50",
    endpoint: "/api/planning/ai/chat",
    skillKey: "bom-assistant",
  },
];

export default function PlanningPage() {
  const { currentBrand, currentSeason } = useTenant();
  const api = useApi();

  const [activeSkill, setActiveSkill] = useState<Skill>(SKILLS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [, setConversationId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [skillConversations, setSkillConversations] = useState<Record<string, { messages: Message[]; conversationId: string | null; isCompleted: boolean }>>({});
  const [planOpen, setPlanOpen] = useState(false);
  const [planGenerating, setPlanGenerating] = useState(false);
  const [planForm, setPlanForm] = useState({
    season: currentSeason?.name || "",
    theme: "",
    category: "女装",
    targetCost: "",
  });
  const [comprehensivePlan, setComprehensivePlan] = useState<any>(null);
  const [planError, setPlanError] = useState("");

  const generateWelcomeMessage = (skill: Skill): Message => ({
    id: "welcome",
    content: `您好！我是「${skill.name}」AI 助手。${skill.description}\n\n请输入您的问题或需求，我会基于当前品牌/季次数据为您分析。`,
    sender: "ai",
    timestamp: new Date().toISOString(),
  });

  const loadConversation = useCallback(async (skill: Skill) => {
    setActiveSkill(skill);
    setIsLoading(false);

    const cached = skillConversations[skill.id];
    if (cached && cached.messages.length > 0) {
      setMessages(cached.messages);
      setConversationId(cached.conversationId);
      setIsCompleted(cached.isCompleted);
      return;
    }

    // 本地生成欢迎语，不再调用写死的后端规则
    const welcomeMessage = generateWelcomeMessage(skill);
    setMessages([welcomeMessage]);
    setConversationId(null);
    setIsCompleted(false);

    setSkillConversations(prev => ({
      ...prev,
      [skill.id]: {
        messages: [welcomeMessage],
        conversationId: null,
        isCompleted: false,
      },
    }));
  }, [skillConversations]);

  useEffect(() => {
    loadConversation(SKILLS[0]);
  }, []);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: crypto.randomUUID(),
      content,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    const currentMessages = [...messages, userMessage];
    setMessages(currentMessages);
    setIsLoading(true);

    try {
      const response = await fetch(activeSkill.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillKey: activeSkill.skillKey,
          userMessage: content,
          history: currentMessages.slice(0, -1), // 排除刚发送的这条
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "AI 对话请求失败");
      }

      if (data.messages) {
        const updatedMessages = [...currentMessages, data.messages[data.messages.length - 1]];
        setMessages(updatedMessages);
        setConversationId(data.conversationId);
        setIsCompleted(data.isCompleted || false);

        setSkillConversations(prev => ({
          ...prev,
          [activeSkill.id]: {
            messages: updatedMessages,
            conversationId: data.conversationId,
            isCompleted: data.isCompleted || false,
          },
        }));
      }
    } catch (error: any) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: `抱歉，AI 对话失败：${error?.message || "请稍后再试"}`,
        sender: "ai",
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkillChange = (skill: Skill) => {
    if (skill.id !== activeSkill.id) {
      loadConversation(skill);
    }
  };

  const handleNewConversation = () => {
    setMessages([]);
    setConversationId(null);
    setIsCompleted(false);

    setSkillConversations(prev => ({
      ...prev,
      [activeSkill.id]: {
        messages: [],
        conversationId: null,
        isCompleted: false,
      },
    }));

    const welcomeMessage = generateWelcomeMessage(activeSkill);
    setMessages([welcomeMessage]);
  };

  // AI 一键生成综合企划
  // 切换季次时，自动同步企划表单中的季节字段
  useEffect(() => {
    if (currentSeason?.name) {
      setPlanForm(prev => ({ ...prev, season: currentSeason.name }));
    }
  }, [currentSeason?.id]);

  const handleGeneratePlan = async () => {
    if (!planForm.theme.trim()) {
      setPlanError("请输入企划主题");
      return;
    }
    setPlanGenerating(true);
    setPlanError("");
    setComprehensivePlan(null);
    try {
      const data = await api.post("/api/planning/ai/generate-plan", {
        season: planForm.season || undefined,
        theme: planForm.theme,
        category: planForm.category,
        targetCost: planForm.targetCost ? Number(planForm.targetCost) : undefined,
        seasonId: currentSeason?.id,
      });
      setComprehensivePlan(data);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "生成失败";
      setPlanError(msg);
    } finally {
      setPlanGenerating(false);
    }
  };

  const PLANNING_SKILLS = SKILLS;

  return (
    <SidebarLayout>
      <div className="h-[calc(100vh-72px)] flex p-4 gap-4">
        <div className="flex-1 min-h-0 flex flex-col gap-4">
          <div className="flex-1 min-h-0">
            <Card className="h-full flex flex-col overflow-hidden bg-gradient-to-br bg-white">
            <div className={`border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-gradient-to-r ${activeSkill.bgGradient}`}>
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center bg-white shadow-md`}>
                  {(() => {
                    const Icon = activeSkill.icon;
                    return <Icon className={`h-6 w-6 ${activeSkill.color}`} />;
                  })()}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-slate-800">{activeSkill.name}</h3>
                  <p className="text-sm text-slate-500">{activeSkill.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {currentSeason && (
                  <Badge variant="secondary" className="bg-white/80 text-slate-700 border-slate-200 gap-1">
                    <Calendar className="h-3 w-3" />
                    {currentBrand?.name} · {currentSeason.name}
                  </Badge>
                )}
                {isCompleted && (
                  <Badge className="bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    已完成
                  </Badge>
                )}
                <Button
                  size="sm"
                  onClick={() => setPlanOpen(true)}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                >
                  <Wand2 className="h-4 w-4 mr-1.5" />
                  AI 一键生成企划
                </Button>
                {messages.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNewConversation}
                    className="hover:bg-white/50"
                  >
                    新建对话
                  </Button>
                )}
              </div>
            </div>
            
            <div className="flex-1 overflow-hidden">
              {isLoading && messages.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <Loader2 className="h-8 w-8 text-amber-500 animate-spin mx-auto mb-4" />
                    <p className="text-slate-500">加载中...</p>
                  </div>
                </div>
              ) : (
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  title={activeSkill.name}
                  subtitle={activeSkill.description}
                  placeholder="输入您的问题或需求..."
                />
              )}
            </div>
          </Card>
        </div>

        <div className="h-32 flex-shrink-0">
          <Card className="h-full bg-gradient-to-r from-slate-50 to-white">
            <CardContent className="h-full flex items-center justify-center gap-6">
              <div className="flex items-center gap-6">
                {PLANNING_SKILLS.map((skill) => {
                  const Icon = skill.icon;
                  const isActive = activeSkill.id === skill.id;
                  const hasUnread = skillConversations[skill.id]?.messages.length > 0 && !skillConversations[skill.id]?.isCompleted;
                  const isFinished = skillConversations[skill.id]?.isCompleted;

                  return (
                    <button
                      key={skill.id}
                      onClick={() => handleSkillChange(skill)}
                      className={`group relative flex flex-col items-center justify-center transition-all duration-300 ${
                        isActive ? "scale-110" : "hover:scale-105"
                      }`}
                    >
                      <div
                        className={`relative w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
                          isActive
                            ? "bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-orange-200"
                            : "bg-white shadow-md hover:shadow-lg"
                        }`}
                      >
                        <Icon className={`h-7 w-7 ${isActive ? "text-white" : skill.color}`} />
                        {isFinished && !isActive && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          </div>
                        )}
                        {hasUnread && !isFinished && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center">
                            <span className="text-white text-xs font-medium">!</span>
                          </div>
                        )}
                      </div>
                      <span
                        className={`mt-2 text-sm font-medium transition-colors ${
                          isActive ? "text-orange-600" : "text-slate-600 group-hover:text-slate-800"
                        }`}
                      >
                        {skill.name}
                      </span>
                      {isActive && (
                        <div className="absolute -bottom-1 w-12 h-1 bg-gradient-to-r from-amber-400 to-orange-500 rounded-full" />
                      )}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        </div>

        <div className="w-80 flex-shrink-0 hidden xl:flex">
          <AIAssistantPanel processNode="planning" title="企划 AI 助手" />
        </div>
      </div>

      {/* AI 一键生成综合企划弹窗 */}
      {planOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-purple-50 to-pink-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-md">
                  <Wand2 className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-base">AI 一键生成综合企划</h3>
                  <p className="text-xs text-muted-foreground">并行调用趋势/爆款/色彩/面料/定价 5 大 AI 能力</p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setPlanOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* 内容区 */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* 输入表单（仅在未生成时显示） */}
              {!comprehensivePlan && !planGenerating && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">季节</label>
                      <input
                        type="text"
                        value={planForm.season}
                        onChange={(e) => setPlanForm({ ...planForm, season: e.target.value })}
                        placeholder="如：2026SS"
                        className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">品类</label>
                      <select
                        value={planForm.category}
                        onChange={(e) => setPlanForm({ ...planForm, category: e.target.value })}
                        className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                      >
                        <option value="女装">女装</option>
                        <option value="男装">男装</option>
                        <option value="童装">童装</option>
                        <option value="配饰">配饰</option>
                      </select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">企划主题 *</label>
                      <input
                        type="text"
                        value={planForm.theme}
                        onChange={(e) => setPlanForm({ ...planForm, theme: e.target.value })}
                        placeholder="如：都市通勤·极简风"
                        className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-slate-700 mb-1.5 block">目标成本（元）</label>
                      <input
                        type="number"
                        value={planForm.targetCost}
                        onChange={(e) => setPlanForm({ ...planForm, targetCost: e.target.value })}
                        placeholder="如：100"
                        className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                      />
                    </div>
                  </div>
                  {planError && (
                    <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
                      {planError}
                    </div>
                  )}
                  <div className="p-4 rounded-xl bg-purple-50 border border-purple-100">
                    <p className="text-xs text-purple-700">
                      AI 将基于品牌基因、季节趋势、市场爆款数据，并行调用 5 大 AI 能力（趋势预测、爆款识别、色彩推荐、面料分析、定价策略），生成完整的综合企划报告，并自动写入企划主表。
                    </p>
                  </div>
                </div>
              )}

              {/* 生成中 */}
              {planGenerating && (
                <div className="py-16 text-center">
                  <Loader2 className="h-10 w-10 text-purple-600 animate-spin mx-auto mb-4" />
                  <p className="text-sm font-medium text-foreground">AI 正在并行生成综合企划...</p>
                  <p className="text-xs text-muted-foreground mt-1">趋势 · 爆款 · 色彩 · 面料 · 定价</p>
                </div>
              )}

              {/* 综合企划结果 */}
              {comprehensivePlan && !planGenerating && (
                <div className="space-y-4">
                  {/* 顶部概览 */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-purple-50 to-pink-50 border border-purple-200">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-base text-purple-900">
                        {comprehensivePlan.theme || "综合企划"}
                      </h4>
                      <Badge className="bg-purple-100 text-purple-700 border-purple-200">
                        置信度 {comprehensivePlan.overallConfidence || 0}%
                      </Badge>
                    </div>
                    <p className="text-xs text-foreground mb-3">
                      {comprehensivePlan.season} · {comprehensivePlan.category} · 目标成本 ¥{comprehensivePlan.targetCost || 0}
                    </p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="p-2 rounded-lg bg-white/70">
                        <p className="text-xs text-muted-foreground">建议零售价</p>
                        <p className="font-bold text-purple-700">¥{comprehensivePlan.suggestedPrice?.toFixed(2) || "-"}</p>
                      </div>
                      <div className="p-2 rounded-lg bg-white/70">
                        <p className="text-xs text-muted-foreground">价格区间</p>
                        <p className="font-semibold text-foreground">
                          ¥{comprehensivePlan.priceRange?.min?.toFixed(2) || 0} ~ ¥{comprehensivePlan.priceRange?.max?.toFixed(2) || 0}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 执行摘要 */}
                  {comprehensivePlan.executiveSummary && (
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-sm font-medium mb-2 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-purple-600" />
                        执行摘要
                      </p>
                      <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                        {comprehensivePlan.executiveSummary}
                      </p>
                    </div>
                  )}

                  {/* 5 大 AI 子能力结果 */}
                  {comprehensivePlan.aiSkills && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* 趋势预测 */}
                      {comprehensivePlan.aiSkills.trendPrediction?.items?.length > 0 && (
                        <div className="p-3 rounded-xl bg-blue-50/50 border border-blue-100">
                          <div className="flex items-center gap-1.5 mb-2">
                            <TrendingUp className="h-3.5 w-3.5 text-blue-600" />
                            <p className="text-xs font-semibold text-blue-900">趋势预测</p>
                            <Badge variant="secondary" className="text-[10px] ml-auto">
                              {comprehensivePlan.aiSkills.trendPrediction.confidence}%
                            </Badge>
                          </div>
                          <ul className="space-y-1">
                            {comprehensivePlan.aiSkills.trendPrediction.items.slice(0, 3).map((t: any, i: number) => (
                              <li key={i} className="text-xs text-foreground">
                                <span className="font-medium">· {t.trend}</span>
                                <span className="text-muted-foreground ml-1">- {t.description}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 爆款识别 */}
                      {comprehensivePlan.aiSkills.hotProducts?.items?.length > 0 && (
                        <div className="p-3 rounded-xl bg-amber-50/50 border border-amber-100">
                          <div className="flex items-center gap-1.5 mb-2">
                            <ShoppingBag className="h-3.5 w-3.5 text-amber-600" />
                            <p className="text-xs font-semibold text-amber-900">爆款识别</p>
                            <Badge variant="secondary" className="text-[10px] ml-auto">
                              {comprehensivePlan.aiSkills.hotProducts.confidence}%
                            </Badge>
                          </div>
                          <ul className="space-y-1">
                            {comprehensivePlan.aiSkills.hotProducts.items.slice(0, 3).map((p: any, i: number) => (
                              <li key={i} className="text-xs text-foreground">
                                <span className="font-medium">· {p.name}</span>
                                <span className="text-muted-foreground ml-1">¥{p.price} / 月销{p.salesVolume}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 色彩推荐 */}
                      {comprehensivePlan.aiSkills.colorRecommendations?.items?.length > 0 && (
                        <div className="p-3 rounded-xl bg-pink-50/50 border border-pink-100">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Palette className="h-3.5 w-3.5 text-pink-600" />
                            <p className="text-xs font-semibold text-pink-900">色彩推荐</p>
                            <Badge variant="secondary" className="text-[10px] ml-auto">
                              {comprehensivePlan.aiSkills.colorRecommendations.confidence}%
                            </Badge>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            {comprehensivePlan.aiSkills.colorRecommendations.items.slice(0, 5).map((c: any, i: number) => (
                              <div key={i} className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-pink-100">
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.hex }} />
                                <span className="text-[10px] font-medium">{c.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* 面料推荐 */}
                      {comprehensivePlan.aiSkills.fabricRecommendations?.items?.length > 0 && (
                        <div className="p-3 rounded-xl bg-indigo-50/50 border border-indigo-100">
                          <div className="flex items-center gap-1.5 mb-2">
                            <Wind className="h-3.5 w-3.5 text-indigo-600" />
                            <p className="text-xs font-semibold text-indigo-900">面料推荐</p>
                            <Badge variant="secondary" className="text-[10px] ml-auto">
                              {comprehensivePlan.aiSkills.fabricRecommendations.confidence}%
                            </Badge>
                          </div>
                          <ul className="space-y-1">
                            {comprehensivePlan.aiSkills.fabricRecommendations.items.slice(0, 3).map((f: any, i: number) => (
                              <li key={i} className="text-xs text-foreground">
                                <span className="font-medium">· {f.name}</span>
                                <span className="text-muted-foreground ml-1">- {f.price}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* 定价策略 */}
                      {comprehensivePlan.aiSkills.pricingStrategy && (
                        <div className="p-3 rounded-xl bg-emerald-50/50 border border-emerald-100 md:col-span-2">
                          <div className="flex items-center gap-1.5 mb-2">
                            <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                            <p className="text-xs font-semibold text-emerald-900">定价策略</p>
                            <Badge variant="secondary" className="text-[10px] ml-auto">
                              {comprehensivePlan.aiSkills.pricingStrategy.confidence}%
                            </Badge>
                          </div>
                          <p className="text-xs text-foreground">
                            建议毛利：{comprehensivePlan.aiSkills.pricingStrategy.recommendedMargin}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 品牌对齐 */}
                  {comprehensivePlan.brandAlignment && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <p className="text-xs font-medium mb-1.5 flex items-center gap-1.5">
                        <Shirt className="h-3.5 w-3.5 text-slate-600" />
                        品牌对齐
                      </p>
                      <div className="grid grid-cols-2 gap-2 text-xs text-foreground">
                        <div>品牌：{comprehensivePlan.brandAlignment.brandName || "-"}</div>
                        <div>目标人群：{comprehensivePlan.brandAlignment.targetAudience || "-"}</div>
                        <div>风格方向：{comprehensivePlan.brandAlignment.styleDirection || "-"}</div>
                        <div>价格定位：{comprehensivePlan.brandAlignment.pricePosition || "-"}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 底部操作 */}
            <div className="px-6 py-3 border-t bg-slate-50 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">
                {comprehensivePlan?.planId ? `已写入企划主表 · ID ${comprehensivePlan.planId.slice(0, 8)}...` : "生成后将自动写入企划主表"}
              </p>
              <div className="flex gap-2">
                {!comprehensivePlan ? (
                  <>
                    <Button variant="outline" onClick={() => setPlanOpen(false)}>
                      取消
                    </Button>
                    <Button
                      onClick={handleGeneratePlan}
                      disabled={planGenerating}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                    >
                      {planGenerating ? "生成中..." : "开始生成"}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="outline" onClick={() => { setComprehensivePlan(null); setPlanError(""); }}>
                      重新生成
                    </Button>
                    <Button onClick={() => setPlanOpen(false)} className="bg-navy-700 hover:bg-navy-800">
                      完成
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </SidebarLayout>
  );
}