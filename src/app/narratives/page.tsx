import { PageHeader } from "@/components/page-header";
import { ComingOnline } from "@/components/coming-online";
import { Badge, Disclaimer } from "@/components/ui";
import { NarrativeList, type NarrativeItem } from "@/components/narrative-list";
import { getNarratives } from "@/lib/data";

export default async function NarrativesPage() {
  const narratives = await getNarratives();

  const items: NarrativeItem[] = narratives.map((n) => ({
    id: n.id,
    title: n.title,
    summary: n.summary,
    track: n.track,
    score: n.risk.score,
    level: n.risk.level,
    tags: n.tags,
    spark: n.timeline.map((t) => t.count),
    docCount: n.document_ids.length,
    fcCount: n.factcheck_ids.length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Narrative Explorer"
        title="Emerging narrative clusters"
        description="Each narrative is a cluster of articles, posts, and fact-checks around one theme — analysed by Claude Opus 4.8, risk-scored, and backed by evidence."
        actions={items.length ? <Badge tone="info">{items.length} narratives</Badge> : undefined}
      />

      {items.length ? (
        <NarrativeList items={items} />
      ) : (
        <ComingOnline
          summary="Documents are clustered into narratives; each gets a title, one-sentence summary, and a 'why it matters' rationale with an explainable risk score."
          points={[
            "Narrative title + one-sentence AI summary",
            "Risk level (Low / Medium / High) with explainable score",
            "Why it matters for national information security",
            "Related sources, public figures, and fact-checks",
            "Timeline sparkline of activity over time",
            "Evidence snippets with source links",
          ]}
        />
      )}

      <Disclaimer />
    </div>
  );
}
