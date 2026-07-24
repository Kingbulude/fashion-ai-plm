// 通用 AI Skill 对话弹窗
// 可被 AI Workspace、Dashboard 等页面复用

"use client";

import { useState, useRef, useEffect } from "react";
import { AISkill } from "@/lib/auth/tenant-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Bot, User, Send, Loader2 } from "lucide-react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

interface AIChatDialogProps {
  skill: AISkill | null;
  open: boolean;
  onClose: () => void;
}

export function AIChatDialog({ skill, open, onClose }: AIChatDialogProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (skill && open) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: `你好！我是「${skill.name}」AI 助手。${skill.description || ""}\n\n有什么可以帮你的？`,
        },
      ]);
      setInput("");
      setError(null);
    }
  }, [skill, open]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!skill || !input.trim() || loading) return;

    const userMessage = input.trim();
    setInput("");
    setError(null);

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: userMessage,
    };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skillKey: skill.key,
          skillName: skill.name,
          description: skill.description,
          processNode: skill.process_node,
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
      setError(err?.message || "发送失败，请重试");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

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
                  msg.role === "user"
                    ? "bg-terracotta-100 text-terracotta-600"
                    : "bg-navy-100 text-navy-700"
                }`}
              >
                {msg.role === "user" ? (
                  <User className="h-4 w-4" />
                ) : (
                  <Bot className="h-4 w-4" />
                )}
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
              onKeyDown={handleKeyDown}
              placeholder="输入问题，按 Enter 发送..."
              className="flex-1 h-11"
              disabled={loading}
            />
            <Button
              size="icon"
              className="h-11 w-11 bg-navy-700 hover:bg-navy-800 text-white"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
