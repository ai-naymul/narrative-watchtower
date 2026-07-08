import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, ShieldAlert, Quote, Gauge } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, Badge, RiskBadge, VerdictBadge, Sparkline, Disclaimer } from "@/components/ui";
import { getNarrative, getNarratives, getDocuments } from "@/lib/data";
import { formatDate, trackLabel } from "@/lib/utils";

export async function generateStaticParams() {
  const narratives = await getNarratives();
  return narratives.map((n) => ({ id: n.id }));
}

export default async function NarrativeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const n = await getNarrative(id);
  if (!n) notFound();
  const docs = await getDocuments();
  const byId = new Map(docs.map((d) => [d.id, d]));
  const relatedFactchecks = n.factcheck_ids.map((fid) => byId.get(fid)).filter(Boolean);

  const riskColor =
    n.risk.level === "high" ? "text-risk-high" : n.risk.level === "medium" ? "text-risk-med" : "text-risk-low";

  return (
    <div className="space-y-6">
      <Link href="/narratives" className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> All narratives
      </Link>

      <PageHeader
        eyebrow={trackLabel(n.track)}
        title={n.title}
        description={n.summary}
        actions={<RiskBadge level={n.risk.level} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Risk panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-accent" />
            <span className="text-sm font-semibold text-fg">Narrative risk</span>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-end gap-2">
              <span className={`font-mono text-4xl font-semibold tabular-nums ${riskColor}`}>{n.risk.score}</span>
              <span className="mb-1 text-xs text-faint">/ 100</span>
            </div>
            <p className="text-xs text-muted">{n.risk.rationale}</p>
            <div className="space-y-2 pt-1">
              {n.risk.factors.map((f) => (
                <div key={f.key} className="text-xs">
                  <div className="flex items-center gap-1.5 font-medium text-fg">
                    <span className={`h-1.5 w-1.5 rounded-full ${riskColor.replace("text-", "bg-")}`} />
                    {f.label}
                  </div>
                  <p className="ml-3 text-muted">{f.detail}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        {/* Why it matters + activity */}
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-accent" />
              <span className="text-sm font-semibold text-fg">Why it matters</span>
            </CardHeader>
            <CardBody className="space-y-3 text-sm text-muted">
              <p className="text-fg">{n.why_it_matters}</p>
              <div className="flex flex-wrap gap-1.5">
                {n.tags.map((t) => (
                  <Badge key={t} tone="muted">
                    {t}
                  </Badge>
                ))}
              </div>
            </CardBody>
          </Card>
          <Card>
            <CardHeader className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">Activity over time</span>
              <Badge tone="muted">
                {n.document_ids.length} articles · {n.factcheck_ids.length} fact-checks
              </Badge>
            </CardHeader>
            <CardBody>
              {n.timeline.length ? (
                <div className="flex items-end justify-between gap-2">
                  <Sparkline data={n.timeline.map((t) => t.count)} width={320} height={48} />
                  <div className="text-right text-xs text-faint">
                    {formatDate(n.timeline[0].date + "T00:00:00Z")} —{" "}
                    {formatDate(n.timeline[n.timeline.length - 1].date + "T00:00:00Z")}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted">No dated activity.</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Related fact-checks */}
      {relatedFactchecks.length ? (
        <section className="space-y-3">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Related fact-checks
          </h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {relatedFactchecks.slice(0, 8).map((d) => (
              <Card key={d!.id}>
                <CardBody className="flex items-start gap-2">
                  <VerdictBadge verdict={d!.metadata?.verdict_type as string} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-fg">{d!.title}</p>
                    {d!.url ? (
                      <a href={d!.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 text-xs text-accent-2 hover:underline">
                        Rumor Scanner <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* Evidence */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">Evidence</h2>
        <div className="space-y-2">
          {n.evidence.map((e, i) => (
            <Card key={e.document_id + i}>
              <CardBody className="flex items-start gap-3">
                <Quote className="mt-0.5 h-4 w-4 shrink-0 text-faint" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg">{e.quote}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-xs text-faint">
                    <span className="text-accent-2">{e.source_name}</span>
                    {e.published_at ? <span>· {formatDate(e.published_at)}</span> : null}
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:text-fg">
                        source <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
