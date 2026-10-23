import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "@/lib/motion";
import { FONT, MONO, PALETTE } from "@/components/lesson/scenes/kit";
import { Card, IconTile, lerp, Reveal, useSquash, useTween } from "@/components/lesson/scenes/kit";
import type { ReactNode } from "react";

export interface Profile {
  name: string;
  goal: string | null;
  level: string | null;
  interests: string;
  minutes: number | null;
  /** True when the learner's interests suggest coding, so the practice scene shows an editor instead of a quiz. */
  codey: boolean;
  /** JavaScript / web interests: the practice scene shows JavaScript instead of Python. */
  web: boolean;
}

const pct = (frame: number, a: number, b: number, easing = Easing.expoOut) =>
  interpolate(frame, [a, b], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });

/** Shared chrome: warm canvas, drifting dots, a big headline slot and a caption. */
export function Frame({ children, caption }: { children: ReactNode; caption: string }) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const exit = pct(frame, durationInFrames - 12, durationInFrames - 2, Easing.inOutQuart);
  const enter = pct(frame, 0, 16);
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        background: PALETTE.bg,
        fontFamily: FONT,
        color: PALETTE.ink,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "radial-gradient(rgba(17,17,17,0.075) 1.6px, transparent 1.6px)",
          backgroundSize: "38px 38px",
          backgroundPosition: `${-frame * 0.3}px ${-frame * 0.18}px`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          padding: "70px 90px 190px",
          opacity: 1 - exit,
          transform: `scale(${lerp(1.04, 1, enter) * (1 - exit * 0.03)})`,
        }}
      >
        {children}
      </div>
      <div
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          bottom: 70,
          textAlign: "center",
          fontSize: 34,
          fontWeight: 600,
          lineHeight: 1.35,
          opacity: pct(frame, 8, 26),
          transform: `translateY(${lerp(14, 0, pct(frame, 8, 26))}px)`,
        }}
      >
        {caption}
      </div>
    </div>
  );
}

const Headline = ({
  children,
  delay = 0,
  size = 112,
}: {
  children: string;
  delay?: number;
  size?: number;
}) => (
  <div
    style={{ display: "flex", flexWrap: "wrap", columnGap: size * 0.26, justifyContent: "center" }}
  >
    {children.split(" ").map((w, i) => (
      <Reveal key={i} delay={delay + i * 5} duration={22}>
        <span style={{ fontSize: size, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05 }}>
          {w}
        </span>
      </Reveal>
    ))}
  </div>
);

const center = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  justifyContent: "center",
  gap: 36,
} as const;

export function Welcome({ p }: { p: Profile }) {
  const pop = useSquash(2, { damping: 8, stiffness: 120 });
  return (
    <Frame caption="Your personal teacher for any chapter you can upload.">
      <div style={center}>
        <div
          style={{
            transform: `scale(${pop.sx * pop.p}, ${pop.sy * pop.p}) rotate(${lerp(-40, 0, Math.min(1, pop.p))}deg)`,
          }}
        >
          <IconTile icon="lightbulb" tone="orange" size={150} />
        </div>
        <Headline delay={10}>{`Hi ${p.name}`}</Headline>
        <Headline delay={20} size={64}>
          Let&apos;s make it stick.
        </Headline>
      </div>
    </Frame>
  );
}

export function Upload({ p }: { p: Profile }) {
  const frame = useCurrentFrame();
  const doc = pct(frame, 6, 34);
  const split = pct(frame, 40, 70, Easing.inOutQuart);
  const topics = p.codey
    ? ["Variables", "Loops", "Functions", "Arrays"]
    : ["Key ideas", "Definitions", "Examples", "Quiz"];
  return (
    <Frame caption="Drop in a PDF or paste your notes. LearnMate finds the topics.">
      <div style={{ ...center, gap: 0, position: "relative" }}>
        <div
          style={{
            position: "absolute",
            transform: `translateY(${lerp(-340, 0, doc) - split * 120}px) rotate(${lerp(-14, 0, doc)}deg) scale(${1 - split * 0.25})`,
            opacity: 1 - split * 0.15,
          }}
        >
          <Card style={{ width: 300, height: 380, padding: 28 }}>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 18 }}>Chapter 4</div>
            {[0.9, 0.75, 0.85, 0.5, 0.8, 0.65, 0.7].map((w, i) => (
              <div
                key={i}
                style={{
                  height: 14,
                  width: `${w * 100}%`,
                  borderRadius: 7,
                  background: "rgba(17,17,17,0.1)",
                  marginBottom: 14,
                }}
              />
            ))}
          </Card>
        </div>
        <div style={{ display: "flex", gap: 22, marginTop: 250 }}>
          {topics.map((t, i) => {
            const t0 = pct(frame, 56 + i * 8, 80 + i * 8, Easing.backOut);
            return (
              <div
                key={t}
                style={{
                  opacity: Math.min(1, t0 * 2),
                  transform: `translateY(${lerp(60, 0, t0)}px) scale(${lerp(0.7, 1, t0)})`,
                }}
              >
                <Card
                  tone={i % 2 ? "white" : "black"}
                  style={{ padding: "20px 34px", fontSize: 36, fontWeight: 800 }}
                >
                  {t}
                </Card>
              </div>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

export function Lessons() {
  const frame = useCurrentFrame();
  const bars = [0.5, 0.8, 0.35, 0.95, 0.6];
  const progress = pct(frame, 14, 120, Easing.smooth);
  return (
    <Frame caption="Animated, narrated lessons, built from your own pages.">
      <div style={center}>
        <div style={{ transform: `scale(${lerp(0.9, 1, pct(frame, 0, 24))})` }}>
          <Card style={{ width: 860, padding: 34 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 28 }}>
              <IconTile icon="repeat" tone="orange" size={72} />
              <div style={{ fontSize: 44, fontWeight: 800, letterSpacing: -1 }}>How loops work</div>
            </div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 160 }}>
              {bars.map((b, i) => {
                const g = pct(frame, 24 + i * 8, 52 + i * 8, Easing.backOut);
                return (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${b * 100 * g}%`,
                      background: i % 2 ? PALETTE.ink : PALETTE.orange,
                      borderRadius: 14,
                    }}
                  />
                );
              })}
            </div>
            <div
              style={{
                marginTop: 26,
                height: 10,
                borderRadius: 5,
                background: "rgba(17,17,17,0.1)",
              }}
            >
              <div
                style={{
                  width: `${progress * 100}%`,
                  height: "100%",
                  borderRadius: 5,
                  background: PALETTE.orange,
                }}
              />
            </div>
          </Card>
        </div>
      </div>
    </Frame>
  );
}

export function Practice({ p }: { p: Profile }) {
  const frame = useCurrentFrame();
  const code = p.web
    ? "const total = (nums) =>\n  nums.reduce((a, b) => a + b, 0);"
    : "def total(nums):\n    return sum(nums)";
  const typed = Math.floor(pct(frame, 16, 70, Easing.smooth) * code.length);
  const tick = pct(frame, 78, 96, Easing.backOut);
  if (p.codey)
    return (
      <Frame caption="Practise in a real editor beside the lesson. Tests tell you instantly.">
        <div style={center}>
          <Card tone="black" style={{ width: 820, padding: 34 }}>
            <pre
              style={{
                margin: 0,
                fontFamily: MONO,
                fontSize: 38,
                lineHeight: 1.5,
                color: "#fff",
                minHeight: 120,
              }}
            >
              {code.slice(0, typed)}
              <span style={{ opacity: frame % 20 < 10 ? 1 : 0 }}>▌</span>
            </pre>
            <div
              style={{
                marginTop: 22,
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 30,
                fontWeight: 700,
                color: "#4ade80",
                opacity: tick,
                transform: `translateY(${lerp(14, 0, tick)}px)`,
              }}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  background: "#16a34a",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#fff",
                }}
              >
                ✓
              </span>
              3 of 3 tests passed
            </div>
          </Card>
        </div>
      </Frame>
    );
  const picked = pct(frame, 56, 72, Easing.backOut);
  const options = ["Evaporation", "Condensation", "Precipitation", "Collection"];
  return (
    <Frame caption="Practise with interactive questions that check your answer instantly.">
      <div style={center}>
        <Card style={{ width: 860, padding: 34 }}>
          <div style={{ fontSize: 36, fontWeight: 800, marginBottom: 22 }}>
            Which stage turns vapour into clouds?
          </div>
          {options.map((o, i) => {
            const enter = pct(frame, 12 + i * 7, 34 + i * 7);
            const right = i === 1;
            return (
              <div
                key={o}
                style={
                  {
                    opacity: enter,
                    transform: `translateX(${lerp(50, 0, enter)}px)`,
                    padding: "16px 22px",
                    marginBottom: 12,
                    borderRadius: 18,
                    fontSize: 30,
                    fontWeight: 600,
                    border: `2px solid ${right && picked > 0.3 ? "#16a34a" : "rgba(17,17,17,0.12)"}`,
                    background: right && picked > 0.3 ? "rgba(22,163,74,0.12)" : "#fff",
                  } as React.CSSProperties
                }
              >
                {o}
              </div>
            );
          })}
        </Card>
      </div>
    </Frame>
  );
}

export function Guru() {
  const frame = useCurrentFrame();
  const bubble = (at: number) => pct(frame, at, at + 22, Easing.backOut);
  const q = bubble(8);
  const dots = frame > 34 && frame < 58;
  const a = bubble(58);
  return (
    <Frame caption="Guru sees your work and teaches. It never just hands you the answer.">
      <div style={{ ...center, alignItems: "stretch", padding: "0 120px", gap: 26 }}>
        <div
          style={{
            alignSelf: "flex-end",
            opacity: Math.min(1, q * 2),
            transform: `scale(${lerp(0.6, 1, q)}) translateY(${lerp(30, 0, q)}px)`,
            transformOrigin: "bottom right",
          }}
        >
          <Card
            tone="black"
            style={{ padding: "22px 30px", fontSize: 32, fontWeight: 600, borderRadius: 30 }}
          >
            Why does my loop stop one early?
          </Card>
        </div>
        <div
          style={{ alignSelf: "flex-start", display: "flex", gap: 18, alignItems: "flex-start" }}
        >
          <IconTile icon="lightbulb" tone="orange" size={64} />
          {dots ? (
            <Card style={{ padding: "26px 30px", borderRadius: 30, display: "flex", gap: 10 }}>
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: 7,
                    background: PALETTE.ink,
                    opacity: 0.3 + 0.7 * Math.abs(Math.sin(frame / 5 + i)),
                  }}
                />
              ))}
            </Card>
          ) : (
            <div
              style={{
                opacity: Math.min(1, a * 2),
                transform: `scale(${lerp(0.6, 1, a)})`,
                transformOrigin: "top left",
              }}
            >
              <Card
                style={{
                  padding: "22px 30px",
                  fontSize: 32,
                  fontWeight: 600,
                  borderRadius: 30,
                  maxWidth: 640,
                }}
              >
                Look at where range stops. What does it do with its last number?{" "}
                <span
                  style={{
                    fontSize: 22,
                    padding: "3px 14px",
                    borderRadius: 999,
                    background: "rgba(17,17,17,0.08)",
                  }}
                >
                  p. 4
                </span>
              </Card>
            </div>
          )}
        </div>
      </div>
    </Frame>
  );
}

export function Plan({ p }: { p: Profile }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = spring({ frame: frame - 6, fps, config: { damping: 18, stiffness: 60 } });
  const R = 120;
  const C = 2 * Math.PI * R;
  const rows = [
    ["Loops", 0.85],
    ["Lists", 0.55],
    ["Functions", 0.3],
  ] as const;
  return (
    <Frame
      caption={
        p.minutes
          ? `${p.minutes} minutes a day is plenty. Your plan reorders itself as you improve.`
          : "Your plan reorders itself as you improve."
      }
    >
      <div style={{ ...center, flexDirection: "row", gap: 80 }}>
        <div style={{ position: "relative", width: 300, height: 300 }}>
          <svg
            width={300}
            height={300}
            viewBox="0 0 300 300"
            style={{ transform: "rotate(-90deg)" }}
          >
            <circle
              cx={150}
              cy={150}
              r={R}
              fill="none"
              stroke="rgba(17,17,17,0.1)"
              strokeWidth={26}
            />
            <circle
              cx={150}
              cy={150}
              r={R}
              fill="none"
              stroke={PALETTE.orange}
              strokeWidth={26}
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - 0.72 * Math.min(1, v))}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 76,
              fontWeight: 800,
              letterSpacing: -2,
            }}
          >
            {Math.round(72 * Math.min(1, v))}%
          </div>
        </div>
        <div style={{ width: 460 }}>
          {rows.map(([name, val], i) => {
            const g = pct(frame, 16 + i * 10, 56 + i * 10);
            return (
              <div key={name} style={{ marginBottom: 30 }}>
                <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 10 }}>{name}</div>
                <div style={{ height: 22, borderRadius: 11, background: "rgba(17,17,17,0.1)" }}>
                  <div
                    style={{
                      width: `${val * 100 * g}%`,
                      height: "100%",
                      borderRadius: 11,
                      background: i === 2 ? "#dc2626" : i === 1 ? "#f59e0b" : "#16a34a",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Frame>
  );
}

export function Ready({ p }: { p: Profile }) {
  const pop = useSquash(4, { damping: 8, stiffness: 130 });
  const t = useTween(20, 24);
  return (
    <Frame caption="Upload your first chapter and we'll build everything around it.">
      <div style={center}>
        <div style={{ transform: `scale(${pop.sx * pop.p}, ${pop.sy * pop.p})` }}>
          <IconTile icon="rocket" tone="orange" size={150} />
        </div>
        <Headline delay={8}>{`Ready, ${p.name}?`}</Headline>
        <div style={{ fontSize: 34, fontWeight: 600, opacity: t, color: PALETTE.muted }}>
          {p.interests
            ? `We'll start with ${p.interests.split(",")[0].trim()}.`
            : "Your first course is one upload away."}
        </div>
      </div>
    </Frame>
  );
}
