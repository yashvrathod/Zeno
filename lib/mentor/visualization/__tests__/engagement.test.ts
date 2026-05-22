import { calculateEngagementScore } from '../engagement';

describe('calculateEngagementScore', () => {
  it('returns 0 for no interactions', () => {
    const score = calculateEngagementScore({
      totalInteractions: 0,
      interactionsByType: {},
      averageInteractionDuration: 0,
      visualizationViews: 0,
      animationPlays: 0,
      annotationCreates: 0,
      hintsViewed: 0,
      conceptsExplored: new Set(),
      engagementScore: 0,
    }, 1);
    expect(score).toBe(0);
  });

  it('rewards interaction diversity', () => {
    const score = calculateEngagementScore({
      totalInteractions: 10,
      interactionsByType: { hover_node: 5, click_node: 5, step_forward: 3, step_backward: 2 },
      averageInteractionDuration: 10,
      visualizationViews: 3,
      animationPlays: 1,
      annotationCreates: 2,
      hintsViewed: 1,
      conceptsExplored: new Set(['binary_search', 'two_pointer']),
      engagementScore: 50,
    }, 300);
    expect(score).toBeGreaterThan(50);
  });

  it('caps at 100', () => {
    const score = calculateEngagementScore({
      totalInteractions: 100,
      interactionsByType: { hover_node: 20, click_node: 20, step_forward: 20, step_backward: 20, play_pause: 20 },
      averageInteractionDuration: 30,
      visualizationViews: 20,
      animationPlays: 10,
      annotationCreates: 10,
      hintsViewed: 10,
      conceptsExplored: new Set(['binary_search', 'two_pointer', 'dp', 'bfs', 'dfs', 'graph', 'tree']),
      engagementScore: 90,
    }, 600);
    expect(score).toBeLessThanOrEqual(100);
  });
});
