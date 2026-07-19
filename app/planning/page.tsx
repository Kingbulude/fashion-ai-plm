"use client";

import { useState, useEffect, useCallback } from "react";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { ChatPanel } from "@/components/chat/ChatPanel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Brain,
  Search,
  Lightbulb,
  Package,
  Palette,
  Wind,
  Sparkles,
  MessageSquare,
  ChevronRight,
  CheckCircle2,
  Loader2,
} from "lucide-react";

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
  endpoint: string;
}

const SKILLS: Skill[] = [
  {
    id: "brand-dna",
    name: "品牌基因AI对话",
    description: "品牌基因拆解规划，对齐品牌核心定位",
    icon: Brain,
    color: "bg-blue-500",
    endpoint: "/api/planning/ai/brand-dna/chat",
  },
  {
    id: "market-insight",
    name: "市场需求洞察",
    description: "爬虫分析市场趋势、热门商品和消费者需求",
    icon: Search,
    color: "bg-green-500",
    endpoint: "/api/planning/ai/market-insight/chat",
  },
  {
    id: "theme-inspiration",
    name: "企划主题灵感",
    description: "分析大牌企划主题，提供灵感参考",
    icon: Lightbulb,
    color: "bg-amber-500",
    endpoint: "/api/planning/ai/theme-inspiration/chat",
  },
  {
    id: "product-planning",
    name: "商品企划生成",
    description: "基于市场洞察生成完整商品企划方案",
    icon: Package,
    color: "bg-purple-500",
    endpoint: "/api/planning/ai/product-planning/chat",
  },
  {
    id: "design-planning",
    name: "设计企划",
    description: "辅助设计师寻找灵感和搭配方向",
    icon: Palette,
    color: "bg-pink-500",
    endpoint: "/api/planning/ai/design-planning/chat",
  },
  {
    id: "color-planning",
    name: "色彩企划",
    description: "基于流行趋势和品牌基因制定色彩方案",
    icon: Sparkles,
    color: "bg-cyan-500",
    endpoint: "/api/planning/ai/color-planning/chat",
  },
  {
    id: "fabric-planning",
    name: "面料企划",
    description: "搜索面料商信息，找到符合主题的面料",
    icon: Wind,
    color: "bg-indigo-500",
    endpoint: "/api/planning/ai/fabric-planning/chat",
  },
];

export default function PlanningPage() {
  const [activeSkill, setActiveSkill] = useState<Skill>(SKILLS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isCompleted, setIsCompleted] = useState(false);
  const [skillConversations, setSkillConversations] = useState<Record<string, { messages: Message[]; conversationId: string | null; isCompleted: boolean }>>({});

  const loadConversation = useCallback(async (skill: Skill) => {
    setActiveSkill(skill);
    setIsLoading(true);

    const cached = skillConversations[skill.id];
    if (cached && cached.messages.length > 0) {
      setMessages(cached.messages);
      setConversationId(cached.conversationId);
      setIsCompleted(cached.isCompleted);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(skill.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: "开始",
          conversationId: cached?.conversationId || null,
        }),
      });
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        setMessages(data.messages);
        setConversationId(data.conversationId);
        setIsCompleted(data.isCompleted || false);

        setSkillConversations(prev => ({
          ...prev,
          [skill.id]: {
            messages: data.messages,
            conversationId: data.conversationId,
            isCompleted: data.isCompleted || false,
          },
        }));
      } else {
        const welcomeMessage: Message = {
          id: "welcome",
          content: `您好！我是${skill.name}AI助手。${skill.description}\n\n请问有什么可以帮您的？`,
          sender: "ai",
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
        setConversationId(null);
        setIsCompleted(false);
      }
    } catch {
      const welcomeMessage: Message = {
        id: "welcome",
        content: `您好！我是${skill.name}AI助手。${skill.description}\n\n请问有什么可以帮您的？`,
        sender: "ai",
        timestamp: new Date().toISOString(),
      };
      setMessages([welcomeMessage]);
      setConversationId(null);
      setIsCompleted(false);
    } finally {
      setIsLoading(false);
    }
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

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch(activeSkill.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: content,
          conversationId,
        }),
      });

      const data = await response.json();

      if (data.messages) {
        setMessages(data.messages);
        setConversationId(data.conversationId);
        setIsCompleted(data.isCompleted || false);

        setSkillConversations(prev => ({
          ...prev,
          [activeSkill.id]: {
            messages: data.messages,
            conversationId: data.conversationId,
            isCompleted: data.isCompleted || false,
          },
        }));
      }
    } catch (error) {
      const errorMessage: Message = {
        id: crypto.randomUUID(),
        content: "抱歉，对话服务暂时不可用，请稍后再试。",
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

    const welcomeMessage: Message = {
      id: "welcome",
      content: `您好！我是${activeSkill.name}AI助手。${activeSkill.description}`,
      sender: "ai",
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
  };

  return (
    <SidebarLayout>
      <div className="flex h-[calc(100vh-72px)] gap-4 p-4">
        <div className="w-72 flex-shrink-0">
          <Card className="h-full flex flex-col">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-amber-500" />
                AI企划助手
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto space-y-2">
              {SKILLS.map((skill) => {
                const Icon = skill.icon;
                const isActive = activeSkill.id === skill.id;
                const hasUnread = skillConversations[skill.id]?.messages.length > 0 && !skillConversations[skill.id]?.isCompleted;
                const isFinished = skillConversations[skill.id]?.isCompleted;

                return (
                  <Button
                    key={skill.id}
                    variant={isActive ? "default" : "ghost"}
                    className={`w-full h-auto p-3 text-left transition-all ${
                      isActive 
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg" 
                        : "hover:bg-slate-100"
                    }`}
                    onClick={() => handleSkillChange(skill)}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                          isActive ? "bg-white/20" : skill.color
                        }`}
                      >
                        <Icon className={`h-5 w-5 ${isActive ? "text-white" : "text-white"}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`font-medium text-sm ${isActive ? "text-white" : "text-slate-800"} truncate`}>
                            {skill.name}
                          </span>
                          {isFinished && (
                            <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className={`text-xs mt-0.5 ${isActive ? "text-white/80" : "text-slate-500"} line-clamp-2`}>
                          {skill.description}
                        </p>
                        {hasUnread && !isFinished && (
                          <Badge variant="secondary" className={`mt-1 ${isActive ? "bg-white/20 text-white" : ""}`}>
                            进行中
                          </Badge>
                        )}
                      </div>
                      <ChevronRight className={`h-4 w-4 flex-shrink-0 transition-transform ${
                        isActive ? "text-white rotate-90" : "text-slate-400"
                      }`} />
                    </div>
                  </Button>
                );
              })}
            </CardContent>
            
            <div className="border-t border-slate-100 p-4">
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg p-4">
                <h4 className="font-medium text-amber-800 text-sm mb-2">💡 企划流程建议</h4>
                <p className="text-xs text-amber-700">
                  建议按顺序使用：品牌基因 → 市场洞察 → 主题灵感 → 商品企划 → 设计企划 → 色彩企划 → 面料企划
                </p>
              </div>
            </div>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          {isLoading && messages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <Loader2 className="h-8 w-8 text-amber-500 animate-spin mx-auto mb-4" />
                <p className="text-slate-500">加载中...</p>
              </div>
            </div>
          ) : (
            <Card className="h-full flex flex-col overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${activeSkill.color}`}>
                    {(() => {
                      const Icon = activeSkill.icon;
                      return <Icon className="h-5 w-5 text-white" />;
                    })()}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-800">{activeSkill.name}</h3>
                    <p className="text-xs text-slate-500">{activeSkill.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {isCompleted && (
                    <Badge className="bg-green-50 text-green-700 border-green-200">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      已完成
                    </Badge>
                  )}
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleNewConversation}
                    >
                      新建对话
                    </Button>
                  )}
                </div>
              </div>
              
              <div className="flex-1 overflow-hidden">
                <ChatPanel
                  messages={messages}
                  onSendMessage={handleSendMessage}
                  isLoading={isLoading}
                  title={activeSkill.name}
                  subtitle={activeSkill.description}
                  placeholder="输入您的问题或需求..."
                />
              </div>
            </Card>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}