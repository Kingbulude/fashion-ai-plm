"use client";

import { useEffect, useRef } from "react";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";

export interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

export interface ChatPanelProps {
  messages: Message[];
  onSendMessage: (message: string) => void;
  isLoading: boolean;
  title?: string;
  subtitle?: string;
  placeholder?: string;
}

export function ChatPanel({ messages, onSendMessage, isLoading, title, subtitle, placeholder }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-col h-full bg-slate-50 rounded-2xl shadow-lg overflow-hidden">
      {title && (
        <div className="bg-white border-b border-slate-100 px-6 py-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <span className="text-2xl">💬</span>
            </div>
            <p className="text-sm">开始对话</p>
            <p className="text-xs mt-1">输入您的问题或需求</p>
          </div>
        ) : (
          messages.map((message) => (
            <ChatMessage
              key={message.id}
              content={message.content}
              sender={message.sender}
              timestamp={message.timestamp}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <ChatInput
        onSend={onSendMessage}
        isLoading={isLoading}
        placeholder={placeholder}
      />
    </div>
  );
}