import type { QuizQuestion } from "@/lib/schemas/content";
import type { PerTopicScore } from "@/lib/mastery";

export interface QuestionResult {
  questionId: string;
  correct: boolean;
  correctIndex: number;
  selectedIndex: number;
  explanation: string;
  page: number;
  quote: string;
}

/** Scores answers (aligned to questions by index; -1 means skipped). Done in code, never by a model. */
export function scoreQuiz(
  questions: QuizQuestion[],
  answers: number[],
): { results: QuestionResult[]; perTopic: Record<string, PerTopicScore>; correct: number } {
  const perTopic: Record<string, PerTopicScore> = {};
  const results = questions.map((q, i) => {
    const selectedIndex = answers[i] ?? -1;
    const correct = selectedIndex === q.correctIndex;
    const t = (perTopic[q.topicId] ??= { correct: 0, total: 0 });
    t.total += 1;
    if (correct) t.correct += 1;
    return {
      questionId: q.id,
      correct,
      correctIndex: q.correctIndex,
      selectedIndex,
      explanation: q.explanation,
      page: q.page,
      quote: q.quote,
    };
  });
  return { results, perTopic, correct: results.filter((r) => r.correct).length };
}
