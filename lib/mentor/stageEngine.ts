import prisma from "@/lib/prisma";
import { debug, startTimer } from "@/lib/debug";
import { TeachingStage } from "@/lib/mentorContext";

// =============================================================================
// STAGE ENGINE — State Machine for Mentor Sessions
// =============================================================================
//
// The StageEngine manages the progression of a student through a coding problem
// using a strict state machine. This is more structured than the reactive detection
// in mentorContext.ts — it enforces valid transitions and persists state in the DB.
//
// VALID STAGES AND THEIR MEANING (Mapping from legacy):
//   EXPLORE     (was UNDERSTAND) → Student is building mental model of the problem
//   STRATEGIZE  (was APPROACH)   → Student is figuring out their strategy/algorithm
//   IMPLEMENT   (was CODE)       → Student is implementing their solution
//   DEBUG                        → Student is fixing errors
//   STUCK                        → Student needs extra help
//   REFLECT     (was COMPLETE)   → Student solved it (terminal/review state)
//
// VALID TRANSITIONS (ONLY these are allowed):
//   EXPLORE    → STRATEGIZE    (user confirms they understand the problem)
//   STRATEGIZE → IMPLEMENT     (approach validated as correct)
//   IMPLEMENT  → REFLECT       (code is correct AND optimal)
//   IMPLEMENT  → DEBUG         (code has errors)
//   DEBUG      → IMPLEMENT     (bug found/fixed)
//   IMPLEMENT  → IMPLEMENT     (code is correct but not optimal — push to optimize)
//   *          → STUCK         (any stage can lead to stuck if frustrated)
//
// ANY OTHER TRANSITION is rejected with a reason explaining why.
// =============================================================================

export type MessageRole = "user" | "assistant";

// ─────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────

export type MentorSession = {
  id: string;
  userId: string;
  problemId: string;
  stage: TeachingStage;
  createdAt: Date;
  updatedAt: Date;
};

export type Message = {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  stage: TeachingStage;
  createdAt: Date;
};

export type TransitionContext = {
  approachCorrect?: boolean;
  codeCorrect?: boolean;
  isOptimal?: boolean;
  hasErrors?: boolean;
  isFrustrated?: boolean;
};

type TransitionRule = {
  from: TeachingStage;
  to: TeachingStage;
  requiredContext?: (context: TransitionContext) => boolean;
  reason?: string;
};

// ─────────────────────────────────────────────────────────────────────────
// Debug utilities (always-on, structured)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Logs stage engine operations with timestamp and label.
 * Uses the centralized debug.stage() function for consistent output.
 *
 * To silence these logs, set DEBUG_STAGE=0 in your env.
 */
function debugLog(label: string, ...args: unknown[]): void {
  if (process.env.DEBUG_STAGE === "0") return;
  debug.stage(label, ...args);
}

// ─────────────────────────────────────────────────────────────────────────
// Transition Rules — THE SOURCE OF TRUTH for valid stage moves
// ─────────────────────────────────────────────────────────────────────────

/**
 * Every allowed transition has a rule. If a rule isn't here, it's not allowed.
 *
 * Each rule has:
 * - from/to stages
 * - An optional context check function that returns true only if the
 *   transition conditions are met (e.g., approachCorrect must be true)
 * - An error reason shown when the rule doesn't match
 */
const TRANSITION_RULES: TransitionRule[] = [
  {
    from: "EXPLORE",
    to: "STRATEGIZE",
    requiredContext: () => true,
  },
  {
    from: "STRATEGIZE",
    to: "IMPLEMENT",
    requiredContext: (ctx) => ctx.approachCorrect === true,
    reason: "Cannot move to IMPLEMENT yet — approach must be validated as correct first",
  },
  {
    from: "IMPLEMENT",
    to: "REFLECT",
    requiredContext: (ctx) => ctx.codeCorrect === true && ctx.isOptimal === true,
    reason: "Cannot mark REFLECT — code must be correct AND optimal",
  },
  {
    from: "IMPLEMENT",
    to: "IMPLEMENT",
    requiredContext: (ctx) => ctx.codeCorrect === true && ctx.isOptimal === false,
    reason: "Code is correct but not optimal — try to optimize before completing",
  },
  {
    from: "IMPLEMENT",
    to: "DEBUG",
    requiredContext: (ctx) => ctx.hasErrors === true,
  },
  {
    from: "DEBUG",
    to: "IMPLEMENT",
    requiredContext: (ctx) => ctx.hasErrors === false,
  },
  // STUCK transitions (can happen from any stage except REFLECT)
  { from: "EXPLORE", to: "STUCK", requiredContext: (ctx) => ctx.isFrustrated === true },
  { from: "STRATEGIZE", to: "STUCK", requiredContext: (ctx) => ctx.isFrustrated === true },
  { from: "IMPLEMENT", to: "STUCK", requiredContext: (ctx) => ctx.isFrustrated === true },
  { from: "DEBUG", to: "STUCK", requiredContext: (ctx) => ctx.isFrustrated === true },
  // Recovery from STUCK
  { from: "STUCK", to: "EXPLORE", requiredContext: (ctx) => ctx.isFrustrated === false },
  { from: "STUCK", to: "STRATEGIZE", requiredContext: (ctx) => ctx.isFrustrated === false },
  { from: "STUCK", to: "IMPLEMENT", requiredContext: (ctx) => ctx.isFrustrated === false },
];

/**
 * Debug helper: prints all defined transition rules so you can see
 * the complete state machine at a glance in your console.
 */
export function printTransitionRules(): void {
  console.log("--- STAGE ENGINE: TRANSITION RULES ---");
  for (const rule of TRANSITION_RULES) {
    const hasCheck = !!rule.requiredContext;
    console.log(`  ${rule.from} → ${rule.to}${hasCheck ? " (with context check)" : ""}`);
    if (rule.reason) {
      console.log(`    Reject reason: "${rule.reason}"`);
    }
  }
  console.log("--------------------------------------");
}

// ─────────────────────────────────────────────────────────────────────────
// Core Functions
// ─────────────────────────────────────────────────────────────────────────

/**
 * Can we transition from stage A to stage B given the current context?
 *
 * This is a PURE VALIDATOR — it doesn't mutate any state. It checks:
 * 1. Is there a rule allowing this from→to pair?
 * 2. If the rule has a context check, does it pass?
 * 3. If both pass, the transition is allowed
 *
 * @param from   - Current stage
 * @param to     - Desired next stage
 * @param context - Evaluation context (approachCorrect, codeCorrect, isOptimal)
 * @returns { allowed: true } or { allowed: false, reason: "why" }
 *
 * DEBUG TIPS:
 * - If getting unexpected rejections, call printTransitionRules() first to verify
 *   the rules match your mental model
 * - The reason string tells you exactly which block was hit
 */
export async function canTransition(
  from: TeachingStage,
  to: TeachingStage,
  context: TransitionContext = {}
): Promise<{ allowed: boolean; reason?: string }> {
  debugLog("canTransition check:", { from, to, context });

  // SAME STAGE → not a transition
  if (from === to) {
    // Special case: IMPLEMENT → IMPLEMENT is allowed as "retry optimization"
    if (from === "IMPLEMENT" && context.codeCorrect === true && context.isOptimal === false) {
      return { allowed: true, reason: "Code is correct but not optimal — pushing to optimize" };
    }
    return { allowed: false, reason: `Already at stage "${from}" — no transition needed` };
  }

  // Find the rule for this from→to pair
  const rule = TRANSITION_RULES.find((r) => r.from === from && r.to === to);

  if (!rule) {
    debugLog("  ❌ No rule found for", from, "→", to);
    return {
      allowed: false,
      reason: `Invalid transition: "${from}" → "${to}" is not allowed. Valid transitions from "${from}": ${TRANSITION_RULES.filter((r) => r.from === from).map((r) => r.to).join(", ")}`,
    };
  }

  // Rule exists — check its context condition
  if (rule.requiredContext && !rule.requiredContext(context)) {
    debugLog("  ❌ Context check failed for", from, "→", to);
    return {
      allowed: false,
      reason: rule.reason ?? `Context check failed for "${from}" → "${to}"`,
    };
  }

  debugLog("  ✅ Allowed:", from, "→", to);
  return { allowed: true };
}

/**
 * Gets an existing session or creates a new one.
 *
 * IMPORTANT: This function ALWAYS returns with messages attached — even
 * for brand-new sessions (which will have an empty messages array).
 *
 * The session is uniquely identified by userId + problemId composite.
 * A new session always starts at the EXPLORE stage.
 *
 * @param userId    - The authenticated user's ID
 * @param problemId - The problem they're working on
 * @returns MentorSession with { messages: Message[] }
 */
export async function getOrCreateSession(
  userId: string,
  problemId: string
): Promise<MentorSession & { messages: Message[] }> {
  debugLog("getOrCreateSession:", { userId, problemId });

  // Use upsert so the first call creates the session, subsequent calls return it
  const [session, messages] = await prisma.$transaction(async (tx) => {
    const session = await tx.mentorSession.upsert({
      where: {
        userId_problemId: { userId, problemId },
      },
      create: {
        userId,
        problemId,
        stage: "EXPLORE",
        currentRung: 1,
      },
      update: {
        updatedAt: new Date(), // Touch updatedAt to mark session as recently active
      },
    });

    const messages = await tx.mentorMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" as const },
    });

    return [session, messages];
  });

  debugLog("  →", messages.length === 0 ? "new session" : "existing session",
    `(${messages.length} messages)`);

  return {
    ...session,
    stage: session.stage as TeachingStage,
    messages: messages.map((m) => ({
      ...m,
      role: m.role as MessageRole,
      stage: m.stage as TeachingStage,
    })),
  };
}

/**
 * Attempts to advance a session's stage.
 *
 * This is the ONLY function that mutates session state in the database.
 * It validates the transition first via canTransition(), then updates:
 * 1. The session's stage in MentorSession
 * 2. Saves a system message recording the stage change
 *
 * @param sessionId - The session to advance
 * @param to        - What stage to move to
 * @param context   - Why this transition is valid
 * @returns { success: true, newStage } or { success: false, message: "why not" }
 */
export async function tryAdvanceStage(
  sessionId: string,
  to: TeachingStage,
  context: TransitionContext
): Promise<{ success: boolean; newStage: TeachingStage; message?: string }> {
  debugLog("tryAdvanceStage:", { sessionId, to, context });

  // Fetch current session to know the 'from' stage
  const session = await prisma.mentorSession.findUnique({
    where: { id: sessionId },
  });

  if (!session) {
    debugLog("  ❌ Session not found:", sessionId);
    return {
      success: false,
      newStage: to,
      message: "Session not found — may have been deleted",
    };
  }

  const from = session.stage as TeachingStage;
  debugLog("  → Current stage:", from, "→ Requested:", to);

  // Validate transition
  const validation = await canTransition(from, to, context);

  if (!validation.allowed) {
    debugLog("  ❌ Transition rejected:", validation.reason);
    return {
      success: false,
      newStage: from, // Stay at current stage
      message: validation.reason,
    };
  }

  // Transition allowed — update session
  await prisma.mentorSession.update({
    where: { id: sessionId },
    data: { stage: to },
  });

  // Save a system message recording the transition for audit trail
  await prisma.mentorMessage.create({
    data: {
      sessionId,
      role: "system",
      content: `Stage advanced: ${from} → ${to}`,
      stage: to,
    },
  });

  debugLog("  ✅ Advanced:", from, "→", to);

  return { success: true, newStage: to };
}

/**
 * Saves a message to the session with automatic deduplication.
 *
 * @param sessionId - The session to save the message in
 * @param role      - "user" or "assistant"
 * @param content   - Message text
 * @param stage     - Current stage (tagged for debugging)
 * @returns The created (or deduplicated) Message
 */
export async function saveMessage(
  sessionId: string,
  role: MessageRole | "system",
  content: string,
  stage: TeachingStage
): Promise<Message> {
  debugLog("saveMessage:", { sessionId, role, contentLen: content.length, stage });

  // Dedup query: find identical messages in the last 5 seconds
  const fiveSecondsAgo = new Date(Date.now() - 5000);

  const existing = await prisma.mentorMessage.findFirst({
    where: {
      sessionId,
      role,
      content,
      createdAt: { gte: fiveSecondsAgo },
    },
    orderBy: { createdAt: "desc" as const },
  });

  if (existing) {
    debugLog("  → dedup: skipped (identical message from",
      Math.round((Date.now() - existing.createdAt.getTime()) / 1000) + "s ago)");
    return {
      ...existing,
      role: existing.role as MessageRole,
      stage: existing.stage as TeachingStage,
    };
  }

  const message = await prisma.mentorMessage.create({
    data: {
      sessionId,
      role,
      content,
      stage,
    },
  });

  debugLog("  → saved (id:", message.id.slice(0, 8) + "...)");

  return {
    ...message,
    role: message.role as MessageRole,
    stage: message.stage as TeachingStage,
  };
}

/**
 * Returns learning analytics for a user across all their sessions.
 */
export async function getSessionStats(
  userId: string
): Promise<{
  totalAttempted: number;
  totalSolved: number;
  averageHintsPerProblem: number;
  currentStreak: number;
}> {
  debugLog("getSessionStats:", { userId });

  // Fetch all sessions for this user in one query
  const sessions = await prisma.mentorSession.findMany({
    where: { userId },
  });

  // Total problems attempted (unique problemIds with any session)
  const attemptedProblemIds = new Set(sessions.map((s) => s.problemId));
  const totalAttempted = attemptedProblemIds.size;

  // Count solved sessions (stage = REFLECT)
  const solvedProblemIds = new Set(
    sessions.filter((s) => s.stage === "REFLECT").map((s) => s.problemId)
  );
  const totalSolved = solvedProblemIds.size;

  // Average messages per problem (proxy for hints)
  const messageCounts = await Promise.all(
    sessions.map(async (s) => {
      const count = await prisma.mentorMessage.count({
        where: { sessionId: s.id },
      });
      return count;
    })
  );

  const totalMessages = messageCounts.reduce((sum, c) => sum + c, 0);
  const averageHintsPerProblem =
    totalAttempted > 0 ? Math.round((totalMessages / totalAttempted) * 100) / 100 : 0;

  // Compute current streak: consecutive days with activity
  const currentStreak = await computeStreak(userId, sessions);

  return {
    totalAttempted,
    totalSolved,
    averageHintsPerProblem,
    currentStreak,
  };
}

/**
 * Computes the current day streak — how many consecutive days (including today)
 * the user has had mentor activity.
 *
 * Walks backward from today: if today has sessions, count it, then check
 * yesterday, and so on. Stops at the first gap.
 *
 * DEBUG TIPS:
 * - A streak of 0 means no activity today or yesterday
 * - A streak of 1 could mean "just started today" or "activity only today"
 * - Uses local date parsing — if your server is in a different timezone
 *   than the user, streaks may be off by 1
 */
async function computeStreak(
  userId: string,
  sessions: { updatedAt: Date }[]
): Promise<number> {
  if (sessions.length === 0) return 0;

  // Get unique dates with activity (local date)
  const activeDates = new Set<string>();
  for (const session of sessions) {
    const date = session.updatedAt.toISOString().slice(0, 10);
    activeDates.add(date);
  }

  let streak = 0;
  let checkDate = new Date();

  // Walk back day by day
  for (let i = 0; i < 365; i++) {
    const dateStr = checkDate.toISOString().slice(0, 10);

    if (activeDates.has(dateStr)) {
      streak++;
    } else {
      break;
    }

    // Move to previous day
    checkDate.setDate(checkDate.getDate() - 1);
  }

  return streak;
}
