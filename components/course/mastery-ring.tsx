/** A circular gauge for a 0-100 value; null renders an empty ring with a dash. */
export function MasteryRing({ value, size = 96 }: { value: number | null; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = value ?? 0;
  return (
    <div
      role="img"
      aria-label={value === null ? "No mastery yet" : `${value} percent mastery`}
      className="relative shrink-0"
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct / 100)}
          className="transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-xl font-semibold tracking-tight">
          {value === null ? "–" : `${value}%`}
        </span>
        <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">
          mastery
        </span>
      </span>
    </div>
  );
}
