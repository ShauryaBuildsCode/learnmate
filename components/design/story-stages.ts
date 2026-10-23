import {
  Bot,
  BookOpenText,
  Code2,
  Globe,
  ListChecks,
  Network,
  PlayCircle,
  Trophy,
  Upload,
  type LucideIcon,
} from "lucide-react";

export interface StoryStage {
  id: string;
  /** Short stepper label. */
  label: string;
  icon: LucideIcon;
  /** Falling headline on the left. */
  title: string;
  body: string;
  /** Ambient light: three brand colours, remixed per stage. */
  glow: [string, string, string];
}

const b1 = "var(--brand-1)";
const b2 = "var(--brand-2)";
const b3 = "var(--brand-3)";

/** One authoritative list: copy, stepper, renderer and lighting all read from it. */
export const STORY_STAGES: readonly StoryStage[] = [
  {
    id: "upload",
    label: "Upload",
    icon: Upload,
    title: "Start with your own notes.",
    body: "Drop in a PDF chapter or paste your notes. LearnMate works from what you actually have to learn.",
    glow: [b1, b2, b3],
  },
  {
    id: "read",
    label: "Read",
    icon: BookOpenText,
    title: "Watch a PDF get understood.",
    body: "Every page is read and tagged. Key passages are highlighted and linked to the page they came from.",
    glow: [b2, b1, b3],
  },
  {
    id: "map",
    label: "Map",
    icon: Network,
    title: "Turn it into a mind map.",
    body: "Concepts become a connected map. Click one, like Loops, to see how it works. Switch subject to see another map.",
    glow: [b1, b3, b2],
  },
  {
    id: "quiz",
    label: "Quiz",
    icon: ListChecks,
    title: "Discover what you don't know.",
    body: "A short diagnostic, with every question checked against your material, shows which topics are weak.",
    glow: [b3, b2, b1],
  },
  {
    id: "learn",
    label: "Learn",
    icon: PlayCircle,
    title: "See the idea run.",
    body: "Step through code one line at a time, with the variable, the flow and the output changing together.",
    glow: [b2, b3, b1],
  },
  {
    id: "web",
    label: "Web",
    icon: Globe,
    title: "Watch markup become a page.",
    body: "HTML builds a tree of elements. CSS declarations restyle it one rule at a time. Illustrative example.",
    glow: [b1, b2, b3],
  },
  {
    id: "code",
    label: "Code",
    icon: Code2,
    title: "Don't just watch. Build.",
    body: "Write real code beside the lesson, run it, and check it against hidden tests.",
    glow: [b3, b1, b2],
  },
  {
    id: "guru",
    label: "Guru",
    icon: Bot,
    title: "Get unstuck. Learn why.",
    body: "Guru sees your code and test results, then asks the question that gets you to the fix.",
    glow: [b2, b1, b3],
  },
  {
    id: "mastery",
    label: "Mastery",
    icon: Trophy,
    title: "See how far you've come.",
    body: "Passed exercises lift topic mastery, and the plan updates to show what to learn next.",
    glow: [b1, b2, b3],
  },
] as const;

/** Stages whose scene follows the subject switcher. */
export const SUBJECT_STAGES: readonly number[] = [2, 4];
