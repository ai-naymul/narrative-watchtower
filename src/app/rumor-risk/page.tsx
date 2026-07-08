import { Radar, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingOnline } from "@/components/coming-online";
import { Card, CardBody, StatTile, Badge, Disclaimer } from "@/components/ui";
import { RumorExplorer, type RumorItem } from "@/components/rumor-explorer";
import { RumorMatches, type MatchItem } from "@/components/rumor-matches";
import { getFactChecks, getRumorMatches, getDocuments } from "@/lib/data";

export default async function RumorRiskPage() {
  const [factchecks, matches, docs] = await Promise.all([
    getFactChecks(),
    getRumorMatches(),
    getDocuments(),
  ]);
  const byId = new Map(docs.map((d) => [d.id, d]));

  const items: RumorItem[] = factchecks.map((d) => ({
    id: d.id,
    title: d.title,
    verdict: (d.metadata?.verdict_type as string) ?? null,
    category_tags: (d.metadata?.category_tags as string[]) ?? [],
    impact: (d.metadata?.impact_level as string) ?? null,
    why: (d.metadata?.why_it_matters as string) ?? (d.metadata?.summary_en as string) ?? null,
    date: d.published_at,
    url: d.url,
    figures: (d.metadata?.key_figures as string[]) ?? [],
  }));
  const count = (v: string) => items.filter((i) => i.verdict === v).length;

  const matchItems: MatchItem[] = matches
    .map((m) => {
      const claim = byId.get(m.claim_document_id);
      const fc = byId.get(m.factcheck_document_id);
      if (!claim || !fc) return null;
      return {
        id: m.id,
        similarity: m.similarity_score,
        verdict: m.verdict,
        explanation: m.explanation,
        claim: {
          source_name:
            (claim.metadata?.figure_name as string) ||
            (claim.metadata?.source_name as string) ||
            "Source",
          text: claim.text,
          url: claim.url,
          kind: claim.doc_type === "public_post" ? "post" : "news item",
        },
        factcheck: { title: fc.title, url: fc.url },
      };
    })
    .filter(Boolean)
    .slice(0, 40) as MatchItem[];

  if (!items.length) {
    return (
      <div className="space-y-6">
        <PageHeader eyebrow="Rumor / Misinformation Risk Center" title="Known false claims, grounded in Rumor Scanner" />
        <ComingOnline
          summary="Rumor Scanner fact-checks are matched semantically against current coverage."
          points={["Known false / misleading claims", "Semantic matches in current coverage", "Explainable risk", "Source evidence"]}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Rumor / Misinformation Risk Center"
        title="Known false claims — and where they resurface"
        description="Rumor Scanner fact-checks, plus live cross-lingual matching: multilingual embeddings flag current articles and posts that sit in the information space of a debunked claim, even across Bangla and English."
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Fact-checks" value={items.length.toLocaleString()} />
        <StatTile label="False" value={count("false").toLocaleString()} />
        <StatTile label="Misleading" value={count("misleading").toLocaleString()} />
        <StatTile label="Proximity matches" value={matches.length.toLocaleString()} hint="semantic" />
      </div>

      {/* Semantic proximity — the neural feature */}
      {matchItems.length ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Radar className="h-4 w-4 text-accent" />
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
              Semantic proximity to known misinformation
            </h2>
            <Badge tone="info">multilingual-e5 · cross-lingual</Badge>
          </div>
          <Card>
            <CardBody className="flex items-start gap-3 text-xs text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-2" />
              <span>
                Every current article and post is embedded with a multilingual transformer and compared
                against known false/misleading claims by cosine similarity. Strong matches (shown below) are a
                risk signal — the analyst reviews whether the item repeats, reports, or debunks the claim.
              </span>
            </CardBody>
          </Card>
          <RumorMatches items={matchItems} />
        </section>
      ) : null}

      {/* Fact-check library */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Fact-check library
        </h2>
        <RumorExplorer items={items} />
      </section>

      <Disclaimer />
    </div>
  );
}
