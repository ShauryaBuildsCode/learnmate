import {
  ArrowRight,
  Building2,
  Clock,
  Key,
  List,
  Map,
  Music,
  Package,
  Repeat,
  ShoppingCart,
  Ticket,
} from "lucide-react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Scene } from "@/lib/schemas/lesson";
import { PALETTE, SceneFrame } from "./common";

type Props = { scene: Extract<Scene, { type: "Analogy" }> };

const ICONS = {
  repeat: Repeat,
  package: Package,
  list: List,
  key: Key,
  map: Map,
  clock: Clock,
  ticket: Ticket,
  building: Building2,
  music: Music,
  "shopping-cart": ShoppingCart,
} as const;

export function Analogy({ scene }: Props) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const Icon = ICONS[scene.icon];
  const pop = spring({ frame: frame - 4, fps, config: { damping: 12 } });
  const arrow = interpolate(frame, [22, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <SceneFrame label="Think of it like this" page={scene.page} narration={scene.narration}>
      <div style={{ display: "flex", gap: 56, alignItems: "center", height: "100%" }}>
        <div
          style={{
            width: 240,
            height: 240,
            borderRadius: "50%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: `radial-gradient(circle, ${PALETTE.accent}55, transparent 70%)`,
            border: `3px solid ${PALETTE.accent}`,
            transform: `scale(${pop}) rotate(${(1 - pop) * -25}deg)`,
          }}
        >
          <Icon size={120} color={PALETTE.text} strokeWidth={1.6} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 34 }}>
            <div
              style={{
                padding: "14px 24px",
                borderRadius: 14,
                background: PALETTE.card,
                border: `1px solid ${PALETTE.cardBorder}`,
                fontSize: 32,
                color: PALETTE.accent,
              }}
            >
              {scene.concept}
            </div>
            <ArrowRight
              size={40}
              color={PALETTE.accent2}
              style={{ opacity: arrow, transform: `translateX(${(1 - arrow) * -14}px)` }}
            />
            <div
              style={{
                padding: "14px 24px",
                borderRadius: 14,
                background: "rgba(52,211,153,0.15)",
                border: `1px solid ${PALETTE.accent2}`,
                fontSize: 32,
                opacity: arrow,
              }}
            >
              {scene.realLife}
            </div>
          </div>
          {scene.bullets.map((b, i) => {
            const s = spring({ frame: frame - (44 + i * 16), fps, config: { damping: 14 } });
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  gap: 14,
                  alignItems: "center",
                  fontSize: 30,
                  marginBottom: 16,
                  opacity: s,
                  transform: `translateX(${(1 - s) * 40}px)`,
                }}
              >
                <span
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    background: PALETTE.warn,
                    flexShrink: 0,
                  }}
                />
                {b}
              </div>
            );
          })}
        </div>
      </div>
    </SceneFrame>
  );
}
