/**
 * Weakness Map API — Pattern Recognition Feature
 *
 * GET /api/user/weakness-map
 *
 * Returns user's top weak patterns with statistics and personalized recommendations.
 * This powers the "Skill Tree" and "Weakness Radar" UI components.
 */

import { auth } from "@/lib/auth";
import {
  getWeakPatternReport,
  PATTERN_METADATA,
  type WeakPatternTag,
} from "@/lib/mentor/patternTracker";

export const runtime = "nodejs";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;

    // Get weak pattern report
    const weakPatterns = await getWeakPatternReport(userId);

    // Calculate overall stats
    const totalWeakPatterns = weakPatterns.reduce((sum, p) => sum + p.count, 0);
    const topWeakness = weakPatterns[0];

    // Generate personalized recommendation
    let recommendation = "Keep practicing! You're building a strong foundation.";
    if (topWeakness) {
      const tag = topWeakness.tag;
      const meta = PATTERN_METADATA[tag as WeakPatternTag];
      if (meta) {
        recommendation = `Focus on ${meta.friendlyName.toLowerCase()}: ${meta.howToFix}`;
      }
    }

    // Build skill tree data
    const skillTree = {
      categories: [
        {
          name: "Array & String",
          skills: ["off-by-one", "index-out-of-bounds", "missed-edge-case"],
        },
        {
          name: "Logic & Flow",
          skills: ["infinite-loop-risk", "wrong-base-case", "null-check-missing"],
        },
        {
          name: "Optimization",
          skills: ["wrong-complexity", "suboptimal-approach"],
        },
      ],
      userProgress: weakPatterns.reduce((acc, p) => {
        acc[p.tag] = {
          count: p.count,
          percentOfSessions: p.percentOfSessions,
          isWeak: p.percentOfSessions > 30, // Flag if >30% of sessions
        };
        return acc;
      }, {} as Record<string, { count: number; percentOfSessions: number; isWeak: boolean }>),
    };

    return Response.json({
      ok: true,
      summary: {
        totalWeakPatterns,
        topWeakness: topWeakness
          ? {
              tag: topWeakness.tag,
              friendlyName: topWeakness.friendlyName,
              count: topWeakness.count,
              description: topWeakness.description,
            }
          : null,
        recommendation,
      },
      patterns: weakPatterns,
      skillTree,
    });
  } catch (error) {
    console.error("Weakness Map API Error:", error);
    return Response.json(
      { error: "Failed to generate weakness map" },
      { status: 500 }
    );
  }
}
