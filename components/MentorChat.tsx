"use client";

import { useState } from "react";
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
