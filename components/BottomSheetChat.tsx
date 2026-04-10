"use client";

import React, { useRef, useEffect } from "react";
import { ArrowUpRight, X, Sparkles } from "lucide-react";
import { Markdown } from "./Markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
  visualization?: {
    type: string;
    data: unknown;
  };
  architectReview?: {
    score: number;
    grade: string;
    feedback: string;
  };
}

interface BottomSheetChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: Message[];
  input: string;
  onInputChange: (value: string) => void;
  onSend: () => void;
  isLoading: boolean;
  blurBackdrop?: boolean;
}

export function BottomSheetChat({
  isOpen,
  onClose,
  messages,
  input,
  onInputChange,
  onSend,
  isLoading,
  blurBackdrop = true,
}: BottomSheetChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Blur backdrop overlay */}
      {blurBackdrop && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 animate-in fade-in duration-200"
          onClick={onClose}
        />
      )}

      {/* Bottom sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="bg-[#0a0a0c] border-t border-white/10 rounded-t-2xl shadow-2xl max-h-[70vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center">
                <Sparkles size={14} className="text-purple-400" />
              </div>
              <div>
                <h3 className="text-[13px] font-medium text-white">AI Mentor</h3>
                <p className="text-[10px] text-zinc-500">
                  {messages.length} messages
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages scrollable area */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-6 py-4 space-y-4 max-h-[50vh] scrollbar-hide"
          >
            {messages.length === 0 ? (
              <div className="text-center py-8">
                <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-3">
                  <Sparkles size={20} className="text-purple-400" />
                </div>
                <p className="text-zinc-500 text-[13px]">
                  Ask me anything about this problem. I&apos;ll guide you without giving away the answer.
                </p>
              </div>
            ) : (
              messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  } gap-2`}
                >
                  {/* Sender label */}
                  <span
                    className={`text-[9px] font-bold tracking-widest uppercase ${
                      msg.role === "user" ? "text-zinc-600" : "text-purple-400"
                    }`}
                  >
                    {msg.role === "user" ? "YOU" : "AI MENTOR"}
                  </span>

                  {/* Message bubble */}
                  <div
                    className={`max-w-[90%] p-4 rounded-xl text-[14px] leading-relaxed ${
                      msg.role === "user"
                        ? "bg-purple-500/20 border border-purple-500/30 text-white"
                        : "bg-[#111114] border border-white/5 text-zinc-300"
                    }`}
                  >
                    <Markdown md={msg.content} />

                    {/* Visualization if present */}
                    {msg.visualization && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <pre className="text-[11px] font-mono text-zinc-400 whitespace-pre-wrap">
                          {JSON.stringify(msg.visualization.data, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Architect Review if present */}
                    {msg.architectReview && (
                      <div className="mt-3 pt-3 border-t border-white/5">
                        <div className="flex items-center gap-2 mb-2">
                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                              msg.architectReview.grade === "A"
                                ? "bg-green-500/20 text-green-400"
                                : msg.architectReview.grade === "B"
                                ? "bg-blue-500/20 text-blue-400"
                                : "bg-yellow-500/20 text-yellow-400"
                            }`}
                          >
                            Grade: {msg.architectReview.grade}
                          </span>
                          <span className="text-[11px] text-zinc-500">
                            {msg.architectReview.score}/100
                          </span>
                        </div>
                        <div className="text-[11px] text-zinc-500 line-clamp-2">
                          <Markdown md={msg.architectReview.feedback} />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex items-center gap-2 p-3 bg-white/5 rounded-lg border border-white/5 w-fit">
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" />
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-75" />
                <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce delay-150" />
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="p-4 border-t border-white/5 bg-[#050505]">
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                placeholder="Ask a question or get a hint..."
                className="w-full bg-[#111114] border border-white/10 rounded-xl py-3.5 px-4 pr-12 text-white placeholder:text-zinc-600 outline-none focus:border-purple-500/30 transition-all text-[14px]"
                value={input}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    onSend();
                  }
                }}
              />
              <button
                onClick={onSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center hover:bg-purple-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowUpRight size={16} />
              </button>
            </div>
            <p className="text-[9px] text-zinc-600 mt-2 text-center">
              Press Enter to send, Esc to close
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
