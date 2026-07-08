/**
 * Prepare compact, agent-readable analysis inputs from the curated corpus, and
 * print a quality report so we can verify the curation picked the right data.
 * Output: analysis_work/{articles,factchecks,figures_index}.json + figures/<key>.json
 */
import { promises as fs } from "node:fs";
import path from "node:path";
import { readData } from "./shared";
import type { SentinelDocument, Source } from "../src/lib/types";

const OUT = path.join(process.cwd(), "analysis_work");

const short = (s: string | null | undefined, n = 220) =>
  (s || "").replace(/\s+/g, " ").trim().slice(0, n);
const day = (d: string | null) => (d ? d.slice(0, 10) : null);

async function main() {
  const docs = await readData<SentinelDocument[]>("documents.json", []);
  const sources = await readData<Source[]>("sources.json", []);
  const srcById = new Map(sources.map((s) => [s.id, s]));
  await fs.mkdir(path.join(OUT, "figures"), { recursive: true });

  const articles = docs.filter((d) => d.doc_type === "article");
  const factchecks = docs.filter((d) => d.doc_type === "fact_check");
  const posts = docs.filter((d) => d.doc_type === "public_post");

  // ---- compact articles ----
  const artOut = articles.map((d) => {
    const s = srcById.get(d.source_id);
    return {
      id: d.id,
      title: short(d.title, 200),
      src: (d.metadata?.source_name as string) || s?.name || d.source_id,
      stype: s?.type,
      country: s?.country,
      date: day(d.published_at),
      topics: (d.metadata?.key_figures ? [] : []) as string[], // placeholder
      figures: (d.metadata?.key_figures as string[]) ?? [],
      geotags: (d.metadata?.geotags as string[]) ?? [],
      bias: d.metadata?.bias_label ?? null,
      rel: d.metadata?.bd_relevance ?? null,
    };
  });
  // topics actually live under metadata.topics via curate (doc.topics)
  articles.forEach((d, i) => {
    (artOut[i] as { topics: string[] }).topics = (d.topics as string[]) ?? [];
  });
  await fs.writeFile(path.join(OUT, "articles.json"), JSON.stringify(artOut), "utf-8");

  // ---- compact factchecks ----
  const fcOut = factchecks.map((d) => ({
    id: d.id,
    title: short(d.title, 200),
    verdict: d.metadata?.verdict_type ?? null,
    tags: (d.metadata?.category_tags as string[]) ?? [],
    impact: d.metadata?.impact_level ?? null,
    why: short(d.metadata?.why_it_matters as string, 260),
    summary: short((d.metadata?.summary_en as string) || (d.metadata?.summary_bn as string), 260),
    figures: ((d.metadata?.key_figures as string[]) ?? []).map((f) => f.split("—")[0].trim()),
    date: day(d.published_at),
    url: d.url,
  }));
  await fs.writeFile(path.join(OUT, "factchecks.json"), JSON.stringify(fcOut), "utf-8");

  // ---- per-figure post files + index ----
  const byFigure = new Map<string, SentinelDocument[]>();
  for (const p of posts) {
    const k = p.metadata?.figure_key as string;
    if (!k) continue;
    (byFigure.get(k) ?? byFigure.set(k, []).get(k)!).push(p);
  }
  const figIndex: { key: string; name: string; posts: number }[] = [];
  for (const [key, ps] of byFigure) {
    const name = (ps[0]?.metadata?.figure_name as string) || key;
    figIndex.push({ key, name, posts: ps.length });
    const compact = ps
      .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""))
      .map((p) => ({
        id: p.id,
        date: day(p.published_at),
        text: short(p.text, 400),
        reactions: p.metadata?.reactions ?? 0,
        url: p.url,
      }));
    await fs.writeFile(path.join(OUT, "figures", `${key}.json`), JSON.stringify({ key, name, posts: compact }), "utf-8");
  }
  await fs.writeFile(path.join(OUT, "figures_index.json"), JSON.stringify(figIndex), "utf-8");

  // ---- QUALITY REPORT ----
  console.log("========== CURATION QUALITY REPORT ==========\n");
  console.log(`Articles: ${articles.length} | Fact-checks: ${factchecks.length} | Posts: ${posts.length}`);

  const byType = sources.reduce<Record<string, number>>((m, s) => ((m[s.type] = (m[s.type] || 0) + 1), m), {});
  console.log("\nSource types:", byType);

  const relDist = artOut.reduce<Record<string, number>>((m, a) => ((m[a.rel || "none"] = (m[a.rel || "none"] || 0) + 1), m), {});
  console.log("Article BD-relevance:", relDist);

  const artByCountry = artOut.reduce<Record<string, number>>((m, a) => ((m[a.stype || "?"] = (m[a.stype || "?"] || 0) + 1), m), {});
  console.log("Article source types:", artByCountry);

  const vDist = fcOut.reduce<Record<string, number>>((m, f) => ((m[f.verdict || "?"] = (m[f.verdict || "?"] || 0) + 1), m), {});
  console.log("Fact-check verdicts:", vDist);
  const impactDist = fcOut.reduce<Record<string, number>>((m, f) => ((m[f.impact || "?"] = (m[f.impact || "?"] || 0) + 1), m), {});
  console.log("Fact-check impact:", impactDist);

  console.log("\n--- 15 sample article titles (Indian-source marked *) ---");
  for (const a of artOut.filter((_, i) => i % Math.floor(artOut.length / 15) === 0).slice(0, 15))
    console.log(`  ${a.stype === "indian_media" ? "*" : " "}[${a.date}] ${a.src}: ${a.title.slice(0, 90)}`);

  console.log("\n--- 10 sample high-impact fact-checks ---");
  for (const f of fcOut.filter((f) => f.impact === "high").slice(0, 10))
    console.log(`  [${f.verdict}] ${f.title.slice(0, 95)}`);

  console.log(`\n✓ Wrote analysis_work/ (articles, factchecks, ${figIndex.length} figure files)`);
}

main().catch((e) => {
  console.error("failed:", e);
  process.exit(1);
});
