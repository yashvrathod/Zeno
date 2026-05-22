import { VisualizationData, VisualizationStep } from "../execution-trace/types";

export interface VisualDiff {
  student: VisualizationData | null;
  expected: VisualizationData | null;
  stepDifferences: StepDifference[];
  summary: string;
}

export interface StepDifference {
  stepIndex: number;
  studentState: string;
  expectedState: string;
  description: string;
}

export function diffVisualizations(
  studentViz: VisualizationData | null,
  expectedViz: VisualizationData | null,
): VisualDiff {
  const stepDifferences: StepDifference[] = [];

  if (!studentViz || !expectedViz) {
    return {
      student: studentViz,
      expected: expectedViz,
      stepDifferences: [],
      summary: !studentViz ? "No student visualization available" : "No expected visualization available",
    };
  }

  const maxSteps = Math.max(studentViz.steps.length, expectedViz.steps.length);

  for (let i = 0; i < maxSteps; i++) {
    const sStep = studentViz.steps[i];
    const eStep = expectedViz.steps[i];

    if (!sStep && eStep) {
      stepDifferences.push({
        stepIndex: i,
        studentState: "(missing)",
        expectedState: JSON.stringify(eStep.data),
        description: `Missing step ${i}: expected "${eStep.description}"`,
      });
      continue;
    }

    if (sStep && !eStep) {
      stepDifferences.push({
        stepIndex: i,
        studentState: JSON.stringify(sStep.data),
        expectedState: "(no more steps)",
        description: `Extra step ${i}: "${sStep.description}"`,
      });
      continue;
    }

    if (!sStep || !eStep) continue;

    const sStr = JSON.stringify(sStep.data);
    const eStr = JSON.stringify(eStep.data);

    if (sStr !== eStr) {
      stepDifferences.push({
        stepIndex: i,
        studentState: sStr,
        expectedState: eStr,
        description: `Step ${i} differs: student "${sStep.description}" vs expected "${eStep.description}"`,
      });
    }
  }

  const summary = stepDifferences.length === 0
    ? "Visualizations match perfectly"
    : `Found ${stepDifferences.length} visual difference(s)`;

  return { student: studentViz, expected: expectedViz, stepDifferences, summary };
}
