"use client";

import { useState } from "react";
import { ExternalLink, ArrowLeftRight, Sparkles, Check, GitCompareArrows, EyeOff } from "lucide-react";
import { Card, CardBody, CardHeader, Badge } from "@/components/ui";
import type { CrossBorderCase } from "@/lib/types";

function TagRow({ tags }: { tags: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((t) => (
        <Badge key={t} tone="muted">
          {t}
        </Badge>
      ))}
    </div>
  );
}

function EvidenceLinks({ ev }: { ev: CrossBorderCase["bd_evidence"] }) {
  return (
    <ul className="space-y-1.5">
      {ev.slice(0, 4).map((e, i) => (
        <li key={e.document_id + i} className="text-xs text-muted">
          <span className="text-fg">{e.source_name}</span>
          {" — "}
          {e.quote.slice(0, 90)}
          {e.url ? (
            <a href={e.url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center text-accent-2 hover:underline">
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export function CrossBorderView({ cases }: { cases: CrossBorderCase[] }) {
  const [idx, setIdx] = useState(0);
  const c = cases[idx];
  if (!c) return null;

  return (
    <div className="space-y-4">
      {/* case selector */}
      <div className="flex flex-wrap gap-1.5">
        {cases.map((cc, i) => (
          <button
            key={cc.id}
            onClick={() => setIdx(i)}
            className={
              "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors " +
              (i === idx
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-border bg-surface text-muted hover:text-fg hover:border-border-strong")
            }
          >
            {cc.topic}
          </button>
        ))}
      </div>

      <Card>
        <CardBody className="space-y-1">
          <h3 className="text-base font-semibold text-fg">{c.topic}</h3>
          <p className="text-sm text-muted">{c.event_summary}</p>
        </CardBody>
      </Card>

      {/* framing gap — the analytical money shot */}
      <Card className="border-accent/30 bg-accent/5">
        <CardHeader className="flex items-center gap-2 border-accent/20">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-accent">Framing gap — analysis</span>
        </CardHeader>
        <CardBody className="text-sm text-fg">{c.framing_gap_explanation}</CardBody>
      </Card>

      {/* two-sided comparison */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-accent-2">
              Bangladeshi press framing
            </span>
          </CardHeader>
          <CardBody className="space-y-3">
            <TagRow tags={c.bd_framing_tags} />
            <ul className="space-y-1.5">
              {c.bd_emphasis.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-fg">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent-2" />
                  {e}
                </li>
              ))}
            </ul>
            <div className="border-t border-border pt-2">
              <EvidenceLinks ev={c.bd_evidence} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <span className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-accent">
              Indian / foreign press framing
            </span>
          </CardHeader>
          <CardBody className="space-y-3">
            <TagRow tags={c.foreign_framing_tags} />
            <ul className="space-y-1.5">
              {c.foreign_emphasis.map((e, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-fg">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-accent" />
                  {e}
                </li>
              ))}
            </ul>
            <div className="border-t border-border pt-2">
              <EvidenceLinks ev={c.foreign_evidence} />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* facts breakdown */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex items-center gap-2">
            <Check className="h-4 w-4 text-risk-low" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Common facts</span>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1.5 text-sm text-muted">
              {c.common_facts.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex items-center gap-2">
            <GitCompareArrows className="h-4 w-4 text-risk-med" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Divergent</span>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1.5 text-sm text-muted">
              {c.divergent_facts.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
        <Card>
          <CardHeader className="flex items-center gap-2">
            <EyeOff className="h-4 w-4 text-risk-high" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted">Missing / amplified</span>
          </CardHeader>
          <CardBody>
            <ul className="space-y-1.5 text-sm text-muted">
              {c.missing_or_amplified.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
