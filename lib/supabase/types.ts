// Hand-maintained mirror of supabase/migrations/0001_init.sql (what `supabase gen types` would emit).
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type ProfileRow = { id: string; display_name: string | null; ui_lang: "en" | "hi" };
export type CourseRow = {
  id: string;
  user_id: string;
  title: string;
  subject: string;
  source_type: "pdf" | "text";
  storage_path: string | null;
  page_count: number;
  created_at: string;
};
export type CoursePageRow = { course_id: string; page_no: number; text: string };
export type TopicRow = {
  id: string;
  course_id: string;
  position: number;
  name: string;
  summary: string;
  pages: number[];
};
export type ExerciseRow = {
  id: string;
  course_id: string;
  topic_id: string;
  language: string;
  prompt: string;
  starter_files: Json;
  tests: Json;
  hints: Json;
  page: number;
};
export type LessonRow = {
  id: string;
  topic_id: string;
  ui_lang: string;
  script: Json;
  created_at: string;
};
export type QuizAttemptRow = {
  id: string;
  user_id: string;
  course_id: string;
  kind: "diagnostic" | "practice";
  questions: Json;
  answers: Json;
  per_topic: Json;
  created_at: string;
};
export type ExerciseRunRow = {
  id: string;
  user_id: string;
  exercise_id: string;
  language: string;
  code: Json;
  passed: boolean;
  results: Json;
  created_at: string;
};
export type PlanRow = {
  id: string;
  user_id: string;
  course_id: string;
  version: number;
  mastery: Json;
  items: Json;
  change_summary: string | null;
  based_on: string;
  created_at: string;
};
export type TutorMessageRow = {
  id: string;
  user_id: string;
  course_id: string;
  role: "user" | "assistant";
  content: string;
  context: Json | null;
  provider: string | null;
  created_at: string;
};
export type HintStateRow = { user_id: string; exercise_id: string; rung: number };

type WithDefaults<Row, Optional extends keyof Row> = Omit<Row, Optional> &
  Partial<Pick<Row, Optional>>;

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfileRow, WithDefaults<ProfileRow, "display_name" | "ui_lang">>;
      courses: Table<CourseRow, WithDefaults<CourseRow, "id" | "storage_path" | "created_at">>;
      course_pages: Table<CoursePageRow, CoursePageRow>;
      topics: Table<TopicRow, WithDefaults<TopicRow, "id" | "pages">>;
      exercises: Table<ExerciseRow, WithDefaults<ExerciseRow, "id">>;
      lessons: Table<LessonRow, WithDefaults<LessonRow, "id" | "ui_lang" | "created_at">>;
      quiz_attempts: Table<QuizAttemptRow, WithDefaults<QuizAttemptRow, "id" | "created_at">>;
      exercise_runs: Table<ExerciseRunRow, WithDefaults<ExerciseRunRow, "id" | "created_at">>;
      plans: Table<PlanRow, WithDefaults<PlanRow, "id" | "change_summary" | "created_at">>;
      tutor_messages: Table<
        TutorMessageRow,
        WithDefaults<TutorMessageRow, "id" | "context" | "provider" | "created_at">
      >;
      hint_state: Table<HintStateRow, WithDefaults<HintStateRow, "rung">>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
