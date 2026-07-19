"use client";

import { useState, KeyboardEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ChatInputProps {
  onSend: (message: string) => void;
  isLoading: boolean;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({ onSend, isLoading, placeholder = "输入消息...", disabled = false }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed && !isLoading && !disabled) {
      onSend(trimmed);
      setMessage("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-100 bg-white p-4">
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            className="w-full h-14 resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            rows={1}
          />
        </div>
        <Button
          onClick={handleSubmit}
          disabled={!message.trim() || isLoading || disabled}
          className="flex-shrink-0 h-14 px-6 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="mt-2 text-xs text-slate-400">按 Enter 发送，Shift + Enter 换行</p>
    </div>
  );
}