import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { callLlm } from "@/lib/clients/llmClient";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
};

const SYSTEM_PROMPT = `You are a friendly and helpful AI assistant for voice conversations.
Keep your responses concise and conversational, perfect for voice interaction.
- Use natural, spoken language
- Keep responses brief (2-3 sentences max unless asked for details)
- Be encouraging and supportive
- If discussing code, explain concepts clearly without overwhelming detail
- Ask clarifying questions when needed

The user is talking to you via voice, so respond in a way that sounds natural when spoken aloud.`;

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { message, history = [] } = body as {
      message: string;
      history: Message[];
    };

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // Resolve provider and config
    const aiProvider = process.env.AI_PROVIDER || "openai";
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json({ error: "AI provider not configured" }, { status: 500 });
    }

    const provider = aiProvider === "openrouter" ? "openrouter" : "openai";
    const apiBaseUrl = provider === "openrouter"
      ? "https://openrouter.ai/api/v1"
      : "https://api.openai.com/v1";
    const model = provider === "openrouter"
      ? process.env.OPENROUTER_MODEL || "deepseek/deepseek-r1-0528:free"
      : process.env.OPENAI_MODEL || "gpt-4o-mini";

    const conversationHistory = history.slice(-10).map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content,
    }));

    const { content } = await callLlm({
      apiBaseUrl,
      apiKey,
      provider,
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...conversationHistory,
      ],
      temperature: 0.7,
      maxTokens: 300,
    });

    return NextResponse.json({
      ok: true,
      message: content || "I'm sorry, I didn't catch that.",
    });
  } catch (error) {
    console.error("Voice chat error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Internal server error" },
      { status: 500 },
    );
  }
}
