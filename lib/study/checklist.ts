export type StepKind = "lesson" | "exercise" | "quiz" | "notes";

export interface ChecklistStep {
  key: string;
  topicId: string;
  kind: StepKind;
  label: string;
  done: boolean;
  /** Where the student goes to do it. */
  href: string;
}

export interface ChecklistInput {
  courseId: string;
  topics: { id: string; name: string }[];
  exercises: { id: string; topicId: string; prompt: string; practice?: boolean }[];
  passedExerciseIds: ReadonlySet<string>;
  /** Topics that appeared in at least one completed quiz. */
  quizzedTopicIds: ReadonlySet<string>;
  /** Topics with a recorded "lesson" / "notes" study event. */
  lessonTopicIds: ReadonlySet<string>;
  notesTopicIds: ReadonlySet<string>;
  /** Plan order, weakest first. Topics not in the plan follow in course order. */
  planOrder?: string[];
}

const short = (text: string, max = 70) => (text.length > max ? `${text.slice(0, max - 1)}…` : text);

/** Study steps come from what the student really did, so nothing can be ticked by hand and drift from the truth. */
export function deriveSteps(input: ChecklistInput): ChecklistStep[] {
  const rank = new Map((input.planOrder ?? []).map((id, i) => [id, i]));
  const ordered = [...input.topics].sort(
    (a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999),
  );
  return ordered.flatMap((t) => {
    const steps: ChecklistStep[] = [
      {
        key: `lesson:${t.id}`,
        topicId: t.id,
        kind: "lesson",
        label: `Watch the lesson: ${t.name}`,
        done: input.lessonTopicIds.has(t.id),
        href: `/learn/${t.id}`,
      },
      {
        key: `notes:${t.id}`,
        topicId: t.id,
        kind: "notes",
        label: `Read the revision notes: ${t.name}`,
        done: input.notesTopicIds.has(t.id),
        href: `/course/${input.courseId}/notes#${t.id}`,
      },
    ];
    for (const e of input.exercises.filter((x) => x.topicId === t.id)) {
      steps.push({
        key: `exercise:${e.id}`,
        topicId: t.id,
        kind: "exercise",
        label: `${e.practice ? "Answer the practice question" : "Pass the exercise"}: ${short(e.prompt)}`,
        done: input.passedExerciseIds.has(e.id),
        href: `/learn/${t.id}`,
      });
    }
    steps.push({
      key: `quiz:${t.id}`,
      topicId: t.id,
      kind: "quiz",
      label: `Answer quiz questions on ${t.name}`,
      done: input.quizzedTopicIds.has(t.id),
      href: `/course/${input.courseId}/quizzes`,
    });
    return steps;
  });
}

export function progressOf(steps: { done: boolean }[]): {
  done: number;
  total: number;
  pct: number;
} {
  const done = steps.filter((s) => s.done).length;
  return {
    done,
    total: steps.length,
    pct: steps.length ? Math.round((done / steps.length) * 100) : 0,
  };
}
