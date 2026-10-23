export type MasteryLevel = "weak" | "okay" | "strong";

export const WEAK_BELOW = 0.6;
export const STRONG_AT = 0.8;
/** A new plan version is only worth creating when some topic moves at least this much. */
export const MEANINGFUL_DELTA = 0.05;

export interface TopicRef {
  id: string;
  name: string;
  position: number;
  exerciseIds: string[];
}

export interface PerTopicScore {
  correct: number;
  total: number;
}

export interface QuizSummary {
  perTopic: Record<string, PerTopicScore>;
}

export interface TopicMastery {
  topicId: string;
  /** 0..1: 50% latest quiz accuracy + 50% share of the topic's exercises passed. */
  score: number;
  quizAccuracy: number | null;
  exerciseShare: number | null;
  level: MasteryLevel;
}

export function levelOf(score: number): MasteryLevel {
  if (score < WEAK_BELOW) return "weak";
  if (score < STRONG_AT) return "okay";
  return "strong";
}

/** Latest quiz accuracy for a topic, looking back through attempts (newest first) for one that covered it. */
export function latestAccuracy(topicId: string, attemptsNewestFirst: QuizSummary[]): number | null {
  for (const attempt of attemptsNewestFirst) {
    const s = attempt.perTopic[topicId];
    if (s && s.total > 0) return s.correct / s.total;
  }
  return null;
}

/**
 * Mastery per topic. Both halves count 50% each. If a topic has no exercises (or no quiz data yet),
 * the half that exists carries the whole score so a topic is never punished for what it doesn't have.
 */
export function computeMastery(
  topics: TopicRef[],
  attemptsNewestFirst: QuizSummary[],
  passedExerciseIds: ReadonlySet<string>,
): TopicMastery[] {
  return topics.map((t) => {
    const quizAccuracy = latestAccuracy(t.id, attemptsNewestFirst);
    const exerciseShare =
      t.exerciseIds.length > 0
        ? t.exerciseIds.filter((id) => passedExerciseIds.has(id)).length / t.exerciseIds.length
        : null;
    let score = 0;
    if (quizAccuracy !== null && exerciseShare !== null)
      score = 0.5 * quizAccuracy + 0.5 * exerciseShare;
    else if (quizAccuracy !== null) score = quizAccuracy;
    else if (exerciseShare !== null) score = exerciseShare;
    return { topicId: t.id, score, quizAccuracy, exerciseShare, level: levelOf(score) };
  });
}

/** Weakest first. Ties keep the course's own topic order. */
export function orderWeakestFirst(
  mastery: TopicMastery[],
  topics: Pick<TopicRef, "id" | "position">[],
): TopicMastery[] {
  const position = new Map(topics.map((t) => [t.id, t.position]));
  return [...mastery].sort(
    (a, b) => a.score - b.score || (position.get(a.topicId) ?? 0) - (position.get(b.topicId) ?? 0),
  );
}

export interface MasteryChange {
  topicId: string;
  from: MasteryLevel;
  to: MasteryLevel;
  delta: number;
  direction: "up" | "down" | "same";
}

export interface MasteryDiff {
  changes: MasteryChange[];
  /** True when any topic moved a meaningful amount, changed level, or the weakest topic changed. */
  meaningful: boolean;
  /** The topic to study next (weakest in the new mastery), or null when everything is strong. */
  nextFocus: string | null;
}

/** Compares two mastery snapshots. Used to decide whether to create a new plan version and what the banner says. */
export function diffMastery(
  previous: TopicMastery[] | null,
  next: TopicMastery[],
  topics: Pick<TopicRef, "id" | "position">[],
): MasteryDiff {
  const before = new Map((previous ?? []).map((m) => [m.topicId, m]));
  const changes: MasteryChange[] = next.map((m) => {
    const old = before.get(m.topicId);
    const delta = m.score - (old?.score ?? 0);
    return {
      topicId: m.topicId,
      from: old?.level ?? "weak",
      to: m.level,
      delta,
      direction: Math.abs(delta) < 1e-9 ? "same" : delta > 0 ? "up" : "down",
    };
  });
  const order = orderWeakestFirst(next, topics);
  const prevOrder = previous ? orderWeakestFirst(previous, topics) : [];
  const weakest = order.find((m) => m.level !== "strong");
  const prevWeakest = prevOrder.find((m) => m.level !== "strong");
  const meaningful =
    !previous ||
    changes.some((c) => Math.abs(c.delta) >= MEANINGFUL_DELTA || c.from !== c.to) ||
    weakest?.topicId !== prevWeakest?.topicId;
  return { changes, meaningful, nextFocus: weakest?.topicId ?? null };
}

/** Deterministic one-sentence summary, used when Gemini is unavailable. */
export function fallbackChangeSummary(diff: MasteryDiff, names: Record<string, string>): string {
  const moved = diff.changes.filter((c) => c.from !== c.to).sort((a, b) => b.delta - a.delta);
  const parts = moved.slice(0, 2).map((c) => `${names[c.topicId]} moved from ${c.from} to ${c.to}`);
  const focus = diff.nextFocus
    ? `next focus is ${names[diff.nextFocus]}`
    : "every topic is now strong";
  return `${parts.length ? `${parts.join(" and ")}; ` : ""}${focus}.`.replace(/^./, (c) =>
    c.toUpperCase(),
  );
}
