/**
 * Embedding Debug API — In-memory, no DB dependency
 *
 * Endpoints:
 *   POST /api/debug/embedding — embed a text string
 *   POST /api/debug/embedding/store — store a Q&A pair with embedding
 *   POST /api/debug/embedding/search — find similar stored embeddings
 *   GET  /api/debug/embedding — list all stored embeddings
 *   DELETE /api/debug/embedding — clear all embeddings
 */

import { NextRequest, NextResponse } from "next/server";
import { getEmbedding, cosineSimilarity } from "@/lib/embeddings";

// ─────────────────────────────────────────────
// IN-MEMORY DEBUG STORE
// ─────────────────────────────────────────────

type DebugEntry = {
  id: string;
  question: string;
  answer: string;
  stage: string;
  embedding: number[];
  createdAt: string;
  usedCount: number;
};

const debugStore: DebugEntry[] = [];
let nextId = 1;

// ─────────────────────────────────────────────
// EMBEDDING GENERATE
// ─────────────────────────────────────────────
async function handleEmbed(text: string, stage: string) {
  const t0 = performance.now();
  let embedMs = 0;

  try {
    const embedStart = performance.now();
    const embedding = await getEmbedding(text);
    embedMs = performance.now() - embedStart;

    const nonzero = embedding.filter((v) => Math.abs(v) > 0.0001).length;
    const top5 = embedding
      .map((v, i) => ({ idx: i, val: v }))
      .sort((a, b) => Math.abs(b.val) - Math.abs(a.val))
      .slice(0, 5)
      .map(({ idx, val }) => `[${idx}=${val.toFixed(6)}]`)
      .join(", ");

    return NextResponse.json({
      ok: true,
      action: "embed",
      input: text,
      stage,
      dimensions: embedding.length,
      nonzero,
      embedMs: Math.round(embedMs),
      totalMs: Math.round(performance.now() - t0),
      topDimensions: top5,
      vectorPreview: embedding.slice(0, 20).map((v) => v.toFixed(6)),
    });
  } catch (e) {
    return NextResponse.json(
      {
        ok: false,
        error: (e as Error).message,
        embedMs: Math.round(embedMs),
        totalMs: Math.round(performance.now() - t0),
      },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────
async function handleStore(params: {
  question: string;
  answer: string;
  stage: string;
}) {
  const t0 = performance.now();
  try {
    const embedding = await getEmbedding(params.question);

    // Check for duplicate — update if same question
    const existing = debugStore.find(
      (e) => e.question.toLowerCase().trim() === params.question.toLowerCase().trim()
    );

    if (existing) {
      existing.answer = params.answer;
      existing.stage = params.stage;
      existing.embedding = embedding;
      existing.createdAt = new Date().toISOString();
    } else {
      debugStore.push({
        id: `dbg_${nextId++}`,
        question: params.question,
        answer: params.answer,
        stage: params.stage,
        embedding,
        createdAt: new Date().toISOString(),
        usedCount: 0,
      });
    }

    const nonzero = embedding.filter((v) => Math.abs(v) > 0.0001).length;

    return NextResponse.json({
      ok: true,
      action: "store",
      question: params.question,
      answerPreview:
        params.answer.length > 100
          ? params.answer.slice(0, 100) + "..."
          : params.answer,
      stage: params.stage,
      dimensions: embedding.length,
      nonzero,
      totalMs: Math.round(performance.now() - t0),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message, totalMs: Math.round(performance.now() - t0) },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// SEARCH
// ─────────────────────────────────────────────
async function handleSearch(params: {
  query: string;
  threshold: number;
  stage?: string;
}) {
  const t0 = performance.now();
  try {
    const queryEmbStart = performance.now();
    const queryEmbedding = await getEmbedding(params.query);
    const queryEmbedMs = performance.now() - queryEmbStart;

    const searchStart = performance.now();

    const entries = debugStore.filter(
      (e) => !params.stage || e.stage === params.stage
    );

    const scored = entries
      .map((entry) => {
        const similarity =
          entry.embedding.length > 0
            ? cosineSimilarity(queryEmbedding, entry.embedding)
            : -1;
        return {
          question: entry.question,
          answer: entry.answer,
          stage: entry.stage,
          usedCount: entry.usedCount,
          similarity,
          hit: similarity >= params.threshold,
        };
      })
      .filter((e) => e.similarity >= 0)
      .sort((a, b) => b.similarity - a.similarity);

    const bestMatch = scored[0] ?? null;
    const searchMs = performance.now() - searchStart;

    return NextResponse.json({
      ok: true,
      action: "search",
      query: params.query,
      threshold: params.threshold,
      stageFilter: params.stage || "all",
      searchMs: Math.round(searchMs),
      queryEmbedMs: Math.round(queryEmbedMs),
      totalMs: Math.round(performance.now() - t0),
      totalEntries: debugStore.length,
      resultsShown: scored.length,
      bestMatch: bestMatch
        ? {
            similarity: bestMatch.similarity.toFixed(4),
            hit: bestMatch.hit,
            response: bestMatch.answer,
            stage: bestMatch.stage,
          }
        : null,
      topResults: scored.slice(0, 10).map((r) => ({
        similarity: r.similarity.toFixed(4),
        hit: r.hit,
        responsePreview:
          r.answer.length > 80 ? r.answer.slice(0, 80) + "..." : r.answer,
        stage: r.stage,
        usedCount: r.usedCount,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: (e as Error).message, totalMs: Math.round(performance.now() - t0) },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────
// LIST
// ─────────────────────────────────────────────
async function handleList() {
  return NextResponse.json({
    ok: true,
    action: "list",
    count: debugStore.length,
    entries: debugStore.map((e) => ({
      id: e.id,
      question: e.question,
      stage: e.stage,
      usedCount: e.usedCount,
      responsePreview:
        e.answer.length > 60 ? e.answer.slice(0, 60) + "..." : e.answer,
      createdAt: e.createdAt,
    })),
  });
}

// ─────────────────────────────────────────────
// CLEAR
// ─────────────────────────────────────────────
async function handleClear() {
  const count = debugStore.length;
  debugStore.length = 0;
  return NextResponse.json({ ok: true, action: "clear", deleted: count });
}

// ─────────────────────────────────────────────
// ROUTE HANDLERS
// ─────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, text, question, answer, stage, query, threshold } = body;

  if (action === "embed") return handleEmbed(text, stage || "EXPLORE");
  if (action === "store") return handleStore({ question, answer, stage });
  if (action === "search") return handleSearch({ query, threshold: threshold ?? 0.6, stage });

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function GET() {
  return handleList();
}

export async function DELETE() {
  return handleClear();
}
