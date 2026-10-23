"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

// Okabe-Ito: distinguishable for common colour-vision differences, readable on light and dark.
const COLORS = ["#0072B2", "#D55E00", "#009E73", "#CC79A7", "#E69F00", "#56B4E9"];
const TOOLTIP = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
};

export function ActivityChart({ data }: { data: { date: string; count: number }[] }) {
  const total = data.reduce((n, d) => n + d.count, 0);
  return (
    <div
      className="h-56 w-full"
      role="img"
      aria-label={`Study activity over the last ${data.length} days: ${total} actions`}
    >
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(d: string) => d.slice(5)}
            stroke="var(--muted-foreground)"
            fontSize={11}
            interval={4}
          />
          <YAxis allowDecimals={false} stroke="var(--muted-foreground)" fontSize={11} />
          <Tooltip contentStyle={TOOLTIP} cursor={{ fill: "var(--muted)" }} />
          <Bar dataKey="count" name="Actions" fill={COLORS[0]} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function ScoreChart({ data }: { data: { label: string; pct: number; kind: string }[] }) {
  return (
    <div className="h-56 w-full" role="img" aria-label="Quiz scores over time, in percent">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis domain={[0, 100]} unit="%" stroke="var(--muted-foreground)" fontSize={11} />
          <Tooltip contentStyle={TOOLTIP} />
          <Line
            type="monotone"
            dataKey="pct"
            name="Score"
            stroke={COLORS[2]}
            strokeWidth={2}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MasteryTrend({
  data,
  courses,
}: {
  data: Record<string, number | string>[];
  courses: string[];
}) {
  return (
    <div
      className="h-56 w-full"
      role="img"
      aria-label="Average mastery per course over time, in percent"
    >
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={11} />
          <YAxis domain={[0, 100]} unit="%" stroke="var(--muted-foreground)" fontSize={11} />
          <Tooltip contentStyle={TOOLTIP} />
          {courses.map((c, i) => (
            <Line
              key={c}
              type="monotone"
              dataKey={c}
              connectNulls
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
