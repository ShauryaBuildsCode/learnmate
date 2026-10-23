import { AbsoluteFill, Series } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import type { TimedScene } from "@/lib/lesson/timing";
import { Analogy } from "./scenes/analogy";
import { ArrayViz } from "./scenes/array-viz";
import { Bento } from "./scenes/bento";
import { Checkpoint } from "./scenes/checkpoint";
import { CodeReveal } from "./scenes/code-reveal";
import { FlowDiagram } from "./scenes/flow-diagram";
import { KeyTerms } from "./scenes/key-terms";
import { RepeatBurst } from "./scenes/repeat-burst";
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
    case "KeyTerms":
      return <KeyTerms scene={scene} />;
    case "Bento":
      return <Bento scene={scene} />;
    case "ArrayViz":
      return <ArrayViz scene={scene} />;
    case "RepeatBurst":
      return <RepeatBurst scene={scene} />;
    case "Checkpoint":
      return <Checkpoint scene={scene} />;
  }
}

export type LessonCompositionProps = { timed: TimedScene[] };

/** The whole lesson as one Remotion composition: one Series sequence per scene. */
export function LessonComposition({ timed }: LessonCompositionProps) {
  return (
    <AbsoluteFill style={{ background: "#fff8f0" }}>
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
