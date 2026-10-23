import type { Provider } from "@/components/ui/provider-badge";

export type { Provider };

export class AiOutputError extends Error {
  constructor(task: string, detail: string) {
    super(`The ${task} response could not be understood (${detail}).`);
    this.name = "AiOutputError";
  }
}

export interface TutorTurn {
  role: "user" | "assistant";
  content: string;
}

export type TutorEvent =
  | { type: "meta"; provider: Provider; fallbackNote?: string; reset?: boolean }
  | { type: "delta"; text: string };
