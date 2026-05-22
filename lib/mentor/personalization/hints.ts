import type { ConceptMastery, ConceptId, PersonalizedHint, LearningStyle, StudentKnowledgeGraph, HintContext } from './types';
import type { LearningRung } from '../../types/mentor';

const conceptHints: Partial<Record<ConceptId, string[]>> = {
  binary_search: [
    'Remember: binary search requires a sorted array and a way to eliminate half the search space each step.',
    'Think about what condition lets you discard the left half vs the right half.',
    'The key is the comparison at mid - what does it tell you about where the target must be?',
    `To implement: set left=0, right=n-1. While left<=right: mid=(left+right)/2. If arr[mid]==target, done. If arr[mid]<target, left=mid+1. Else right=mid-1.`,
  ],
  two_pointer: [
    'Two pointers often work when you need to compare elements from different positions.',
    'Consider what happens when you move each pointer - which direction improves your situation?',
    'The key insight: what invariant is maintained as pointers move?',
    'Start both pointers at strategic positions. Move the one that brings you closer to the goal.',
  ],
  sliding_window: [
    'Sliding window helps when you need to find optimal subarrays/strings.',
    'Think: what makes a window valid? How do you know when to expand vs shrink?',
    'The window represents a candidate solution. Expand to explore, shrink to optimize.',
    'Maintain: what to track in the window (sum, count, etc.) and how to update it efficiently.',
  ],
  dp: [
    'Dynamic programming = optimal substructure + overlapping subproblems.',
    'First: what state represents the subproblem?',
    'Second: how do smaller subproblems combine to solve larger ones?',
    'Start with recursion, add memoization, then convert to bottom-up if needed.',
  ],
  hash_map: [
    'Hash maps trade space for time - O(1) lookups enable O(n) solutions.',
    'Ask: what do I need to look up quickly? What will be the key vs value?',
    'Common pattern: store seen elements, check for complement, count frequencies.',
    'Remember to handle collisions (though most languages do this automatically).',
  ],
};

const conceptAnalogies: Partial<Record<ConceptId, string>> = {
  binary_search: 'Like looking up a word in a dictionary - you open to the middle, see if your word comes before or after, and eliminate half the pages.',
  hash_map: 'Like a real dictionary or phone book - you can instantly find any entry if you know its key (the word/name).',
  two_pointer: 'Like two people starting at opposite ends of a hallway and walking toward each other - they meet in the middle.',
  sliding_window: 'Like looking through a fixed-size frame at a painting - you can slide it around to see different parts.',
  dp: 'Like climbing stairs - to reach step n, you must first reach steps n-1 and n-2 (Fibonacci). Each step builds on previous ones.',
};

export function generatePersonalizedHint(
  problemContext: HintContext,
  studentGraph: StudentKnowledgeGraph,
  currentRung: LearningRung
): PersonalizedHint | null {
  const { concepts, patterns, currentStage } = problemContext;

  const weakConcepts = concepts
    .map(c => studentGraph.concepts.get(c))
    .filter((c): c is ConceptMastery => c != null)
    .filter(c => c.mastery < 70)
    .sort((a, b) => a.mastery - b.mastery);

  if (weakConcepts.length === 0) return null;

  const weakest = weakConcepts[0];
  const hintLevel = determineHintLevel(studentGraph.learningStyle, currentRung, weakest.mastery);
  const modality = determineModality(studentGraph.learningStyle, currentStage);

  const hint = craftHint(weakest, hintLevel, modality, studentGraph.learningStyle);

  return {
    level: hintLevel,
    content: hint,
    modality,
    conceptsTargeted: [weakest.concept],
    estimatedEffectiveness: calculateEffectiveness(studentGraph.learningStyle, weakest, hintLevel),
    rationale: `Targeting ${weakest.concept} (mastery: ${weakest.mastery}%) with ${modality} hint at level ${hintLevel}`,
  };
}

function determineHintLevel(
  style: LearningStyle,
  rung: LearningRung,
  conceptMastery: number
): 0 | 1 | 2 | 3 {
  const preferredLevel = style.hintLevelPreference;

  if (conceptMastery < 30) return Math.min(3, preferredLevel + 1) as 0 | 1 | 2 | 3;
  if (conceptMastery < 50) return preferredLevel;
  if (conceptMastery < 70) return Math.max(0, preferredLevel - 1) as 0 | 1 | 2 | 3;

  return Math.max(0, preferredLevel - 2) as 0 | 1 | 2 | 3;
}

function determineModality(
  style: LearningStyle,
  stage: string
): 'text' | 'visual' | 'interactive' | 'analogy' {
  if (stage === 'DEBUG' && style.prefersVisual) return 'visual';
  if (style.learnsByDoing) return 'interactive';
  if (style.prefersAnalogy) return 'analogy';
  return 'text';
}

function craftHint(
  concept: ConceptMastery,
  level: 0 | 1 | 2 | 3,
  modality: 'text' | 'visual' | 'interactive' | 'analogy',
  style: LearningStyle
): string {
  const hints = conceptHints[concept.concept] || [
    `For ${concept.concept}: think about what makes this technique work.`,
    `The key insight for ${concept.concept} is understanding its core property.`,
    `To implement ${concept.concept}, focus on the state you need to maintain.`,
    `Remember: ${concept.concept} works because of its fundamental characteristic.`,
  ];

  let hint = hints[Math.min(level, hints.length - 1)];

  if (modality === 'analogy' && style.prefersAnalogy) {
    const analogy = conceptAnalogies[concept.concept];
    if (analogy) {
      hint = `Analogy: ${analogy}\n\n${hint}`;
    }
  }

  if (style.prefersVisual && modality !== 'visual') {
    hint = `Visual tip: [imagine a diagram here showing ${concept.concept}]\n\n${hint}`;
  }

  return hint;
}

function calculateEffectiveness(
  style: LearningStyle,
  concept: ConceptMastery,
  hintLevel: number
): number {
  let effectiveness = 0.5;

  const levelDiff = Math.abs(hintLevel - style.hintLevelPreference);
  effectiveness -= levelDiff * 0.1;

  effectiveness += (100 - concept.mastery) / 200;

  if (style.prefersVisual) effectiveness += 0.1;
  if (style.learnsByDoing) effectiveness += 0.1;

  return Math.max(0.1, Math.min(0.95, effectiveness));
}
