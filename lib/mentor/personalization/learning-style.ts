import type { StudentKnowledgeGraph, LearningStyle, ConceptMastery, ConceptId, LearningStyleInteraction } from './types';

export function updateLearningStyle(
  graph: StudentKnowledgeGraph,
  interaction: LearningStyleInteraction
): LearningStyle {
  const style = { ...graph.learningStyle };

  if (interaction.hintEffective) {
    style.hintLevelPreference = interaction.hintLevelUsed;
  } else {
    style.hintLevelPreference = Math.min(3, interaction.hintLevelUsed + 1) as 0 | 1 | 2 | 3;
  }

  if (interaction.responseType === 'visual' && interaction.timeToUnderstand < 60) {
    style.prefersVisual = true;
  }

  if (interaction.askedForMoreExamples) {
    style.prefersExamples = true;
  }

  if (interaction.timeToUnderstand < 30) {
    style.explanationDensity = 'concise';
  } else if (interaction.timeToUnderstand < 120) {
    style.explanationDensity = 'detailed';
  } else {
    style.explanationDensity = 'comprehensive';
  }

  return style;
}

export function calculateOverallMastery(graph: StudentKnowledgeGraph): number {
  const concepts = Array.from(graph.concepts.values());
  if (concepts.length === 0) return 0;

  const totalMastery = concepts.reduce((sum, c) => sum + c.mastery, 0);
  return Math.round(totalMastery / concepts.length);
}

export function getWeakestConcepts(
  graph: StudentKnowledgeGraph,
  count: number = 3
): ConceptMastery[] {
  return Array.from(graph.concepts.values())
    .filter(c => c.practiceCount > 0)
    .sort((a, b) => a.mastery - b.mastery)
    .slice(0, count);
}

export function getStrongestConcepts(
  graph: StudentKnowledgeGraph,
  count: number = 3
): ConceptMastery[] {
  return Array.from(graph.concepts.values())
    .sort((a, b) => b.mastery - a.mastery)
    .slice(0, count);
}
