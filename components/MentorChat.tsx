'use client';

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sparkles, Send, Bot, User, Trash2, Command, Lightbulb, Zap, BookOpen, Code2, CheckCircle2 } from "lucide-react";
import { Markdown } from "@/components/Markdown";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

type SyntaxCheckErrorResponse = { ok: false; error: string };
function isSyntaxCheckErrorResponse(value: unknown): value is SyntaxCheckErrorResponse {
  return isRecord(value) && value.ok === false && typeof value.error === "string";
}

type MentorOkResponse = { ok: true; message: string };
function isMentorOkResponse(value: unknown): value is MentorOkResponse {
  return isRecord(value) && value.ok === true && typeof value.message === "string";
}

type Message = {
  role: "user" | "assistant";
  content: string;
};

type Props = {
  problemId: string;
  problemTitle?: string;
  problemStatementMd?: string;
  problemConstraintsMd?: string;
  publicTestCases: Array<{ order: number; input: string; expected: string }>;
  language: string;
  userCode?: string;
};

const stages = [
  { id: "understanding", label: "Understand", icon: BookOpen },
  { id: "approach", label: "Plan", icon: Lightbulb },
  { id: "coding", label: "Code", icon: Code2 },
  { id: "optimizing", label: "Optimize", icon: Zap },
];

export default function MentorChat({
  problemId,
  problemTitle,
  problemStatementMd,
  problemConstraintsMd,
  publicTestCases,
  language,
  userCode,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeStage, setActiveStage] = useState("understanding");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const nextHistory = [...messages, userMessage];

    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    let syntaxError: string | undefined;
    try {
      const sres = await fetch("/api/syntax-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language, code: userCode ?? "" }),
      });
      const raw = await sres.text();
      const data = raw ? (JSON.parse(raw) as unknown) : null;
      if (isSyntaxCheckErrorResponse(data)) {
        syntaxError = data.error;
      }
    } catch {
      // ignore syntax-check failures
    }

    try {
      const response = await fetch("/api/mentor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          problemId,
          problemTitle: problemTitle ?? "",
          problemStatementMd: problemStatementMd ?? "",
          problemConstraintsMd: problemConstraintsMd ?? "",
          publicTestCases,
          language,
          userMessage: text,
          userCode,
          syntaxError,
          history: nextHistory,
        }),
      });

      const payload = (await response.json()) as unknown;
      if (isMentorOkResponse(payload)) {
        const assistantMessage: Message = {
          role: "assistant",
          content: payload.message,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        const errorMessage =
          payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof (payload as { error?: unknown }).error === "string"
          ? (payload as { error: string }).error
          : "Failed to get response";
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error("MentorChat error:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, I encountered an error. Please try again in a moment.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("Clear conversation history?")) {
      setMessages([]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-background">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="text-primary-foreground" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                AI Mentor
              </h3>
              <p className="text-sm text-muted-foreground">
                {problemTitle || "Interactive Problem Solving"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clearChat}
            className="text-muted-foreground hover:text-foreground"
          >
            <Trash2 size={16} className="mr-2" />
            Clear
          </Button>
        </div>

        {/* Stage Navigation */}
        <div className="flex gap-2">
          {stages.map((stage) => {
            const Icon = stage.icon;
            const isActive = activeStage === stage.id;
            return (
              <button
                key={stage.id}
                onClick={() => setActiveStage(stage.id)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon size={16} />
                {stage.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-8 space-y-6 bg-secondary/30"
      >
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6 max-w-xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center">
              <Sparkles className="text-primary-foreground" size={32} />
            </div>
            <div className="space-y-2">
              <h4 className="text-xl font-semibold text-foreground">
                How can I help you today?
              </h4>
              <p className="text-muted-foreground leading-relaxed">
                I&apos;m your AI mentor. I&apos;ll guide you through problems with hints,
                explanations, and feedback - never just giving you the answer.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full">
              {[
                "Can you help me understand what this problem is asking?",
                "I'm stuck on my approach. Any guidance?",
                "What's the time complexity of my solution?",
                "What edge cases should I consider?",
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setInput(suggestion)}
                  className="p-4 text-sm text-left rounded-xl bg-card border border-border hover:border-primary/50 transition-all text-muted-foreground hover:text-foreground"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-4 ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              {msg.role === "assistant" && (
                <Avatar className="w-9 h-9 rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                    <Bot className="text-primary-foreground" size={18} />
                  </div>
                </Avatar>
              )}

              <div
                className={`max-w-[80%] rounded-2xl p-5 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-tr-md"
                    : "bg-card border border-border rounded-tl-md"
                }`}
              >
                <div className="text-base leading-relaxed">
                  <Markdown content={msg.content} />
                </div>
              </div>

              {msg.role === "user" && (
                <Avatar className="w-9 h-9 rounded-xl">
                  <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center">
                    <User className="text-muted-foreground" size={18} />
                  </div>
                </Avatar>
              )}
            </div>
          ))
        )}

        {loading && (
          <div className="flex gap-4 justify-start">
            <Avatar className="w-9 h-9 rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
                <Bot className="text-primary-foreground" size={18} />
              </div>
            </Avatar>
            <div className="bg-card border border-border rounded-2xl rounded-tl-md p-5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "-0.3s" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "-0.15s" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-6 bg-background border-t border-border">
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Describe your thinking or ask for a hint..."
            className="w-full bg-secondary border border-border rounded-xl py-4 pl-5 pr-24 text-[15px] text-foreground placeholder:text-muted-foreground/60 focus:ring-2 focus:ring-primary/10 focus:border-primary transition-all resize-none min-h-[72px]"
            rows={2}
            disabled={loading}
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-background border border-border text-[10px] font-medium text-muted-foreground/60">
              <Command size={10} />
              <span>Enter</span>
            </div>
            <Button
              onClick={() => void sendMessage()}
              disabled={loading || !input.trim()}
              size="icon"
              className="h-10 w-10 rounded-lg bg-primary hover:bg-primary/90 disabled:opacity-50"
            >
              <Send size={18} />
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-3 text-center">
          Press Enter to send, Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
