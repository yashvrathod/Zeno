import { NextRequest, NextResponse } from 'next/server';

function requiredEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

type MentorRequest = {
  problemTitle: string;
  problemStatement?: string;
  language: 'javascript' | 'python' | 'java' | 'cpp' | string;
  code: string;
  signal?: {
    kind:
      | 'first_typing'
      | 'milestone_function'
      | 'milestone_loop'
      | 'milestone_recursion'
      | 'after_run'
      | 'after_submit'
      | 'after_fail'
      | 'stuck_pause'
      | 'manual';
    details?: string;
  };
  // Recent mentor/user messages (trimmed on client).
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as MentorRequest;

    const apiKey = requiredEnv('OPENAI_API_KEY');
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    const title = body.problemTitle?.slice(0, 200) || 'Coding problem';
    const statement = (body.problemStatement || '').slice(0, 2000);
    const code = (body.code || '').slice(0, 4000);
    const signal = body.signal?.kind || 'manual';
    const signalDetails = body.signal?.details ? ` (${body.signal.details.slice(0, 200)})` : '';

    const system =
      `You are an AI mentor for coding interviews. Your job is to ask ONE short mentoring question at a time.\n` +
      `Rules:\n` +
      `- Never give the final solution. Never output full code.\n` +
      `- Ask guiding questions about approach, invariants, complexity, edge cases, debugging, or next step.\n` +
      `- Be concise (1-2 sentences).\n` +
      `- If the user seems stuck, ask a question that helps them unblock.\n`;

    const userPrompt =
      `Context:\n` +
      `Problem title: ${title}\n` +
      (statement ? `Problem statement (truncated):\n${statement}\n` : '') +
      `Language: ${body.language}\n` +
      `Signal: ${signal}${signalDetails}\n\n` +
      `User code (truncated):\n${code}\n\n` +
      `Now ask exactly ONE mentoring question.`;

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      { role: 'system', content: system },
    ];

    // Keep last few history items if provided.
    if (Array.isArray(body.history)) {
      for (const m of body.history.slice(-6)) {
        if (!m?.content) continue;
        messages.push({ role: m.role, content: String(m.content).slice(0, 800) });
      }
    }

    messages.push({ role: 'user', content: userPrompt });

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.4,
        max_tokens: 120,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      return NextResponse.json(
        { error: 'Mentor request failed', details: text.slice(0, 1000) },
        { status: 502 }
      );
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ error: 'Empty mentor response' }, { status: 502 });
    }

    return NextResponse.json({ question: content });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
