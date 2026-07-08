/**
 * Phase 2 — Curate a high-signal demo corpus (no Gemini; read-only Mongo + files).
 *
 * Selects, normalizes, and dedupes ~95k raw docs down to a tight corpus of
 * articles + fact-checks + public posts, plus a source registry and per-figure
 * curated post sets. Output: data/documents.json, data/sources.json, data/figures_raw.json
 */
import {
  contentDb,
  closeDb,
  classifySource,
  mentionsBangladesh,
  toISO,
  detectLang,
  cleanText,
  slugify,
  hashId,
  writeData,
  loadFigureFiles,
} from "./shared";
import type { SentinelDocument, Source, DocType, Language, SourceType } from "../src/lib/types";

// ---- curation size targets (tune here) ----
const MAX_ARTICLES = 750;
const MAX_FACTCHECKS = 550;
const MAX_POSTS_PER_FIGURE = 45;

type AnyDoc = Record<string, any>;

const sources = new Map<string, Source>();
function registerSource(
  name: string,
  geo?: string | null,
  extra?: Partial<Source> & { forceType?: SourceType }
): string {
  const cleanName = (name || "Unknown").toString().trim() || "Unknown";
  const id = slugify(cleanName) || hashId(cleanName);
  if (!sources.has(id)) {
    const classified = classifySource(cleanName, geo);
    const type = extra?.forceType ?? classified.type;
    sources.set(id, {
      id,
      name: cleanName,
      domain: extra?.domain ?? null,
      country: classified.country || extra?.country || null,
      type,
      political_orientation: extra?.political_orientation ?? null,
      created_at: new Date(0).toISOString(),
    });
  }
  return id;
}

function makeDoc(
  partial: Omit<SentinelDocument, "created_at" | "language"> & { language?: Language }
): SentinelDocument {
  return {
    ...partial,
    language: partial.language ?? detectLang(`${partial.title} ${partial.text}`),
    created_at: new Date(0).toISOString(),
  };
}

async function curateArticles(): Promise<SentinelDocument[]> {
  const db = await contentDb();
  const rows = (await db
    .collection("google_news_events")
    .find(
      {},
      {
        projection: {
          title: 1, url: 1, source: 1, published_at: 1, country_code: 1, language_code: 1,
          is_bangladesh_news: 1, bangladesh_relevance_category: 1, bangladesh_relevance_score: 1,
          bias_label: 1, intelligence_ranking: 1, category: 1,
          "info.topics": 1, "info.key_figures": 1, "info.geotags": 1, "info.total_sources": 1,
        },
      }
    )
    .toArray()) as AnyDoc[];

  const scored = rows
    .map((r) => {
      const srcName = r.source || "Unknown";
      const { type } = classifySource(srcName);
      const rel = r.bangladesh_relevance_category;
      const relScore = rel === "direct" ? 3 : rel === "indirect" ? 2 : r.is_bangladesh_news ? 1.5 : 0;
      const aboutBD = mentionsBangladesh(
        [r.title, (r.info?.key_figures ?? []).join(" "), (r.info?.topics ?? []).join(" "), (r.info?.geotags ?? []).join(" ")].join(" ")
      );
      const intel = (r.intelligence_ranking?.score ?? 0) * 0.1;
      const totalSources = Math.min((r.info?.total_sources ?? 1) / 20, 2); // widely-covered stories
      const foreign = type === "indian_media" || type === "foreign_media";
      // Foreign outlets: keep ONLY their Bangladesh coverage (drop domestic news).
      // BD outlets: keep relevance-tagged OR clearly BD-about items.
      const keep = foreign ? aboutBD : relScore > 0 || aboutBD;
      const score = foreign ? 3.5 + intel + totalSources : relScore + intel + totalSources + (aboutBD ? 0.5 : 0);
      return { r, srcName, type, foreign, score, keep };
    })
    .filter((x) => x.keep)
    .sort((a, b) => b.score - a.score);

  // Keep ALL foreign-about-Bangladesh coverage (cross-border gold), fill the rest with top BD.
  const foreign = scored.filter((x) => x.foreign);
  const rest = scored.filter((x) => !x.foreign).slice(0, Math.max(0, MAX_ARTICLES - foreign.length));
  const chosen = [...foreign, ...rest].slice(0, MAX_ARTICLES);

  const seen = new Set<string>();
  const docs: SentinelDocument[] = [];
  for (const { r, srcName } of chosen) {
    const titleKey = slugify(r.title || "").slice(0, 40);
    if (!r.title || seen.has(titleKey)) continue;
    seen.add(titleKey);
    const sourceId = registerSource(srcName, r.country_code);
    const topics: string[] = r.info?.topics ?? [];
    const figures: string[] = r.info?.key_figures ?? [];
    const geotags: string[] = r.info?.geotags ?? [];
    const text = cleanText(
      [r.title, topics.join(", "), figures.join(", "), geotags.join(", ")].filter(Boolean).join(". ")
    );
    docs.push(
      makeDoc({
        id: `art_${r._id}`,
        raw_source_id: String(r._id),
        source_id: sourceId,
        doc_type: "article" as DocType,
        title: r.title,
        text,
        url: r.url ?? null,
        author: null,
        published_at: toISO(r.published_at),
        country_context: r.country_code ?? null,
        topics,
        metadata: {
          bias_label: r.bias_label ?? null,
          bd_relevance: r.bangladesh_relevance_category ?? null,
          bd_relevance_score: r.bangladesh_relevance_score ?? null,
          key_figures: figures,
          geotags,
          total_sources: r.info?.total_sources ?? null,
          source_name: srcName,
        },
      })
    );
  }
  return docs;
}

async function curateFactchecks(): Promise<SentinelDocument[]> {
  const db = await contentDb();
  const rows = (await db
    .collection("rumor_checks")
    .find(
      { analysis: { $exists: true } },
      {
        projection: {
          title: 1, title_en: 1, claim_text: 1, verdict_type: 1, verdict: 1, category: 1,
          source_url: 1, source_links: 1, published_at: 1, related_event_ids: 1,
          "analysis.summary_bn": 1, "analysis.summary_en": 1, "analysis.key_figures": 1,
          "analysis.key_figures_en": 1, "analysis.impact_level": 1, "analysis.why_it_matters": 1,
          "analysis.category_tags": 1, "analysis.spread_analysis": 1,
        },
      }
    )
    .toArray()) as AnyDoc[];

  const impactW: Record<string, number> = { high: 3, medium: 2, low: 1 };
  const scored = rows
    .map((r) => {
      const a = r.analysis || {};
      const tags: string[] = a.category_tags ?? [];
      const sensitive = tags.some((t) =>
        ["politics", "election", "communal", "religion", "international", "military", "security"].includes(t)
      );
      const score =
        (impactW[a.impact_level] ?? 0) +
        (sensitive ? 2 : 0) +
        (r.verdict_type === "false" || r.verdict_type === "misleading" ? 1.5 : 0) +
        (a.summary_en || a.summary_bn ? 1 : 0);
      return { r, a, score };
    })
    .sort((x, y) => y.score - x.score)
    .slice(0, MAX_FACTCHECKS);

  const sourceId = registerSource("Rumor Scanner");
  const seen = new Set<string>();
  const docs: SentinelDocument[] = [];
  for (const { r, a } of scored) {
    const key = r.source_url || r.title;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    const title = r.title_en || r.title || a.summary_en?.slice(0, 120) || "Fact-check";
    const text = cleanText(
      [r.title, r.claim_text, a.summary_bn, a.summary_en, a.why_it_matters].filter(Boolean).join(". ")
    );
    docs.push(
      makeDoc({
        id: `fc_${r._id}`,
        raw_source_id: String(r._id),
        source_id: sourceId,
        doc_type: "fact_check" as DocType,
        title,
        text,
        url: r.source_url ?? null,
        author: "Rumor Scanner",
        published_at: toISO(r.published_at),
        country_context: "BD",
        metadata: {
          verdict_type: r.verdict_type ?? null,
          verdict: r.verdict ?? null,
          category: r.category ?? null,
          category_tags: a.category_tags ?? [],
          impact_level: a.impact_level ?? null,
          why_it_matters: a.why_it_matters ?? null,
          spread_analysis: a.spread_analysis ?? null,
          summary_en: a.summary_en ?? null,
          summary_bn: a.summary_bn ?? null,
          key_figures: a.key_figures_en ?? a.key_figures ?? [],
          related_event_ids: (r.related_event_ids ?? []).map(String),
          source_links: r.source_links ?? [],
        },
      })
    );
  }
  return docs;
}

interface FigureMeta {
  key: string;
  name: string;
  platform: string;
  post_count_total: number;
  document_ids: string[];
}

async function curatePosts(): Promise<{ docs: SentinelDocument[]; figures: FigureMeta[] }> {
  const files = await loadFigureFiles();
  const docs: SentinelDocument[] = [];
  const figures: FigureMeta[] = [];

  for (const f of files) {
    const name = f.pageName;
    const sourceId = registerSource(name, "BD", { forceType: "public_figure" });
    // rank posts: engagement + recency, keep top N with real text
    const ranked = f.posts
      .filter((p) => (p.content || "").trim().length > 40)
      .map((p) => {
        const eng = (p.reactions_count ?? 0) + (p.comment_count ?? 0) * 2 + (p.share_count ?? 0) * 3;
        const ts = new Date(p.created_at || 0).getTime() || 0;
        return { p, eng, ts };
      })
      .sort((a, b) => b.eng + b.ts / 1e11 - (a.eng + a.ts / 1e11))
      .slice(0, MAX_POSTS_PER_FIGURE);

    const docIds: string[] = [];
    for (const { p } of ranked) {
      const id = `post_${f.figureKey}_${p.post_id}`;
      docIds.push(id);
      docs.push(
        makeDoc({
          id,
          raw_source_id: p.post_id,
          source_id: sourceId,
          doc_type: "public_post" as DocType,
          title: cleanText(p.content).slice(0, 90),
          text: cleanText(p.content),
          url: p.post_url ?? null,
          author: name,
          published_at: toISO(p.created_at),
          country_context: "BD",
          metadata: {
            figure_key: f.figureKey,
            figure_name: name,
            platform: "facebook",
            reactions: p.reactions_count ?? 0,
            comments: p.comment_count ?? 0,
            shares: p.share_count ?? 0,
            media_type: p.media_type ?? null,
          },
        })
      );
    }
    figures.push({
      key: f.figureKey,
      name,
      platform: "facebook",
      post_count_total: f.posts.length,
      document_ids: docIds,
    });
  }
  return { docs, figures };
}

async function main() {
  console.log("→ Curating articles…");
  const articles = await curateArticles();
  console.log(`  ${articles.length} articles`);

  console.log("→ Curating fact-checks…");
  const factchecks = await curateFactchecks();
  console.log(`  ${factchecks.length} fact-checks`);

  console.log("→ Curating public posts…");
  const { docs: posts, figures } = await curatePosts();
  console.log(`  ${posts.length} posts across ${figures.length} figures`);

  const documents = [...articles, ...factchecks, ...posts];
  await writeData("documents.json", documents);
  await writeData("sources.json", [...sources.values()]);
  await writeData("figures_raw.json", figures);

  // quick breakdown
  const byType = documents.reduce<Record<string, number>>((m, d) => {
    m[d.doc_type] = (m[d.doc_type] || 0) + 1;
    return m;
  }, {});
  const byCountry = [...sources.values()].reduce<Record<string, number>>((m, s) => {
    m[s.type] = (m[s.type] || 0) + 1;
    return m;
  }, {});
  console.log(`\n✓ documents.json: ${documents.length} docs`, byType);
  console.log(`✓ sources.json: ${sources.size} sources`, byCountry);
  console.log(`✓ figures_raw.json: ${figures.length} figures`);
  await closeDb();
}

main().catch((e) => {
  console.error("✗ curate failed:", e);
  process.exit(1);
});
