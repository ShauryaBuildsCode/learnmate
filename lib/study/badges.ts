export interface BadgeInput {
  courses: number;
  quizzes: number;
  perfectQuiz: boolean;
  exercisesPassed: number;
  tutorQuestions: number;
  currentStreak: number;
  longestStreak: number;
  studySteps: number;
  strongTopics: number;
}

export interface Badge {
  id: string;
  title: string;
  description: string;
  earned: boolean;
  /** Progress toward the badge, e.g. "2 / 3", shown while it is still locked. */
  progress?: string;
}

const of = (value: number, goal: number) => `${Math.min(value, goal)} / ${goal}`;

/** Milestones derived from what the student has really done; nothing is stored, so they can never drift. */
export function computeBadges(i: BadgeInput): Badge[] {
  return [
    {
      id: "first-course",
      title: "First chapter",
      description: "Build your first course",
      earned: i.courses >= 1,
      progress: of(i.courses, 1),
    },
    {
      id: "first-quiz",
      title: "Quiz taker",
      description: "Finish a quiz",
      earned: i.quizzes >= 1,
      progress: of(i.quizzes, 1),
    },
    {
      id: "perfect",
      title: "Perfect score",
      description: "Get every question right in a quiz",
      earned: i.perfectQuiz,
    },
    {
      id: "coder",
      title: "Practice makes progress",
      description: "Pass 5 exercises or practice questions",
      earned: i.exercisesPassed >= 5,
      progress: of(i.exercisesPassed, 5),
    },
    {
      id: "asker",
      title: "Curious mind",
      description: "Ask Guru 10 questions",
      earned: i.tutorQuestions >= 10,
      progress: of(i.tutorQuestions, 10),
    },
    {
      id: "streak-3",
      title: "On a roll",
      description: "Study 3 days in a row",
      earned: i.longestStreak >= 3,
      progress: of(i.longestStreak, 3),
    },
    {
      id: "streak-7",
      title: "Week warrior",
      description: "Study 7 days in a row",
      earned: i.longestStreak >= 7,
      progress: of(i.longestStreak, 7),
    },
    {
      id: "explorer",
      title: "Explorer",
      description: "Open 5 lessons, notes or mind maps",
      earned: i.studySteps >= 5,
      progress: of(i.studySteps, 5),
    },
    {
      id: "strong",
      title: "Topic mastered",
      description: "Reach strong mastery in a topic",
      earned: i.strongTopics >= 1,
      progress: of(i.strongTopics, 1),
    },
  ];
}
