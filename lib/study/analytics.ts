export const DAY_MS = 86_400_000;

/** Local calendar day key, e.g. "2026-10-23". */
export function dayKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export interface DayCount {
  date: string;
  count: number;
}

/** Counts of activity for each of the last `days` days, oldest first, including empty days. */
export function activityByDay(timestamps: string[], days: number, now = new Date()): DayCount[] {
  const counts = new Map<string, number>();
  for (const t of timestamps) {
    const key = dayKey(new Date(t));
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const date = dayKey(new Date(now.getTime() - (days - 1 - i) * DAY_MS));
    return { date, count: counts.get(date) ?? 0 };
  });
}

/** Consecutive active days ending today (or yesterday, so the streak survives until the day is over), and the best run. */
export function streaks(
  timestamps: string[],
  now = new Date(),
): { current: number; longest: number } {
  const days = new Set(timestamps.map((t) => dayKey(new Date(t))));
  const sorted = [...days].sort();
  let longest = 0;
  let run = 0;
  let prev: number | null = null;
  for (const key of sorted) {
    const [y, m, d] = key.split("-").map(Number);
    const at = Date.UTC(y, m - 1, d);
    run = prev !== null && at - prev === DAY_MS ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = at;
  }
  let current = 0;
  let cursor = now.getTime();
  if (!days.has(dayKey(new Date(cursor)))) cursor -= DAY_MS;
  while (days.has(dayKey(new Date(cursor)))) {
    current++;
    cursor -= DAY_MS;
  }
  return { current, longest };
}

export interface ScorePoint {
  at: string;
  kind: "diagnostic" | "practice";
  correct: number;
  total: number;
  pct: number;
}

export function scoreSeries(
  attempts: {
    createdAt: string;
    kind: "diagnostic" | "practice";
    perTopic: Record<string, { correct: number; total: number }>;
  }[],
): ScorePoint[] {
  return attempts
    .map((a) => {
      const vals = Object.values(a.perTopic);
      const correct = vals.reduce((n, v) => n + v.correct, 0);
      const total = vals.reduce((n, v) => n + v.total, 0);
      return {
        at: a.createdAt,
        kind: a.kind,
        correct,
        total,
        pct: total ? Math.round((correct / total) * 100) : 0,
      };
    })
    .sort((a, b) => a.at.localeCompare(b.at));
}

export interface TopicAccuracy {
  topicId: string;
  correct: number;
  total: number;
  pct: number;
}

/** Accuracy per topic across every attempt, weakest first, so the dashboard can say where to focus. */
export function weakestTopics(
  attempts: { perTopic: Record<string, { correct: number; total: number }> }[],
  minQuestions = 1,
): TopicAccuracy[] {
  const sums = new Map<string, { correct: number; total: number }>();
  for (const a of attempts)
    for (const [id, v] of Object.entries(a.perTopic)) {
      const s = sums.get(id) ?? { correct: 0, total: 0 };
      sums.set(id, { correct: s.correct + v.correct, total: s.total + v.total });
    }
  return [...sums.entries()]
    .filter(([, v]) => v.total >= minQuestions)
    .map(([topicId, v]) => ({ topicId, ...v, pct: Math.round((v.correct / v.total) * 100) }))
    .sort((a, b) => a.pct - b.pct);
}
