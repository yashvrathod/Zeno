import {
  buildStreakHeatmap,
  buildWeeklySolves,
  intensityFromCount,
} from '@/lib/profile/streak';

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

function dayOffset(base: Date, daysAgo: number, hour = 12): Date {
  const d = new Date(base);
  d.setHours(hour, 0, 0, 0);
  d.setDate(d.getDate() - daysAgo);
  return d;
}

describe('intensityFromCount', () => {
  it.each([
    [0, 0],
    [1, 1],
    [2, 2],
    [3, 3],
    [10, 3],
  ])('count=%i -> intensity=%i', (count, expected) => {
    expect(intensityFromCount(count)).toBe(expected);
  });

  it('handles negative input safely', () => {
    expect(intensityFromCount(-5)).toBe(0);
  });
});

describe('buildStreakHeatmap', () => {
  const NOW = new Date('2026-06-03T12:00:00Z');

  it('returns exactly the requested number of days, oldest first', () => {
    const heatmap = buildStreakHeatmap({ acceptedAt: [], days: 105, now: NOW });
    expect(heatmap).toHaveLength(105);
    expect(heatmap[0].date).toBe('2026-02-19');
    expect(heatmap[104].date).toBe('2026-06-03');
  });

  it('defaults to 105 days', () => {
    const heatmap = buildStreakHeatmap({ acceptedAt: [], now: NOW });
    expect(heatmap).toHaveLength(105);
  });

  it('returns all zeros when there is no activity', () => {
    const heatmap = buildStreakHeatmap({ acceptedAt: [], now: NOW });
    expect(heatmap.every((d) => d.intensity === 0 && d.count === 0)).toBe(true);
  });

  it('marks single solves as intensity 1', () => {
    const heatmap = buildStreakHeatmap({
      acceptedAt: [dayOffset(NOW, 3)],
      now: NOW,
    });
    expect(heatmap[heatmap.length - 4].intensity).toBe(1);
    expect(heatmap[heatmap.length - 4].count).toBe(1);
  });

  it('caps multiple solves on the same day at intensity 3', () => {
    const heatmap = buildStreakHeatmap({
      acceptedAt: [dayOffset(NOW, 1, 8), dayOffset(NOW, 1, 14), dayOffset(NOW, 1, 19)],
      now: NOW,
    });
    expect(heatmap[heatmap.length - 2].intensity).toBe(3);
    expect(heatmap[heatmap.length - 2].count).toBe(3);
  });

  it('sums solves across multiple problems on the same day', () => {
    const heatmap = buildStreakHeatmap({
      acceptedAt: [dayOffset(NOW, 0, 9), dayOffset(NOW, 0, 15), dayOffset(NOW, 0, 20)],
      now: NOW,
    });
    expect(heatmap[heatmap.length - 1].intensity).toBe(3);
    expect(heatmap[heatmap.length - 1].count).toBe(3);
  });

  it('does not leak activity from before the window', () => {
    const heatmap = buildStreakHeatmap({
      acceptedAt: [dayOffset(NOW, 200)],
      now: NOW,
    });
    expect(heatmap.every((d) => d.intensity === 0)).toBe(true);
  });

  it('ignores invalid dates', () => {
    const heatmap = buildStreakHeatmap({
      acceptedAt: [new Date('not-a-date'), dayOffset(NOW, 2)],
      now: NOW,
    });
    expect(heatmap[heatmap.length - 3].intensity).toBe(1);
  });

  it('accepts ISO date strings in addition to Date objects', () => {
    const iso = dayOffset(NOW, 5).toISOString();
    const heatmap = buildStreakHeatmap({ acceptedAt: [iso], now: NOW });
    expect(heatmap[heatmap.length - 6].intensity).toBe(1);
  });

  it('is deterministic — same input gives same output', () => {
    const input = [dayOffset(NOW, 2), dayOffset(NOW, 2)];
    const a = buildStreakHeatmap({ acceptedAt: input, now: NOW });
    const b = buildStreakHeatmap({ acceptedAt: input, now: NOW });
    expect(a).toEqual(b);
  });
});

describe('buildWeeklySolves', () => {
  const NOW = new Date('2026-06-03T12:00:00Z');

  it('returns the requested number of weeks, oldest first', () => {
    const points = buildWeeklySolves([], 10, NOW);
    expect(points).toHaveLength(10);
  });

  it('returns all zeros for no activity', () => {
    const points = buildWeeklySolves([], 10, NOW);
    expect(points.every((p) => p.problemsSolved === 0)).toBe(true);
  });

  it('buckets solves by ISO week starting Monday', () => {
    const monday = new Date('2026-05-25T10:00:00Z');
    const points = buildWeeklySolves([monday, monday], 10, NOW);
    const total = points.reduce((s, p) => s + p.problemsSolved, 0);
    expect(total).toBe(2);
    // Find the bucket containing 2026-05-25
    const match = points.find((p) => p.weekStart === '2026-05-25');
    expect(match?.problemsSolved).toBe(2);
  });
});
