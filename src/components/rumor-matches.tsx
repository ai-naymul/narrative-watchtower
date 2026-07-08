import { ArrowRight, ExternalLink, Radar } from "lucide-react";
import { Card, CardBody, VerdictBadge } from "@/components/ui";

export interface MatchItem {
  id: string;
  similarity: number;
  verdict: string;
  explanation: string;
  claim: { source_name: string; text: string; url: string | null; kind: string };
  factcheck: { title: string; url: string | null };
}

function simTone(sim: number) {
  if (sim >= 0.91) return "text-risk-high border-risk-high/40 bg-risk-high/10";
  if (sim >= 0.88) return "text-risk-med border-risk-med/40 bg-risk-med/10";
  return "text-accent-2 border-accent-2/40 bg-accent-2/10";
}

export function RumorMatches({ items }: { items: MatchItem[] }) {
  return (
    <div className="space-y-3">
      {items.map((m) => (
        <Card key={m.id}>
          <CardBody className="space-y-3">
            <div className="grid items-stretch gap-3 md:grid-cols-[1fr_auto_1fr]">
              {/* current content */}
              <div className="min-w-0">
                <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-faint">
                  Current {m.claim.kind}
                </div>
                <div className="text-xs font-medium text-accent-2">{m.claim.source_name}</div>
                <p className="mt-1 line-clamp-3 text-sm text-fg">{m.claim.text}</p>
                {m.claim.url ? (
                  <a href={m.claim.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-accent-2 hover:underline">
                    view <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>

              {/* similarity */}
              <div className="flex flex-row items-center justify-center gap-2 md:flex-col">
                <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 font-mono text-sm font-semibold ${simTone(m.similarity)}`}>
                  <Radar className="h-3.5 w-3.5" />
                  {Math.round(m.similarity * 100)}%
                </span>
                <ArrowRight className="hidden h-4 w-4 rotate-90 text-faint md:block" />
              </div>

              {/* matched fact-check */}
              <div className="min-w-0">
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-faint">
                    Known false claim
                  </span>
                  <VerdictBadge verdict={m.verdict} />
                </div>
                <p className="line-clamp-3 text-sm text-fg">{m.factcheck.title}</p>
                {m.factcheck.url ? (
                  <a href={m.factcheck.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-accent-2 hover:underline">
                    Rumor Scanner <ExternalLink className="h-3 w-3" />
                  </a>
                ) : null}
              </div>
            </div>
            <p className="border-t border-border pt-2 text-xs text-muted">{m.explanation}</p>
          </CardBody>
        </Card>
      ))}
    </div>
  );
}
