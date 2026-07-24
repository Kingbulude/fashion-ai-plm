"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTenant, AISkill } from "@/lib/auth/tenant-context";
import { SidebarLayout } from "@/components/layout/sidebar-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
  Send,
  Loader2,
  Bot,
  User,
} from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const openChat = (skill: AISkill) => {
    setActiveSkill(skill);
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: `你好！我是「${skill.name}」AI 助手。${skill.description || ""}\n\n有什么可以帮你的？`,
      },
    ]);
    setInput("");
    setChatError(null);
    setChatOpen(true);
  };

  const closeChat = () => {
    setChatOpen(false);
    setActiveSkill(null);
  };

  const sendMessage = async () => {
    if (!activeSkill || !input.trim() || chatLoading) return;

    const userMessage = input.trim();
    setInput("");
    setChatError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
    };
    setMessages((prev) => [...prev, userMsg]);
    setChatLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillKey: activeSkill.key,
          skillName: activeSkill.name,
          description: activeSkill.description,
          processNode: activeSkill.process_node,
          userMessage,
          history: messages.filter((m) => m.id !== "welcome"),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "AI 对话请求失败");
      }

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "assistant",
        content: data.reply || "（AI 未返回内容）",
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error("AI chat error:", err);
      setChatError(err?.message || "发送失败，请重试");
    } finally {
      setChatLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
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

        <ChatDialog
          open={chatOpen}
          onClose={closeChat}
          skill={activeSkill}
          messages={messages}
          input={input}
          setInput={setInput}
          onSend={sendMessage}
          loading={chatLoading}
          error={chatError}
          messagesEndRef={messagesEndRef}
          onKeyDown={handleKeyDown}
        />
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

function ChatDialog({
  open,
  onClose,
  skill,
  messages,
  input,
  setInput,
  onSend,
  loading,
  error,
  messagesEndRef,
  onKeyDown,
}: {
  open: boolean;
  onClose: () => void;
  skill: AISkill | null;
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  loading: boolean;
  error: string | null;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
}) {
  if (!skill) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-2xl h-[80vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-navy-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-navy-100 flex items-center justify-center">
              <Bot className="h-5 w-5 text-navy-700" />
            </div>
            <div>
              <DialogTitle className="text-base">{skill.name}</DialogTitle>
              <DialogDescription className="text-xs line-clamp-1">
                {skill.description || "AI 智能体对话"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-sand-50/30">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.role === "user" ? "bg-terracotta-100 text-terracotta-600" : "bg-navy-100 text-navy-700"
                }`}
              >
                {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                  msg.role === "user"
                    ? "bg-navy-700 text-white rounded-tr-none"
                    : "bg-white border border-border rounded-tl-none shadow-sm"
                }`}
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0">
                <Bot className="h-4 w-4 text-navy-700" />
              </div>
              <div className="bg-white border border-border rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-navy-600" />
                <span className="text-sm text-muted-foreground">AI 思考中...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {error && (
          <div className="px-6 py-2 bg-red-50 text-red-700 text-xs border-y border-red-100">
            {error}
          </div>
        )}

        <div className="p-4 border-t bg-white">
          <div className="flex items-center gap-3">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="输入问题，按 Enter 发送..."
              className="flex-1 h-11"
              disabled={loading}
            />
            <Button
              size="icon"
              className="h-11 w-11 bg-navy-700 hover:bg-navy-800 text-white"
              onClick={onSend}
              disabled={loading || !input.trim()}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
