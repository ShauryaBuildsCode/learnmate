/** The choices offered at sign-up. Stored on the profile and used to personalise every AI. */
export const GOALS = [
  { id: "exam", label: "Prepare for an exam" },
  { id: "school", label: "Keep up with school or college" },
  { id: "job", label: "Learn for a job or career" },
  { id: "project", label: "Build a project" },
  { id: "curiosity", label: "Curiosity" },
] as const;

export const LEVELS = [
  { id: "beginner", label: "Beginner", hint: "I'm just starting" },
  { id: "intermediate", label: "Some experience", hint: "I know the basics" },
  { id: "advanced", label: "Advanced", hint: "I want depth" },
] as const;

export const DAILY_MINUTES = [15, 30, 60, 90] as const;

export const INTEREST_SUGGESTIONS = [
  "Python",
  "JavaScript",
  "React",
  "Data structures",
  "Maths",
  "Science",
  "History",
  "Languages",
  "Business",
] as const;

export type GoalId = (typeof GOALS)[number]["id"];
export type LevelId = (typeof LEVELS)[number]["id"];

export interface SignupPreferences {
  goal: GoalId | null;
  level: LevelId | null;
  interests: string;
  dailyMinutes: number | null;
  uiLang: "en" | "hi";
}
