import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, Badge, StatTile } from "@/components/ui";
import { getEval } from "@/lib/data";
import {
  Database,
  Cpu,
  Layers,
  ShieldAlert,
  Gauge,
  UserCheck,
  TriangleAlert,
  Scale,
  Radar,
} from "lucide-react";

const SECTIONS = [
  {
    icon: Database,
    title: "Data sources",
    body: "Public-source only: scraped Bangladeshi + Indian news, Rumor Scanner fact-check reports, and public posts/statements from public figures. All raw sources accessed read-only; nothing was modified. Foreign outlets are kept only for their Bangladesh coverage. No private accounts or personal data of private citizens.",
  },
  {
    icon: Cpu,
    title: "AI pipeline",
    body: "Documents are normalised, de-duplicated, and curated to a high-signal subset. Claude Opus 4.8 (1M-context) performs the analysis — narrative clustering, cross-border framing, figure summaries — offline and cached. A multilingual transformer (multilingual-e5) embeds every document locally for semantic matching and retrieval. No data leaves for a hosted embedding/LLM API at build time.",
  },
  {
    icon: Layers,
    title: "Narrative clustering",
    body: "The curated corpus is read in full context and clustered into narratives, each with a title, one-sentence summary, 'why it matters', framing tags, and a risk category — every narrative traceable to its member documents.",
  },
  {
    icon: ShieldAlert,
    title: "Cross-lingual claim matching",
    body: "Known Rumor Scanner claims and current articles/posts are embedded in a shared multilingual space; cosine similarity flags current content sitting near a debunked claim — even when the claim is in English and the post in Bangla. A calibrated threshold (95th percentile) controls precision. Proximity is a risk signal, not a verdict.",
  },
  {
    icon: Radar,
    title: "Hybrid retrieval",
    body: "The Analyst Copilot uses hybrid retrieval: BM25 lexical scoring for a sparse seed, then dense expansion using precomputed embedding neighbors — surfacing semantically related evidence lexical search misses, with zero model inference at request time for reliability.",
  },
  {
    icon: Gauge,
    title: "Risk scoring",
    body: "Risk blends measured signals computed directly from the data — number of amplifying sources, cross-border amplification, fact-check density, named public figures, and peak velocity — with a model-assessed rationale. The per-factor breakdown is always shown; it is never a black box.",
  },
  {
    icon: UserCheck,
    title: "Human-in-the-loop",
    body: "A decision-support tool for analysts, not an automated verdict engine. Every output carries evidence and a confidence level, and every screen states that human review is required.",
  },
  {
    icon: Scale,
    title: "Ethical design",
    body: "Public-source data only; does not identify private citizens; does not assign guilt or intent; always provides evidence links; flags uncertainty; built for democratic resilience and misinformation response — explicitly not surveillance.",
  },
  {
    icon: TriangleAlert,
    title: "Limitations",
    body: "Coverage is bounded by the curated corpus; embeddings capture similarity, not truth; framing tags and risk scores are heuristic triage signals; foreign framing is dominated by Indian outlets; the data reflects a fast-moving 2026 political scenario.",
  },
];

export default async function MethodologyPage() {
  const ev = (await getEval()) as
    | {
        corpus?: { documents: number; sources: number };
        embeddings?: { model: string; dim: number; vectors: number; cross_lingual_sanity: number };
        claim_matching?: {
          candidates_scanned: number;
          known_false_claims: number;
          matches_above_threshold: number;
          threshold: number;
          similarity_median: number;
          similarity_max: number;
        };
        narratives?: { count: number; doc_assignments: number };
        retrieval?: { method: string };
        graph?: { nodes: number; links: number };
      }
    | null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Methodology"
        title="How Narrative Watchtower works"
        description="Transparency is part of the product. This page documents the data, the AI/ML pipeline, the scoring, the evaluation, and the safeguards behind every screen."
        actions={<Badge tone="info">Claude Opus 4.8 · multilingual-e5</Badge>}
      />

      {ev?.embeddings ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-accent" />
            <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">Evaluation & metrics</h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Docs embedded" value={ev.embeddings.vectors.toLocaleString()} hint={`${ev.embeddings.dim}-dim`} />
            <StatTile label="Embed model" value="e5" hint="multilingual" />
            <StatTile label="Cross-lingual cos" value={ev.embeddings.cross_lingual_sanity.toFixed(2)} hint="BN↔EN paraphrase" />
            <StatTile label="Claim matches" value={ev.claim_matching?.matches_above_threshold ?? "—"} hint={`≥ ${ev.claim_matching?.threshold}`} />
            <StatTile label="Match median" value={ev.claim_matching?.similarity_median.toFixed(3) ?? "—"} hint={`max ${ev.claim_matching?.similarity_max.toFixed(2)}`} />
            <StatTile label="Graph" value={`${ev.graph?.nodes}/${ev.graph?.links}`} hint="nodes / links" />
          </div>
          <Card>
            <CardBody className="text-xs text-muted">
              Pipeline: {ev.corpus?.documents.toLocaleString()} curated documents · {ev.embeddings.vectors.toLocaleString()}{" "}
              multilingual embeddings · {ev.claim_matching?.candidates_scanned.toLocaleString()} current items scanned
              against {ev.claim_matching?.known_false_claims} known false claims · {ev.narratives?.count} narratives over{" "}
              {ev.narratives?.doc_assignments} document assignments · retrieval = {ev.retrieval?.method}.
            </CardBody>
          </Card>
        </section>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Card key={s.title}>
              <CardHeader className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-accent" />
                <span className="text-sm font-semibold text-fg">{s.title}</span>
              </CardHeader>
              <CardBody className="text-sm text-muted">{s.body}</CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
