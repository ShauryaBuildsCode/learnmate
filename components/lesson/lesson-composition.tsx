import { AbsoluteFill, Series } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import type { TimedScene } from "@/lib/lesson/timing";
import { Analogy } from "./scenes/analogy";
import { Checkpoint } from "./scenes/checkpoint";
import { CodeReveal } from "./scenes/code-reveal";
import { FlowDiagram } from "./scenes/flow-diagram";
import { TitleCard } from "./scenes/title-card";
import { VariableTracker } from "./scenes/variable-tracker";

function SceneRenderer({ scene }: { scene: Scene }) {
  switch (scene.type) {
    case "TitleCard":
      return <TitleCard scene={scene} />;
    case "CodeReveal":
      return <CodeReveal scene={scene} />;
    case "VariableTracker":
      return <VariableTracker scene={scene} />;
    case "FlowDiagram":
      return <FlowDiagram scene={scene} />;
    case "Analogy":
      return <Analogy scene={scene} />;
    case "Checkpoint":
      return <Checkpoint scene={scene} />;
  }
}

export type LessonCompositionProps = { timed: TimedScene[] };

/** The whole lesson as one Remotion composition: one Series sequence per scene. */
export function LessonComposition({ timed }: LessonCompositionProps) {
  return (
    <AbsoluteFill style={{ background: "#0b1020" }}>
      <Series>
        {timed.map((t, i) => (
          <Series.Sequence key={i} durationInFrames={t.frames}>
            <SceneRenderer scene={t.scene} />
          </Series.Sequence>
        ))}
      </Series>
    </AbsoluteFill>
  );
}
