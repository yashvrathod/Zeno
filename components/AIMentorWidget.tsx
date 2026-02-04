'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Brain, X, Sparkles, Send } from 'lucide-react';

type MentorSignalKind =
  | 'first_typing'
  | 'milestone_function'
  | 'milestone_loop'
  | 'milestone_recursion'
  | 'after_run'
  | 'after_submit'
  | 'after_fail'
  | 'stuck_pause'
  | 'manual';

type MentorSignal = { kind: MentorSignalKind; details?: string };

type Props = {
  problemTitle: string;
  problemStatement?: string;
  language: string;
  code: string;
  // Optional external events (increment these counters when actions happen)
  runCount?: number;
  submitCount?: number;
  lastResult?: 'pass' | 'fail' | null;
};

type ChatMsg = { role: 'user' | 'assistant'; content: string };

function detectSignal(prevCode: string, nextCode: string): MentorSignal | null {
  const p = prevCode;
  const n = nextCode;
  const pTrim = p.trim();
  const nTrim = n.trim();

  if (!pTrim && nTrim) return { kind: 'first_typing' };

  // milestone: function signature
  const pHasFn = /\bfunction\b|\bdef\b|\bclass\s+Solution\b|\bpublic\s+.*\bclass\b|\bint\s+\w+\s*\(/.test(p);
  const nHasFn = /\bfunction\b|\bdef\b|\bclass\s+Solution\b|\bpublic\s+.*\bclass\b|\bint\s+\w+\s*\(/.test(n);
  if (!pHasFn && nHasFn) return { kind: 'milestone_function', details: 'You started structuring your solution.' };

  // milestone: loops
  const pHasLoop = /\bfor\b|\bwhile\b|\bforeach\b/.test(p);
  const nHasLoop = /\bfor\b|\bwhile\b|\bforeach\b/.test(n);
  if (!pHasLoop && nHasLoop) return { kind: 'milestone_loop', details: 'I see a loop—let’s sanity-check complexity and invariants.' };

  // milestone: recursion hint
  const pHasRec = /\bdfs\b|\bbfs\b|\brecurs|\bbacktrack|\bhelper\s*\(/i.test(p);
  const nHasRec = /\bdfs\b|\bbfs\b|\brecurs|\bbacktrack|\bhelper\s*\(/i.test(n);
  if (!pHasRec && nHasRec) return { kind: 'milestone_recursion', details: 'Looks like you may be using recursion/search.' };

  return null;
}

export default function AIMentorWidget(props: Props) {
  const {
    problemTitle,
    problemStatement,
    language,
    code,
    runCount = 0,
    submitCount = 0,
    lastResult = null,
  } = props;

  const [open, setOpen] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'assistant',
      content:
        "I'm your AI mentor. As you code, I'll ask short questions to help you clarify your approach (no spoilers).",
    },
  ]);
  const [draft, setDraft] = useState('');

  const prevCodeRef = useRef(code);
  const lastSpokeAtRef = useRef<number>(0);
  const lastTypedAtRef = useRef<number>(Date.now());
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const canSpeak = useMemo(() => {
    const now = Date.now();
    const cooldownMs = 60_000; // 1 min
    return now - lastSpokeAtRef.current > cooldownMs;
  }, [messages.length]);

  const callMentor = async (signal: MentorSignal) => {
    if (!enabled || !open) return;
    if (loading) return;

    const now = Date.now();
    const minIntervalMs = 45_000;
    if (now - lastSpokeAtRef.current < minIntervalMs && signal.kind !== 'manual') return;

    // Avoid calling when code is basically empty.
    if (code.trim().length < 8 && signal.kind !== 'manual') return;

    setLoading(true);
    try {
      const history = messages.slice(-6).map((m) => ({ role: m.role, content: m.content }));
      const res = await fetch('/api/mentor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          problemTitle,
          problemStatement,
          language,
          code,
          signal,
          history,
        }),
      });
      const data = (await res.json()) as { question?: string; error?: string };
      if (!res.ok || !data.question) throw new Error(data.error || 'Mentor failed');

      lastSpokeAtRef.current = Date.now();
      setMessages((prev) => [...prev, { role: 'assistant', content: data.question! }]);
    } catch (e) {
      // Fail silently but keep a small hint.
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            'Mentor is unavailable right now. (Check OPENAI_API_KEY / OPENAI_MODEL env vars.)',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Debounced typing-driven mentoring
  useEffect(() => {
    if (!enabled) return;

    lastTypedAtRef.current = Date.now();

    const prev = prevCodeRef.current;
    prevCodeRef.current = code;

    const signal = detectSignal(prev, code);

    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    pendingTimerRef.current = setTimeout(() => {
      // If user paused typing a bit, consider speaking.
      const pausedMs = Date.now() - lastTypedAtRef.current;
      if (pausedMs < 2500) return;

      if (signal) {
        void callMentor(signal);
      } else if (canSpeak && code.trim().length > 50) {
        void callMentor({ kind: 'stuck_pause' });
      }
    }, 3500);

    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // Event-driven mentoring (run/submit/fail)
  const prevRunRef = useRef(runCount);
  useEffect(() => {
    if (runCount > prevRunRef.current) {
      prevRunRef.current = runCount;
      void callMentor({ kind: 'after_run' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runCount]);

  const prevSubmitRef = useRef(submitCount);
  useEffect(() => {
    if (submitCount > prevSubmitRef.current) {
      prevSubmitRef.current = submitCount;
      void callMentor({ kind: 'after_submit' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [submitCount]);

  const prevResultRef = useRef(lastResult);
  useEffect(() => {
    if (lastResult && lastResult !== prevResultRef.current) {
      prevResultRef.current = lastResult;
      if (lastResult === 'fail') void callMentor({ kind: 'after_fail' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastResult]);

  const sendUserMessage = async () => {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    await callMentor({ kind: 'manual', details: text });
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-white/10 bg-black/70 backdrop-blur px-4 py-2 text-sm text-gray-200 hover:bg-black/80"
      >
        <Brain className="h-4 w-4 text-orange-400" />
        Mentor
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[340px] max-w-[92vw] rounded-xl border border-white/10 bg-black/70 backdrop-blur shadow-2xl">
      <div className="flex items-center justify-between px-3 py-2 border-b border-white/10">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-200">
          <Sparkles className="h-4 w-4 text-orange-400" />
          AI Mentor
        </div>
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="accent-orange-500"
            />
            On
          </label>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="p-1 rounded hover:bg-white/10"
            aria-label="Close mentor"
          >
            <X className="h-4 w-4 text-gray-300" />
          </button>
        </div>
      </div>

      <div className="max-h-[320px] overflow-auto p-3 space-y-2 text-sm">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={
              m.role === 'assistant'
                ? 'rounded-lg bg-white/5 border border-white/10 p-2 text-gray-200'
                : 'rounded-lg bg-orange-500/10 border border-orange-500/20 p-2 text-orange-100'
            }
          >
            {m.content}
          </div>
        ))}
        {loading && (
          <div className="text-xs text-gray-400">Thinking…</div>
        )}
      </div>

      <div className="flex items-center gap-2 p-3 border-t border-white/10">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void sendUserMessage();
          }}
          placeholder="Reply (optional)…"
          className="flex-1 bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-gray-200 placeholder:text-gray-500 outline-none"
        />
        <button
          type="button"
          onClick={() => void sendUserMessage()}
          className="p-2 rounded-md bg-orange-500/90 hover:bg-orange-500 text-white disabled:opacity-60"
          disabled={!draft.trim()}
          aria-label="Send"
        >
          <Send className="h-4 w-4" />
        </button>
      </div>

      <div className="px-3 pb-3 text-[10px] text-gray-500">
        Mentor asks questions only (no full solutions).
      </div>
    </div>
  );
}
