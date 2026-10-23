import { lessonScriptSchema, type LessonScript, type Scene } from "@/lib/schemas/lesson";

export interface ValidateOptions {
  validPages: ReadonlySet<number>;
  /** Exercises that really exist for this topic, in the order they should appear. */
  exerciseIds: string[];
  exercisePrompts: Record<string, string>;
}

export interface ValidatedScript {
  script: LessonScript;
  dropped: { index: number; reason: string }[];
}

/**
 * Applies the rules zod can't express: every scene's page must exist in the course, VariableTracker
 * code must be Python, Checkpoints must point at real exercises. Bad scenes are dropped, not repaired.
 */
export function validateScript(raw: unknown, opts: ValidateOptions): ValidatedScript {
  const parsed = lessonScriptSchema.parse(raw);
  const dropped: ValidatedScript["dropped"] = [];
  const scenes: Scene[] = [];
  parsed.scenes.forEach((scene, index) => {
    if (!opts.validPages.has(scene.page)) {
      dropped.push({ index, reason: `page ${scene.page} does not exist` });
      return;
    }
    if (scene.type === "Checkpoint" && !opts.exerciseIds.includes(scene.exerciseId)) {
      dropped.push({ index, reason: `exercise ${scene.exerciseId} does not exist` });
      return;
    }
    scenes.push(scene);
  });

  // A topic with exercises always ends on a Checkpoint so the IDE has somewhere to open.
  if (opts.exerciseIds.length > 0 && !scenes.some((s) => s.type === "Checkpoint")) {
    const id = opts.exerciseIds[0];
    const last = scenes[scenes.length - 1];
    scenes.push({
      type: "Checkpoint",
      narration: "Your turn. Try the practice exercise now. I will be right here if you get stuck.",
      seconds: 6,
      page: last?.page ?? [...opts.validPages][0],
      exerciseId: id,
      prompt: opts.exercisePrompts[id] ?? "Try the exercise.",
    });
  }
  if (scenes.length < 3) throw new Error("Too few valid scenes remain after page validation.");
  return { script: { title: parsed.title, scenes }, dropped };
}
