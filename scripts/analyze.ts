/**
 * Phase 3 — Analysis (progressive).
 *
 * Deterministic outputs build immediately (no Gemini): Overview stats + Public
 * Figure tracker structure. Embedding/LLM-dependent outputs (narratives,
 * cross-border framing text, rumor matches, AI summaries) run only when
 * chunks.json (embeddings) and the Gemini key are available — see analyze_ai.ts.
 */
import { readData, writeData } from "./shared";
import type {
  SentinelDocument,
  Source,
  OverviewStats,
  PublicFigure,
  EvidenceSnippet,
} from "../src/lib/types";

interface FigureMeta {
  key: string;
  name: string;
  platform: string;
  post_count_total: number;
  document_ids: string[];
}

function evidenceFrom(doc: SentinelDocument, srcName: string): EvidenceSnippet {
  return {
    document_id: doc.id,
    quote: doc.text.slice(0, 240),
    url: doc.url,
    source_name: srcName,
    published_at: doc.published_at,
  };
}

async function main() {
  const documents = await readData<SentinelDocument[]>("documents.json", []);
  const sources = await readData<Source[]>("sources.json", []);
  const figures = await readData<FigureMeta[]>("figures_raw.json", []);
  if (!documents.length) {
    console.error("✗ No documents.json — run `npm run curate` first.");
    process.exit(1);
  }
  const sourceName = new Map(sources.map((s) => [s.id, s.name]));
  const byId = new Map(documents.map((d) => [d.id, d]));

  // ---- Overview stats (deterministic) ----
  const articles = documents.filter((d) => d.doc_type === "article");
  const posts = documents.filter((d) => d.doc_type === "public_post");
  const factchecks = documents.filter((d) => d.doc_type === "fact_check");

  const dates = documents.map((d) => d.published_at).filter(Boolean).sort() as string[];
  const sourceCounts = new Map<string, number>();
  for (const d of documents) {
    const nm = (d.metadata?.source_name as string) || sourceName.get(d.source_id) || d.source_id;
    if (d.doc_type === "article") sourceCounts.set(nm, (sourceCounts.get(nm) || 0) + 1);
  }
  const topSources = [...sourceCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => ({ name, count }));

  const topFigures = [...figures]
    .sort((a, b) => (b.post_count_total || 0) - (a.post_count_total || 0))
    .slice(0, 8)
    .map((f) => ({ name: f.name, count: f.post_count_total || f.document_ids.length }));

  // fallback "risk topics" from high-impact fact-checks until narratives exist
  const topRisk = factchecks
    .filter((d) => d.metadata?.impact_level === "high")
    .slice(0, 6)
    .map((d) => ({ title: (d.metadata?.summary_en as string) || d.title, score: 78 }));

  const overview: OverviewStats = {
    documents: documents.length,
    articles: articles.length,
    public_posts: posts.length,
    fact_checks: factchecks.length,
    narratives: (await readData<unknown[]>("narratives.json", [])).length,
    sources: sources.length,
    entities: figures.length,
    date_range: { from: dates[0] ?? null, to: dates[dates.length - 1] ?? null },
    top_sources: topSources,
    top_figures: topFigures,
    top_risk_topics: topRisk,
    generated_at: new Date(0).toISOString(),
  };
  await writeData("overview.json", overview);

  // ---- Public Figure tracker (deterministic structure) ----
  // Preserve AI enrichment from a prior analyze_ai run if present.
  const priorFigures = await readData<PublicFigure[]>("public_figures.json", []);
  const priorByKey = new Map(priorFigures.map((f) => [f.entity_id, f]));

  const publicFigures: PublicFigure[] = figures
    .filter((f) => f.document_ids.length > 0)
    .map((f) => {
      const figDocs = f.document_ids.map((id) => byId.get(id)).filter(Boolean) as SentinelDocument[];
      const byDate = [...figDocs].sort((a, b) =>
        (b.published_at || "").localeCompare(a.published_at || "")
      );
      const byEngagement = [...figDocs].sort(
        (a, b) => ((b.metadata?.reactions as number) || 0) - ((a.metadata?.reactions as number) || 0)
      );
      const timeline = byDate.slice(0, 10).map((d) => ({
        date: d.published_at || "",
        summary: d.text.slice(0, 160),
        document_id: d.id,
      }));
      const prior = priorByKey.get(f.key);
      return {
        entity_id: f.key,
        name: f.name,
        role: prior?.role ?? null,
        platforms: [f.platform],
        post_ids: f.document_ids,
        post_count_total: f.post_count_total,
        top_topics: prior?.top_topics ?? [],
        connected_narrative_ids: prior?.connected_narrative_ids ?? [],
        position_timeline: timeline,
        ai_summary: prior?.ai_summary ?? "",
        evidence: byEngagement.slice(0, 6).map((d) => evidenceFrom(d, f.name)),
      };
    })
    .sort((a, b) => b.post_ids.length - a.post_ids.length);
  await writeData("public_figures.json", publicFigures);

  console.log("✓ overview.json", {
    documents: overview.documents,
    articles: overview.articles,
    posts: overview.public_posts,
    factchecks: overview.fact_checks,
    range: `${overview.date_range.from?.slice(0, 10)} → ${overview.date_range.to?.slice(0, 10)}`,
  });
  console.log(`✓ public_figures.json: ${publicFigures.length} figures (top: ${publicFigures.slice(0, 3).map((f) => f.name).join(", ")})`);
  console.log("ℹ narratives / cross-border / rumor-matches / AI summaries await embeddings + Gemini key (analyze_ai.ts).");
}

main().catch((e) => {
  console.error("✗ analyze failed:", e);
  process.exit(1);
});
