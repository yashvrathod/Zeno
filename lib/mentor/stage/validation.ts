import { debug } from "@/lib/debug";
import { TeachingStage } from "@/lib/mentorContext";

export type TransitionContext = {
  approachCorrect?: boolean;
  codeCorrect?: boolean;
  isOptimal?: boolean;
  hasErrors?: boolean;
  isFrustrated?: boolean;
};

export type TransitionRule = {
  from: TeachingStage;
  to: TeachingStage;
  requiredContext?: (context: TransitionContext) => boolean;
  reason?: string;
};

export const TRANSITION_RULES: TransitionRule[] = [
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
  { from: "EXPLORE", to: "STUCK", requiredContext: (ctx) => ctx.isFrustrated === true },
  { from: "STRATEGIZE", to: "STUCK", requiredContext: (ctx) => ctx.isFrustrated === true },
  { from: "IMPLEMENT", to: "STUCK", requiredContext: (ctx) => ctx.isFrustrated === true },
  { from: "DEBUG", to: "STUCK", requiredContext: (ctx) => ctx.isFrustrated === true },
  { from: "STUCK", to: "EXPLORE", requiredContext: (ctx) => ctx.isFrustrated === false },
  { from: "STUCK", to: "STRATEGIZE", requiredContext: (ctx) => ctx.isFrustrated === false },
  { from: "STUCK", to: "IMPLEMENT", requiredContext: (ctx) => ctx.isFrustrated === false },
];

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

export async function canTransition(
  from: TeachingStage,
  to: TeachingStage,
  context: TransitionContext = {}
): Promise<{ allowed: boolean; reason?: string }> {
  if (process.env.DEBUG_STAGE !== "0") {
    debug.stage("canTransition check:", { from, to, context });
  }

  if (from === to) {
    if (from === "IMPLEMENT" && context.codeCorrect === true && context.isOptimal === false) {
      return { allowed: true, reason: "Code is correct but not optimal — pushing to optimize" };
    }
    return { allowed: false, reason: `Already at stage "${from}" — no transition needed` };
  }

  const rule = TRANSITION_RULES.find((r) => r.from === from && r.to === to);

  if (!rule) {
    if (process.env.DEBUG_STAGE !== "0") {
      debug.stage(`  ❌ No rule found for ${from} → ${to}`);
    }
    const validNext = TRANSITION_RULES.filter((r) => r.from === from).map((r) => r.to);
    const validList = validNext.length > 0 ? validNext.join(", ") : "(terminal stage)";
    return {
      allowed: false,
      reason: `Invalid transition: "${from}" → "${to}" is not allowed. Valid transitions from ${from}: ${validList}`,
    };
  }

  if (rule.requiredContext && !rule.requiredContext(context)) {
    if (process.env.DEBUG_STAGE !== "0") {
      debug.stage(`  ❌ Context check failed for ${from} → ${to}`);
    }
    return {
      allowed: false,
      reason: rule.reason ?? `Context check failed for "${from}" → "${to}"`,
    };
  }

  if (process.env.DEBUG_STAGE !== "0") {
    debug.stage(`  ✅ Allowed: ${from} → ${to}`);
  }
  return { allowed: true };
}
