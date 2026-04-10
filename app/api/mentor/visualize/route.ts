/**
 * Dynamic Visual Scaffolding API
 *
 * POST /api/mentor/visualize
 *
 * Generates ASCII/SVG visualizations for algorithm explanations.
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import {
  generateVisualization,
  detectVisualizationType,
  type VisualizationData,
} from "@/lib/mentor/services/visualScaffolding";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.data) {
      return Response.json(
        { error: "Missing visualization data" },
        { status: 400 }
      );
    }

    const vizData = body.data as VisualizationData;

    // Generate visualization
    const visualization = generateVisualization(vizData);

    // Auto-detect type if not provided
    const detectedType =
      vizData.type || detectVisualizationType(body.problemTitle || "", body.problemStatement || "");

    return Response.json({
      ok: true,
      visualization,
      type: detectedType,
      isSvg: visualization.includes("<svg") || visualization.includes("SVG"),
    });
  } catch (error) {
    console.error("Visualization API Error:", error);
    return Response.json(
      { error: "Failed to generate visualization" },
      { status: 500 }
    );
  }
}
