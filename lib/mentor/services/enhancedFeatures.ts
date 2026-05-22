import { MentorRequest } from "../orchestrator";
import { ConceptId } from "../personalizationEngine";

export function detectFrustrationLevel(message: string): number {
  const frustrationWords = [
    'frustrated', 'stuck', 'hate', 'confused', 'lost',
    'impossible', 'give up', 'ugh', 'wtf', 'screw this',
    'annoying', 'terrible', 'worst', 'fed up'
  ];
  const lower = message.toLowerCase();
  const count = frustrationWords.filter(word => lower.includes(word)).length;
  return Math.min(count / 5, 1); // Normalize to 0-1
}

export function extractConceptsFromProblem(body: MentorRequest): ConceptId[] {
  const concepts: ConceptId[] = [];
  const text = (body.problemTitle + ' ' + (body.problemStatementMd || '')).toLowerCase();

  // Map keywords to concepts
  const conceptMap: Record<string, ConceptId> = {
    'binary search': 'binary_search',
    'two pointer': 'two_pointer',
    'sliding window': 'sliding_window',
    'hash map': 'hash_map',
    'hashmap': 'hash_map',
    'stack': 'stack',
    'queue': 'queue',
    'heap': 'heap',
    'dfs': 'dfs',
    'bfs': 'bfs',
    'tree': 'tree',
    'graph': 'graph',
    'dp': 'dp',
    'dynamic programming': 'dp',
    'recursion': 'recursion',
    'backtrack': 'backtracking',
    'greedy': 'greedy',
  };

  for (const [keyword, concept] of Object.entries(conceptMap)) {
    if (text.includes(keyword) && !concepts.includes(concept)) {
      concepts.push(concept);
    }
  }

  return concepts;
}
