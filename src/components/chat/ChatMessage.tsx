"use client";

import { Bot, User } from "lucide-react";

export interface ChatMessageProps {
  content: string;
  sender: "user" | "ai";
  timestamp?: string;
}

export function ChatMessage({ content, sender, timestamp }: ChatMessageProps) {
  return (
    <div className={`flex gap-3 ${sender === "user" ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${
          sender === "user"
            ? "bg-blue-600 text-white"
            : "bg-amber-100 text-amber-600"
        }`}
      >
        {sender === "user" ? (
          <User className="h-5 w-5" />
        ) : (
          <Bot className="h-5 w-5" />
        )}
      </div>
      <div
        className={`max-w-[70%] ${
          sender === "user"
            ? "bg-blue-600 text-white rounded-2xl rounded-tr-md"
            : "bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-md shadow-sm"
        }`}
      >
        <div className="p-4">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
        </div>
        {timestamp && (
          <div
            className={`px-4 pb-2 text-xs ${
              sender === "user" ? "text-blue-200" : "text-slate-400"
            }`}
          >
            {timestamp}
          </div>
        )}
      </div>
    </div>
  );
}