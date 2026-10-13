"use client";

import * as React from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney } from "@/lib/money";
import { useReducedMotion } from "framer-motion";

/*
 * Single-series charts: one hue (reference categorical slot 1, stepped separately for light/dark),
 * recessive grid, axis text in muted ink, hover tooltip on every chart. No legend for one series —
 * the card title names it.
 */
/** SVG presentation attributes can't resolve CSS variables, so read the token's computed value. */
function useSeriesColor() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [color, setColor] = React.useState("#2a78d6");
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => setColor(getComputedStyle(el).getPropertyValue("--chart-series-1").trim() || "#2a78d6");
    read();
    // Re-read when the admin theme class toggles (light/dark).
    const root = el.closest(".admin-theme");
    const mo = root ? new MutationObserver(read) : null;
    if (root) mo!.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => mo?.disconnect();
  }, []);
  return { ref, color };
}

function ChartTooltip({ active, payload, label, money }: { active?: boolean; payload?: { value: number }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  const v = payload[0].value;
  return (
    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-[12px] shadow-lg">
      <p className="text-muted-foreground">{label && /^\d{4}-\d{2}-\d{2}$/.test(label) ? new Date(label).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : label}</p>
      <p className="font-semibold tabular text-foreground">{money ? formatMoney(v) : v.toLocaleString("en-IN")}</p>
    </div>
  );
}

const axisTick = { fill: "var(--muted-foreground)", fontSize: 11 };
const shortDate = (d: string) => new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
const shortMoney = (v: number) => (v >= 10_000_000 ? `৳${(v / 10_000_000).toFixed(1)}L` : v >= 100_000 ? `৳${Math.round(v / 100_000)}k` : `৳${Math.round(v / 100)}`);

export function TrendChart({ data, dataKey, money, height = 260 }: { data: { date: string; [k: string]: number | string }[]; dataKey: string; money?: boolean; height?: number }) {
  const id = React.useId().replace(/:/g, "");
  const { ref, color: SERIES } = useSeriesColor();
  return (
    <div ref={ref} style={{ height }} className="chart-root">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={SERIES} stopOpacity={0.22} />
              <stop offset="100%" stopColor={SERIES} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="0" />
          <XAxis dataKey="date" tickFormatter={shortDate} tick={axisTick} tickLine={false} axisLine={false} minTickGap={28} />
          <YAxis tickFormatter={money ? shortMoney : (v) => String(v)} tick={axisTick} tickLine={false} axisLine={false} width={52} allowDecimals={false} />
          <Tooltip content={<ChartTooltip money={money} />} cursor={{ stroke: "var(--muted-foreground)", strokeDasharray: "3 3" }} />
          <Area type="monotoneX" dataKey={dataKey} stroke={SERIES} strokeWidth={2} fill={`url(#g${id})`} activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface)" }} isAnimationActive />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsChart({ data, money, height = 240, layout = "horizontal" }: { data: { label: string; value: number }[]; money?: boolean; height?: number; layout?: "horizontal" | "vertical" }) {
  const { ref, color: SERIES } = useSeriesColor();
  return (
    <div ref={ref} style={{ height }} className="chart-root">
      <ResponsiveContainer width="100%" height="100%">
        {layout === "vertical" ? (
          <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, bottom: 0, left: 0 }} barCategoryGap={6}>
            <CartesianGrid horizontal={false} stroke="var(--border)" />
            <XAxis type="number" tick={axisTick} tickLine={false} axisLine={false} tickFormatter={money ? shortMoney : undefined} allowDecimals={false} />
            <YAxis type="category" dataKey="label" tick={axisTick} tickLine={false} axisLine={false} width={120} />
            <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" fill={SERIES} radius={[0, 4, 4, 0]} maxBarSize={22} />
          </BarChart>
        ) : (
          <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }} barCategoryGap="22%">
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={false} interval={0} />
            <YAxis tick={axisTick} tickLine={false} axisLine={false} width={40} allowDecimals={false} tickFormatter={money ? shortMoney : undefined} />
            <Tooltip content={<ChartTooltip money={money} />} cursor={{ fill: "var(--muted)" }} />
            <Bar dataKey="value" fill={SERIES} radius={[4, 4, 0, 0]} maxBarSize={36} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

/** Animated number for stat tiles (respects reduced motion). */
export function AnimatedNumber({ value, format }: { value: number; format: "money" | "int" | "pct" }) {
  const [shown, setShown] = React.useState(value);
  const prev = React.useRef(0);
  const reduce = useReducedMotion();
  React.useEffect(() => {
    if (reduce) return;
    const from = prev.current;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / 700);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(Math.round(from + (value - from) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else prev.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);
  const display = reduce ? value : shown;
  if (format === "money") return <>{formatMoney(display)}</>;
  if (format === "pct") return <>{(display / 10).toFixed(1)}%</>;
  return <>{display.toLocaleString("en-IN")}</>;
}
