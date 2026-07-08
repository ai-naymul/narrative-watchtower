"use client";

import { useMemo, useState } from "react";
import { Search, ExternalLink, Flame, Users } from "lucide-react";
import { Card, CardBody, Badge, VerdictBadge } from "@/components/ui";
import { formatDate } from "@/lib/utils";

export interface RumorItem {
  id: string;
  title: string;
  verdict: string | null;
  category_tags: string[];
  impact: string | null;
  why: string | null;
  date: string | null;
  url: string | null;
  figures: string[];
}

const FILTERS = [
  { key: "all", label: "All" },
  { key: "false", label: "False" },
  { key: "misleading", label: "Misleading" },
  { key: "unverified", label: "Unverified" },
  { key: "satire", label: "Satire" },
];

export function RumorExplorer({ items }: { items: RumorItem[] }) {
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const it of items) c[it.verdict || "unverified"] = (c[it.verdict || "unverified"] || 0) + 1;
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      if (filter !== "all" && (it.verdict || "unverified") !== filter) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        (it.why || "").toLowerCase().includes(q) ||
        it.figures.some((f) => f.toLowerCase().includes(q)) ||
        it.category_tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [items, filter, query]);

  return (
    <div className="space-y-4">
      {/* controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            const n = f.key === "all" ? items.length : counts[f.key] || 0;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (active
                    ? "border-accent/50 bg-accent/15 text-accent"
                    : "border-border bg-surface text-muted hover:text-fg hover:border-border-strong")
                }
              >
                {f.label} <span className="ml-1 font-mono tabular-nums opacity-70">{n}</span>
              </button>
            );
          })}
        </div>
        <div className="relative sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-faint" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search claims, figures, tags…"
            className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm text-fg placeholder:text-faint outline-none focus:border-accent-2/50"
          />
        </div>
      </div>

      <div className="text-xs text-faint">
        Showing {filtered.length.toLocaleString()} of {items.length.toLocaleString()} fact-checks
      </div>

      {/* list */}
      <div className="space-y-3">
        {filtered.slice(0, 120).map((it) => (
          <Card key={it.id}>
            <CardBody className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <VerdictBadge verdict={it.verdict} />
                {it.impact ? (
                  <Badge tone="muted">
                    <Flame className="h-3 w-3" /> {it.impact} impact
                  </Badge>
                ) : null}
                <span className="ml-auto text-xs text-faint">{formatDate(it.date)}</span>
              </div>
              <h3 className="text-sm font-medium leading-snug text-fg">{it.title}</h3>
              {it.why ? <p className="line-clamp-3 text-sm text-muted">{it.why}</p> : null}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {it.category_tags.slice(0, 4).map((t) => (
                  <Badge key={t} tone="muted">
                    {t}
                  </Badge>
                ))}
                {it.figures.slice(0, 2).map((f) => (
                  <Badge key={f} tone="info">
                    <Users className="h-3 w-3" /> {f.split("—")[0].trim().slice(0, 28)}
                  </Badge>
                ))}
                {it.url ? (
                  <a
                    href={it.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="ml-auto inline-flex items-center gap-1 text-xs text-accent-2 hover:underline"
                  >
                    Rumor Scanner <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
      {filtered.length > 120 ? (
        <div className="text-center text-xs text-faint">
          Showing first 120 — refine with search or a verdict filter.
        </div>
      ) : null}
    </div>
  );
}
