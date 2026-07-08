import * as React from "react";
import { cn } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";
import { ShieldAlert, ShieldCheck, Shield } from "lucide-react";

/** Elevated card surface. */
export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-surface/80 backdrop-blur-sm",
        className
      )}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 pt-4 pb-3 border-b border-border", className)} {...props} />;
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

/** Small pill label. */
export function Badge({
  className,
  tone = "default",
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  tone?: "default" | "accent" | "info" | "muted";
}) {
  // Color discipline: neutral by default. Color is reserved for semantic risk
  // (RiskBadge/VerdictBadge) and interactive elements — labels stay quiet.
  const tones = {
    default: "border-border-strong bg-elevated text-fg",
    accent: "border-accent/40 bg-accent/10 text-accent",
    info: "border-border-strong bg-transparent text-fg/80",
    muted: "border-border bg-transparent text-muted",
  } as const;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-medium tracking-wide",
        tones[tone],
        className
      )}
      {...props}
    />
  );
}

/** Risk level badge with semantic color + icon. */
export function RiskBadge({ level, className }: { level: RiskLevel; className?: string }) {
  const map = {
    low: { label: "LOW RISK", color: "text-risk-low border-risk-low/40 bg-risk-low/10", Icon: ShieldCheck },
    medium: { label: "MEDIUM RISK", color: "text-risk-med border-risk-med/40 bg-risk-med/10", Icon: Shield },
    high: { label: "HIGH RISK", color: "text-risk-high border-risk-high/40 bg-risk-high/10", Icon: ShieldAlert },
  } as const;
  const { label, color, Icon } = map[level];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold tracking-wider",
        color,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

/** Fact-check verdict badge — Rumor Scanner taxonomy. */
export function VerdictBadge({ verdict, className }: { verdict?: string | null; className?: string }) {
  const map: Record<string, { label: string; color: string }> = {
    false: { label: "FALSE", color: "text-risk-high border-risk-high/40 bg-risk-high/10" },
    misleading: { label: "MISLEADING", color: "text-risk-med border-risk-med/40 bg-risk-med/10" },
    distorted: { label: "DISTORTED", color: "text-risk-med border-risk-med/40 bg-risk-med/10" },
    unverified: { label: "UNVERIFIED", color: "text-muted border-border-strong bg-elevated" },
    satire: { label: "SATIRE", color: "text-accent-2 border-accent-2/40 bg-accent-2/10" },
    true: { label: "TRUE", color: "text-risk-low border-risk-low/40 bg-risk-low/10" },
  };
  const v = map[(verdict || "unverified").toLowerCase()] ?? map.unverified;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-semibold tracking-wider",
        v.color,
        className
      )}
    >
      {v.label}
    </span>
  );
}

/** KPI tile for the Overview page. */
export function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
}) {
  return (
    <Card className="p-4">
      <div className="text-xs uppercase tracking-wider text-faint">{label}</div>
      <div className="mt-1 font-mono text-2xl font-semibold text-fg tabular-nums">{value}</div>
      {hint ? <div className="mt-1 text-xs text-muted">{hint}</div> : null}
    </Card>
  );
}

/** Standing ethics disclaimer — used across intelligence surfaces. */
export function Disclaimer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-elevated/60 px-3 py-2 text-xs text-muted",
        className
      )}
    >
      <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
      <span>
        Public-source data only. The system detects associations from public posts and
        articles; this does not imply wrongdoing or intent.{" "}
        <span className="text-fg">Human analyst review required.</span>
      </span>
    </div>
  );
}

/** Horizontal ranked bar for "top sources / figures" lists. */
export function RankedBar({
  label,
  value,
  max,
  href,
  suffix,
}: {
  label: string;
  value: number;
  max: number;
  href?: string;
  suffix?: string;
}) {
  const pct = max > 0 ? Math.max(4, Math.round((value / max) * 100)) : 0;
  const inner = (
    <div className="group relative flex items-center gap-3 py-1.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="truncate text-sm text-fg">{label}</span>
          <span className="shrink-0 font-mono text-xs text-muted tabular-nums">
            {value.toLocaleString()}
            {suffix}
          </span>
        </div>
        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full rounded-full bg-accent-2/70 transition-all group-hover:bg-accent-2"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
  return href ? (
    <a href={href} className="block hover:opacity-90">
      {inner}
    </a>
  ) : (
    inner
  );
}

/** Minimal SVG sparkline (server-safe, no deps) for narrative activity over time. */
export function Sparkline({
  data,
  width = 120,
  height = 28,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const step = data.length > 1 ? width / (data.length - 1) : width;
  const pts = data.map((v, i) => [i * step, height - (v / max) * (height - 4) - 2]);
  const line = pts.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg width={width} height={height} className={className} preserveAspectRatio="none">
      <path d={area} fill="hsl(var(--accent-2) / 0.12)" />
      <path d={line} fill="none" stroke="hsl(var(--accent-2))" strokeWidth="1.5" strokeLinejoin="round" />
      {pts.length ? (
        <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="2" fill="hsl(var(--accent-2))" />
      ) : null}
    </svg>
  );
}

export function SectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2 className={cn("font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted", className)}>
      {children}
    </h2>
  );
}
