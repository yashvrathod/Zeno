/**
 * Pure helpers for the profile page.
 *
 * Streak heatmap: 105 days back from `now` (15 weeks × 7 days), one intensity
 * bucket per day. Intensity is derived from the count of accepted problem
 * submissions on that day:
 *
 *   0 problems  → 0 (no activity)
 *   1 problem   → 1
 *   2 problems  → 2
 *   3+ problems → 3
 *
 * No randomness, no Math.random. The output is fully determined by the input
 * so it can be unit-tested without any mocks.
 */

export type StreakDay = {
  date: string;
  intensity: 0 | 1 | 2 | 3;
  count: number;
};

export type BuildStreakHeatmapInput = {
  /** Submission timestamps (any Date) for accepted problems only. */
  acceptedAt: ReadonlyArray<Date | string>;
  /** Number of days back to include. Default 105 (15 weeks). */
  days?: number;
  /** Reference "today" — exposed for tests, defaults to current date. */
  now?: Date;
};

function toDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

/**
 * Bucket a count into the 0..3 intensity scale. Caps at 3.
 */
export function intensityFromCount(count: number): 0 | 1 | 2 | 3 {
  if (count <= 0) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
}

/**
 * Build a heatmap of length `days`, ordered oldest → newest, where each
 * element represents one calendar day ending at `now`. Days with no accepted
 * submissions produce intensity 0.
 */
export function buildStreakHeatmap(input: BuildStreakHeatmapInput): StreakDay[] {
  const days = input.days ?? 105;
  const now = startOfDay(input.now ?? new Date());

  const counts = new Map<string, number>();
  for (const raw of input.acceptedAt) {
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const key = toDateKey(startOfDay(d));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const out: StreakDay[] = [];
  for (let offset = days - 1; offset >= 0; offset--) {
    const day = new Date(now);
    day.setDate(day.getDate() - offset);
    const key = toDateKey(day);
    const count = counts.get(key) ?? 0;
    out.push({
      date: key,
      intensity: intensityFromCount(count),
      count,
    });
  }
  return out;
}

/**
 * Weekly solved-problem counts for the ranking chart. Returns N points
 * (oldest → newest), each `{ weekStart, problemsSolved }`.
 *
 * If the user has zero activity in the entire window, the array is empty
 * and the caller MUST hide the chart rather than render zeros — empty
 * data is a signal, not a fact.
 */
export type WeeklySolvePoint = {
  weekStart: string;
  problemsSolved: number;
};

export function buildWeeklySolves(
  acceptedAt: ReadonlyArray<Date | string>,
  weeks = 10,
  now: Date = new Date(),
): WeeklySolvePoint[] {
  const buckets = new Map<string, number>();
  for (const raw of acceptedAt) {
    const d = raw instanceof Date ? raw : new Date(raw);
    if (Number.isNaN(d.getTime())) continue;
    const start = startOfWeek(d);
    const key = toDateKey(start);
    buckets.set(key, (buckets.get(key) ?? 0) + 1);
  }

  const thisWeek = startOfWeek(now);
  const out: WeeklySolvePoint[] = [];
  for (let offset = weeks - 1; offset >= 0; offset--) {
    const weekStart = new Date(thisWeek);
    weekStart.setDate(weekStart.getDate() - offset * 7);
    const key = toDateKey(weekStart);
    out.push({
      weekStart: key,
      problemsSolved: buckets.get(key) ?? 0,
    });
  }
  return out;
}

function startOfWeek(d: Date): Date {
  const out = startOfDay(d);
  // ISO week: Monday = 1, Sunday = 0 in JS day-of-week. Normalize so
  // Monday is the first day of the week.
  const day = out.getDay();
  const diff = (day + 6) % 7;
  out.setDate(out.getDate() - diff);
  return out;
}
