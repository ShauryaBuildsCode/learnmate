import {
  lessonEnvelopeSchema,
  sceneSchema,
  type LessonScript,
  type Scene,
} from "@/lib/schemas/lesson";

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

const MAX_NARRATION = 600;

/** Light, safe repairs for near-misses the model makes often; anything else is left for validation to reject. */
function repairScene(raw: Record<string, unknown>): Record<string, unknown> {
  const scene = { ...raw };
  // Audio is attached by the server after recording; anything the model wrote there is made up.
  delete scene.audio;
  if (typeof scene.narration === "string" && scene.narration.length > MAX_NARRATION) {
    scene.narration = scene.narration.slice(0, MAX_NARRATION).replace(/\s+\S*$/, "");
  }
  if (typeof scene.seconds === "number") scene.seconds = Math.min(40, Math.max(4, scene.seconds));
  if (scene.type === "Bento" && Array.isArray(scene.cards)) {
    scene.cards = scene.cards.map((card: Record<string, unknown>) => {
      const stat = card.stat as { prefix?: string; suffix?: string } | undefined;
      if (!stat) return card;
      return {
        ...card,
        stat: {
          ...stat,
          prefix: stat.prefix && stat.prefix.length <= 3 ? stat.prefix : undefined,
          suffix: stat.suffix && stat.suffix.length <= 4 ? stat.suffix : undefined,
        },
      };
    });
  }
  return scene;
}

/**
 * Validates scene by scene so one bad scene never costs the whole lesson. A scene is dropped (and reported)
 * when it doesn't match its type, cites a page that doesn't exist, or points a Checkpoint at an unknown
 * exercise. The lesson only fails if fewer than 3 good scenes remain.
 */
export function validateScript(raw: unknown, opts: ValidateOptions): ValidatedScript {
  const envelope = lessonEnvelopeSchema.parse(raw);
  const dropped: ValidatedScript["dropped"] = [];
  const scenes: Scene[] = [];
  envelope.scenes.forEach((candidate, index) => {
    const parsed = sceneSchema.safeParse(repairScene(candidate));
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      dropped.push({
        index,
        reason: `invalid scene (${issue.path.join(".") || "type"}: ${issue.message})`,
      });
      return;
    }
    const scene = parsed.data;
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
  if (scenes.length < 3) throw new Error("Too few valid scenes remain after validation.");
  return { script: { title: envelope.title, scenes }, dropped };
}
