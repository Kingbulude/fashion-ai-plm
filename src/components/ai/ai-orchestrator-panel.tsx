// AI Orchestrator 执行面板
// 左侧 Skill 列表选中后，右侧展示聊天式对话界面；每个 Skill 独立维护对话历史

"use client";

import { useState, useRef, useEffect } from "react";
import { AISkill } from "@/lib/auth/tenant-context";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Loader2, Send, Trash2, User } from "lucide-react";
import { StyleDerivativeCards } from "./style-derivative-cards";
import { StyleDerivativeDesign } from "@/lib/skills/handlers/style-derivative";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  recommendationId?: string;
  designs?: StyleDerivativeDesign[];
}

interface AIOrchestratorPanelProps {
  skill: AISkill | null;
  seasonId?: string | null;
}

export function AIOrchestratorPanel({ skill, seasonId }: AIOrchestratorPanelProps) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 按 skill.key 隔离对话历史
  const [conversations, setConversations] = useState<Record<string, ChatMessage[]>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentKey = skill?.key || "__no_skill__";
  const messages = conversations[currentKey] || [];

  // 切换 Skill 时清空输入和错误，保留该 Skill 的历史
  useEffect(() => {
    setInput("");
    setError(null);
  }, [currentKey]);

  // 消息滚动到底部
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const buildWelcomeMessage = (s: AISkill): ChatMessage => ({
    id: `welcome-${s.key}`,
    role: "assistant",
    content: `你好！我是「${s.name}」。${s.description || ""}\n\n请输入你的问题或需求。`,
    createdAt: new Date().toISOString(),
  });

  const send = async () => {
    if (!input.trim() || loading) return;
    if (!skill) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: input.trim(),
      createdAt: new Date().toISOString(),
    };

    const nextMessages = [...messages, userMessage];
    setConversations((prev) => ({ ...prev, [currentKey]: nextMessages }));
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const history = nextMessages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch("/api/ai/orchestrate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage.content,
          skillKey: skill.key,
          seasonId,
          history,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || data.detail || "执行失败");

      const designs: StyleDerivativeDesign[] | undefined =
        data.output?.data?.designs || data.structured?.data?.designs;
      const recommendationId: string | undefined = data.recommendationId;

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: "assistant",
        content: data.output?.summary || data.reply || "（AI 未返回内容）",
        createdAt: new Date().toISOString(),
        recommendationId,
        designs,
      };

      setConversations((prev) => ({
        ...prev,
        [currentKey]: [...nextMessages, assistantMessage],
      }));
    } catch (err: any) {
      setError(err.message || "执行失败");
    } finally {
      setLoading(false);
    }
  };

  const clearConversation = () => {
    if (!skill) return;
    setConversations((prev) => ({
      ...prev,
      [currentKey]: [buildWelcomeMessage(skill)],
    }));
    setError(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  if (!skill) {
    return (
      <div className="flex flex-col h-full items-center justify-center text-muted-foreground p-6">
        <Bot className="h-12 w-12 mb-4 text-muted" />
        <p className="text-sm">请从左侧选择一个 AI Skill 开始对话</p>
      </div>
    );
  }

  const displayMessages = messages.length > 0 ? messages : [buildWelcomeMessage(skill)];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* 头部 */}
      <div className="px-6 py-4 border-b flex items-center justify-between bg-sand-50/50">
        <div>
          <h3 className="font-medium text-base">{skill.name}</h3>
          <p className="text-xs text-muted-foreground">{skill.description || "AI 智能体对话"}</p>
        </div>
        <Button variant="ghost" size="sm" onClick={clearConversation} className="text-muted-foreground">
          <Trash2 className="h-4 w-4 mr-1" />
          清空对话
        </Button>
      </div>

      {/* 消息区 */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-sand-50/30">
        {displayMessages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === "user"
                  ? "bg-navy-700 text-white"
                  : "bg-white border border-border text-navy-700"
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
              {msg.role === "assistant" && msg.recommendationId && msg.designs && msg.designs.length > 0 && (
                <StyleDerivativeCards
                  recommendationId={msg.recommendationId}
                  designs={msg.designs}
                />
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-white border border-border flex items-center justify-center flex-shrink-0 text-navy-700">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-white border border-border rounded-2xl rounded-tl-none px-4 py-2.5 shadow-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-navy-600" />
              <span className="text-sm text-muted-foreground">AI 思考中...</span>
            </div>
          </div>
        )}

        {error && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 text-red-600">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-red-50 border border-red-100 rounded-2xl rounded-tl-none px-4 py-2.5 text-sm text-red-700 max-w-[80%]">
              {error}
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* 输入区 */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-start gap-3">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={`向 ${skill.name} 输入需求...`}
            className="flex-1 min-h-[80px] resize-none"
            disabled={loading}
          />
          <Button
            className="h-10 w-10 bg-navy-700 hover:bg-navy-800 text-white"
            onClick={send}
            disabled={loading || !input.trim()}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">按 Enter 发送，Shift + Enter 换行</p>
      </div>
    </div>
  );
}
