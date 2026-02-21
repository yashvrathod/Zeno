import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

type Message = {
  role: "user" | "assistant";
  content: string;
  timestamp?: Date;
};

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

    // Get AI provider settings from user preferences
    const aiProvider = process.env.AI_PROVIDER || "openai";
    const apiKey = process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "AI provider not configured" },
        { status: 500 }
      );
    }

    // Build conversation history
    const conversationHistory = history.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    conversationHistory.push({
      role: "user",
      content: message,
    });

    // System prompt for voice chat
    const systemPrompt = `You are a friendly and helpful AI assistant for voice conversations. 
Keep your responses concise and conversational, perfect for voice interaction.
- Use natural, spoken language
- Keep responses brief (2-3 sentences max unless asked for details)
- Be encouraging and supportive
- If discussing code, explain concepts clearly without overwhelming detail
- Ask clarifying questions when needed

The user is talking to you via voice, so respond in a way that sounds natural when spoken aloud.`;

    let aiResponse: string;

    if (aiProvider === "openrouter") {
      // OpenRouter API
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "Voice Chat Assistant",
        },
        body: JSON.stringify({
          model: process.env.OPENROUTER_MODEL || "deepseek/deepseek-r1-0528:free",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenRouter API error:", errorText);
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      aiResponse = data.choices?.[0]?.message?.content || "I'm sorry, I didn't catch that.";
    } else {
      // OpenAI API
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_MODEL || "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...conversationHistory,
          ],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("OpenAI API error:", errorText);
        throw new Error("Failed to get AI response");
      }

      const data = await response.json();
      aiResponse = data.choices?.[0]?.message?.content || "I'm sorry, I didn't catch that.";
    }

    return NextResponse.json({
      ok: true,
      message: aiResponse,
    });
  } catch (error) {
    console.error("Voice chat error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal server error",
      },
      { status: 500 }
    );
  }
}
