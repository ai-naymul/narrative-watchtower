/**
 * Assemble Claude-analyst drafts (analysis_work/*.json) into the final runtime
 * intelligence the dashboard reads (data/*.json). Idempotent + tolerant of
 * missing drafts: it assembles whatever analysts have finished so far.
 *
 *   narratives_draft.json    → narratives.json  (+ timeline, evidence)
 *   crossborder_draft.json   → cross_border.json
 *   fig_summaries_*.json     → merged into public_figures.json
 *   (re)writes overview.json with narrative-derived risk topics
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { readData, writeData, hashId, slugify } from "./shared";
import type {
  SentinelDocument,
  Source,
  Narrative,
  CrossBorderCase,
  PublicFigure,
  EvidenceSnippet,
  OverviewStats,
  RiskFactor,
  FramingTag,
  RiskLevel,
} from "../src/lib/types";

const WORK = path.join(process.cwd(), "analysis_work");
async function readWork<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(WORK, file), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

const monthKey = (iso: string | null) => (iso ? iso.slice(0, 7) + "-01" : null);

async function main() {
  const documents = await readData<SentinelDocument[]>("documents.json", []);
  const sources = await readData<Source[]>("sources.json", []);
  const byId = new Map(documents.map((d) => [d.id, d]));
  const srcName = new Map(sources.map((s) => [s.id, s.name]));
  const srcType = new Map(sources.map((s) => [s.id, s.type]));

  const nameOf = (d: SentinelDocument) =>
    (d.metadata?.source_name as string) ||
    (d.metadata?.figure_name as string) ||
    srcName.get(d.source_id) ||
    d.author ||
    "Source";

  const evidenceOf = (id: string): EvidenceSnippet | null => {
    const d = byId.get(id);
    if (!d) return null;
    return {
      document_id: d.id,
      quote: (d.title ? d.title + " — " : "") + d.text.slice(0, 200),
      url: d.url,
      source_name: nameOf(d),
      published_at: d.published_at,
    };
  };

  // ---------- Narratives ----------
  interface NDraft {
    track: Narrative["track"];
    title: string;
    summary: string;
    why_it_matters: string;
    risk_score: number;
    risk_level: RiskLevel;
    risk_factors: { label: string; detail: string }[];
    risk_rationale: string;
    tags: FramingTag[];
    article_ids: string[];
    factcheck_ids: string[];
  }
  const ndrafts = await readWork<NDraft[]>("narratives_draft.json", []);
  const narratives: Narrative[] = ndrafts.map((n) => {
    const ids = [...(n.article_ids || []), ...(n.factcheck_ids || [])].filter((id) => byId.has(id));
    const members = ids.map((id) => byId.get(id)!).filter(Boolean);
    // monthly timeline
    const buckets = new Map<string, number>();
    for (const d of members) {
      const k = monthKey(d.published_at);
      if (k) buckets.set(k, (buckets.get(k) || 0) + 1);
    }
    const timeline = [...buckets.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }));
    // evidence: prefer a mix of articles + factchecks, newest first
    const evidence = [...members]
      .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""))
      .slice(0, 8)
      .map((d) => evidenceOf(d.id)!)
      .filter(Boolean);
    const llmFactors: RiskFactor[] = (n.risk_factors || []).map((f) => ({
      key: slugify(f.label),
      label: f.label,
      weight: 1 / Math.max(1, n.risk_factors.length),
      value: Math.min(1, (n.risk_score || 0) / 100),
      detail: f.detail,
    }));
    // Measured signals computed directly from the data (not LLM-asserted).
    const memberSources = new Set(
      members.map((d) => (d.metadata?.source_name as string) || (d.metadata?.figure_name as string) || d.source_id)
    );
    const crossBorder = members.some((d) => {
      const t = srcType.get(d.source_id);
      return t === "indian_media" || t === "foreign_media";
    });
    const figs = new Set(
      members.flatMap((d) => ((d.metadata?.key_figures as string[]) || []).map((f) => f.split("—")[0].trim()))
    );
    const peak = timeline.length ? Math.max(...timeline.map((t) => t.count)) : 0;
    const computed: RiskFactor[] = [
      { key: "amplifying-sources", label: "Amplifying sources", weight: 0.2, value: Math.min(1, memberSources.size / 10), detail: `${memberSources.size} distinct outlets/actors carry this narrative` },
      { key: "cross-border", label: "Cross-border amplification", weight: 0.2, value: crossBorder ? 0.9 : 0.2, detail: crossBorder ? "Indian/foreign-outlet coverage present in the cluster" : "No foreign-outlet coverage detected" },
      { key: "factcheck-density", label: "Fact-check density", weight: 0.2, value: Math.min(1, (n.factcheck_ids?.length || 0) / 12), detail: `${n.factcheck_ids?.length || 0} linked Rumor Scanner fact-checks` },
      { key: "named-figures", label: "Named public figures", weight: 0.2, value: Math.min(1, figs.size / 8), detail: `${figs.size} named public figures referenced` },
      { key: "velocity", label: "Peak velocity", weight: 0.2, value: Math.min(1, peak / 8), detail: `up to ${peak} items in a single month` },
    ];
    const factors = [...computed, ...llmFactors];
    return {
      id: `nar_${hashId(n.title)}`,
      title: n.title,
      summary: n.summary,
      why_it_matters: n.why_it_matters,
      risk: { score: n.risk_score, level: n.risk_level, factors, rationale: n.risk_rationale },
      tags: n.tags || [],
      track: n.track,
      document_ids: n.article_ids?.filter((id) => byId.has(id)) || [],
      entity_ids: [],
      factcheck_ids: n.factcheck_ids?.filter((id) => byId.has(id)) || [],
      timeline,
      evidence,
      generated_at: new Date(0).toISOString(),
    };
  });
  if (narratives.length) await writeData("narratives.json", narratives);

  // ---------- Cross-border ----------
  interface CBDraft {
    topic: string;
    event_summary: string;
    bd_emphasis: string[];
    foreign_emphasis: string[];
    common_facts: string[];
    divergent_facts: string[];
    missing_or_amplified: string[];
    bd_framing_tags: FramingTag[];
    foreign_framing_tags: FramingTag[];
    framing_gap_explanation: string;
    bd_article_ids: string[];
    foreign_article_ids: string[];
    factcheck_ids: string[];
  }
  const cbdrafts = await readWork<CBDraft[]>("crossborder_draft.json", []);
  const crossBorder: CrossBorderCase[] = cbdrafts.map((c) => ({
    id: `cb_${hashId(c.topic)}`,
    topic: c.topic,
    event_summary: c.event_summary,
    bd_emphasis: c.bd_emphasis || [],
    foreign_emphasis: c.foreign_emphasis || [],
    common_facts: c.common_facts || [],
    divergent_facts: c.divergent_facts || [],
    missing_or_amplified: c.missing_or_amplified || [],
    bd_framing_tags: c.bd_framing_tags || [],
    foreign_framing_tags: c.foreign_framing_tags || [],
    framing_gap_explanation: c.framing_gap_explanation,
    bd_evidence: (c.bd_article_ids || []).map(evidenceOf).filter(Boolean) as EvidenceSnippet[],
    foreign_evidence: (c.foreign_article_ids || []).map(evidenceOf).filter(Boolean) as EvidenceSnippet[],
    factcheck_ids: (c.factcheck_ids || []).filter((id) => byId.has(id)),
    web_collected: false,
  }));
  if (crossBorder.length) await writeData("cross_border.json", crossBorder);

  // ---------- Public figures (merge AI summaries) ----------
  interface FigDraft {
    key: string;
    role: string;
    ai_summary: string;
    top_topics: { topic: string; count: number }[];
    notable_post_ids: string[];
  }
  const figFiles = (await fs.readdir(WORK).catch(() => [])).filter((f) =>
    /^fig_summaries_\d+\.json$/.test(f)
  );
  const figDrafts: FigDraft[] = [];
  for (const f of figFiles) figDrafts.push(...(await readWork<FigDraft[]>(f, [])));
  const figByKey = new Map(figDrafts.map((f) => [f.key, f]));

  const figuresBase = await readData<PublicFigure[]>("public_figures.json", []);
  if (figuresBase.length && figByKey.size) {
    // link figures → narratives by name token overlap with narrative evidence/figures
    const narrForFigure = (name: string): string[] => {
      const tokens = name.toLowerCase().split(/\s+/).filter((t) => t.length > 3);
      return narratives
        .filter((nar) => {
          const hay = (
            nar.title +
            " " +
            nar.summary +
            " " +
            nar.evidence.map((e) => e.quote).join(" ")
          ).toLowerCase();
          return tokens.some((t) => hay.includes(t));
        })
        .map((n) => n.id)
        .slice(0, 4);
    };
    const merged = figuresBase.map((fig) => {
      const d = figByKey.get(fig.entity_id);
      if (!d) return fig;
      return {
        ...fig,
        role: d.role || fig.role,
        ai_summary: d.ai_summary || fig.ai_summary,
        top_topics: d.top_topics?.length ? d.top_topics : fig.top_topics,
        connected_narrative_ids: narrForFigure(fig.name),
      };
    });
    await writeData("public_figures.json", merged);
  }

  // ---------- Overview refresh (narrative-derived risk topics) ----------
  const overview = await readData<OverviewStats | null>("overview.json", null);
  if (overview) {
    overview.narratives = narratives.length;
    overview.top_risk_topics = [...narratives]
      .sort((a, b) => b.risk.score - a.risk.score)
      .slice(0, 6)
      .map((n) => ({ title: n.title, score: n.risk.score }));
    await writeData("overview.json", overview);
  }

  console.log(
    `✓ assembled: narratives=${narratives.length} cross_border=${crossBorder.length} figure_summaries=${figByKey.size}/${figuresBase.length}`
  );
  if (narratives.length)
    console.log(
      "  top narratives:",
      narratives
        .sort((a, b) => b.risk.score - a.risk.score)
        .slice(0, 4)
        .map((n) => `${n.title} (${n.risk.score})`)
        .join(" · ")
    );
}

main().catch((e) => {
  console.error("✗ assemble failed:", e);
  process.exit(1);
});
