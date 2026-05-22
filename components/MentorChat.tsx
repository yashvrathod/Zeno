"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";

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
  messageId?: string;
  responseType?: string;
  timestamp?: number;
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
  const [feedbackGiven, setFeedbackGiven] = useState<Set<string>>(new Set());

  const submitFeedback = useCallback(async (messageId: string, helpful: boolean) => {
    if (!messageId || feedbackGiven.has(messageId)) return;

    setFeedbackGiven(prev => new Set(prev).add(messageId));

    const feedbackPayload = {
      sessionId: `chat-${problemId}`,
      userId: "",
      problemId,
      messageId,
      mentorResponse: "",
      studentReaction: helpful ? "solved" : "stuck" as const,
      helpfulScore: helpful ? 5 as const : 2 as const,
      executionTraceAvailable: false,
      timestamp: Date.now(),
    };

    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(feedbackPayload),
      });
    } catch (err) {
      console.error("Feedback submission failed:", err);
    }
  }, [problemId, feedbackGiven]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMessage: Message = { role: "user", content: text };
    const nextHistory = [...messages, userMessage];

    // Update UI immediately
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    // Best-effort: compile/syntax check the user's current code so the mentor can correct beginners in realtime.
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
          messageId: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          timestamp: Date.now(),
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
          messageId: `msg-${Date.now()}-error`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p className="text-lg font-medium">Hi! I&apos;m your coding mentor.</p>
            <p className="mt-2">
              Ask me anything about this problem. I&apos;m here to guide you, not give
              away the answer.
            </p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            <Card
              key={idx}
              className={`p-4 ${
                msg.role === "user"
                  ? "bg-blue-50 ml-auto max-w-[80%]"
                  : "bg-gray-50 mr-auto max-w-[80%]"
              }`}
            >
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.role === "assistant" && msg.messageId && !feedbackGiven.has(msg.messageId) && (
                <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                  <span className="text-xs text-gray-400">Was this helpful?</span>
                  <button
                    onClick={() => submitFeedback(msg.messageId!, true)}
                    className="p-1 hover:bg-green-100 rounded transition-colors"
                    aria-label="Yes, helpful"
                  >
                    <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                    </svg>
                  </button>
                  <button
                    onClick={() => submitFeedback(msg.messageId!, false)}
                    className="p-1 hover:bg-red-100 rounded transition-colors"
                    aria-label="No, not helpful"
                  >
                    <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 01.485.06l3.76.94m-7 10v5a2 2 0 002 2h.096c.5 0 .905-.405.905-.904 0-.715.211-1.413.608-2.008L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" />
                    </svg>
                  </button>
                </div>
              )}
              {msg.role === "assistant" && msg.messageId && feedbackGiven.has(msg.messageId) && (
                <div className="mt-2 pt-2 border-t text-xs text-green-600">
                  Thanks for your feedback!
                </div>
              )}
            </Card>
          ))
        )}
        {loading && (
          <Card className="p-4 bg-gray-50 mr-auto max-w-[80%]">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100" />
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200" />
            </div>
          </Card>
        )}
      </div>

      <div className="border-t p-4 shrink-0">
        <div className="flex space-x-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void sendMessage();
              }
            }}
            placeholder="Ask me anything about this problem..."
            className="flex-1 resize-none"
            rows={3}
            disabled={loading}
          />
          <Button onClick={() => void sendMessage()} disabled={loading || !input.trim()}>
            Send
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Tip: Use &quot;briefly&quot; for short answers or &quot;in detail&quot; for thorough explanations
        </p>
      </div>
    </div>
  );
}
