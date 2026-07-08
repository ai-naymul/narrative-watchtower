"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, ShieldAlert, ArrowRight } from "lucide-react";
import { Card, CardBody, Badge, RiskBadge, Sparkline } from "@/components/ui";
import { trackLabel } from "@/lib/utils";
import type { RiskLevel } from "@/lib/types";

export interface NarrativeItem {
  id: string;
  title: string;
  summary: string;
  track: string;
  score: number;
  level: RiskLevel;
  tags: string[];
  spark: number[];
  docCount: number;
  fcCount: number;
}

const TRACKS = [
  "all",
  "india_bangladesh",
  "communal_misinfo",
  "national_security",
  "internal_politics",
  "foreign_framing",
];

export function NarrativeList({ items }: { items: NarrativeItem[] }) {
  const [track, setTrack] = useState("all");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) c[it.track] = (c[it.track] || 0) + 1;
    return c;
  }, [items]);

  const filtered = useMemo(
    () =>
      (track === "all" ? items : items.filter((i) => i.track === track)).sort(
        (a, b) => b.score - a.score
      ),
    [items, track]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {TRACKS.map((t) => {
          const active = track === t;
          const n = t === "all" ? items.length : counts[t] || 0;
          return (
            <button
              key={t}
              onClick={() => setTrack(t)}
              className={
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors " +
                (active
                  ? "border-accent/50 bg-accent/15 text-accent"
                  : "border-border bg-surface text-muted hover:text-fg hover:border-border-strong")
              }
            >
              {t === "all" ? "All narratives" : trackLabel(t)}{" "}
              <span className="ml-1 font-mono tabular-nums opacity-70">{n}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {filtered.map((n) => (
          <Link key={n.id} href={`/narratives/${n.id}`} className="group">
            <Card className="flex h-full flex-col transition-colors hover:border-border-strong hover:bg-elevated/70">
              <CardBody className="flex flex-1 flex-col gap-3">
                <div className="flex items-center justify-between gap-2">
                  <Badge tone="info">{trackLabel(n.track)}</Badge>
                  <RiskBadge level={n.level} />
                </div>
                <div>
                  <h3 className="font-medium leading-snug text-fg group-hover:text-accent-2">
                    {n.title}
                  </h3>
                  <p className="mt-1.5 line-clamp-2 text-sm text-muted">{n.summary}</p>
                </div>
                <div className="mt-auto flex items-end justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 text-xs text-faint">
                    <span className="inline-flex items-center gap-1">
                      <FileText className="h-3 w-3" /> {n.docCount}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <ShieldAlert className="h-3 w-3" /> {n.fcCount} fact-checks
                    </span>
                    <span className="font-mono text-muted">risk {n.score}</span>
                  </div>
                  <Sparkline data={n.spark} />
                </div>
              </CardBody>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
