/**
 * Cross-lingual claim matching (offline, from neural embeddings).
 *
 * For every current article/post, finds the nearest known Rumor Scanner FALSE/
 * MISLEADING claim by cosine similarity in the multilingual embedding space —
 * so a Bangla post that restates an English-debunked claim still matches. Strong
 * matches are surfaced as a risk signal (NOT a verdict). Output: data/factcheck_matches.json
 */
import { readData, writeData } from "./shared";
import type { SentinelDocument, FactcheckMatch } from "../src/lib/types";
import type { EmbeddedDoc } from "./embed";

const THRESHOLD = Number(process.env.MATCH_THRESHOLD || "0"); // 0 = auto
const MAX_MATCHES = Number(process.env.MATCH_MAX || "160");

function dot(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
const pct = (sorted: number[], p: number) => sorted[Math.floor((p / 100) * (sorted.length - 1))] ?? 0;

async function main() {
  const emb = await readData<{ dim: number; docs: EmbeddedDoc[] }>("embeddings.json", { dim: 0, docs: [] });
  if (!emb.docs.length) throw new Error("No embeddings.json — run `npm run embed` first.");
  const documents = await readData<SentinelDocument[]>("documents.json", []);
  const byId = new Map(documents.map((d) => [d.id, d]));

  const factchecks = emb.docs.filter((d) => d.doc_type === "fact_check");
  const current = emb.docs.filter((d) => d.doc_type === "article" || d.doc_type === "public_post");
  console.log(`Matching ${current.length} current docs against ${factchecks.length} known false claims…`);

  // best fact-check per current doc
  const best = current.map((c) => {
    let bi = -1;
    let bs = -1;
    for (let i = 0; i < factchecks.length; i++) {
      const s = dot(c.vec, factchecks[i].vec);
      if (s > bs) ((bs = s), (bi = i));
    }
    return { claimId: c.id, fcId: factchecks[bi].id, sim: bs };
  });

  const sims = best.map((b) => b.sim).sort((a, b) => a - b);
  console.log(
    `  similarity distribution: p50=${pct(sims, 50).toFixed(3)} p90=${pct(sims, 90).toFixed(3)} p95=${pct(sims, 95).toFixed(3)} p99=${pct(sims, 99).toFixed(3)} max=${sims[sims.length - 1].toFixed(3)}`
  );
  const auto = pct(sims, 95);
  const threshold = THRESHOLD > 0 ? THRESHOLD : Math.max(auto, 0.86);
  console.log(`  threshold=${threshold.toFixed(3)} ${THRESHOLD > 0 ? "(manual)" : "(auto p95, floor 0.86)"}`);

  const strong = best
    .filter((b) => b.sim >= threshold)
    .sort((a, b) => b.sim - a.sim)
    .slice(0, MAX_MATCHES);

  const matches: FactcheckMatch[] = strong
    .map((b) => {
      const fc = byId.get(b.fcId);
      const claim = byId.get(b.claimId);
      if (!fc || !claim) return null;
      const verdict = (fc.metadata?.verdict_type as FactcheckMatch["verdict"]) || "false";
      const pctSim = Math.round(b.sim * 100);
      const kind = claim.doc_type === "public_post" ? "public post" : "news item";
      const who = (claim.metadata?.figure_name as string) || (claim.metadata?.source_name as string) || "A source";
      return {
        id: `m_${b.claimId}`,
        claim_document_id: b.claimId,
        factcheck_document_id: b.fcId,
        verdict,
        similarity_score: b.sim,
        explanation:
          `${who}'s ${kind} sits in the information space of a known false claim — ${pctSim}% ` +
          `semantic match to a Rumor Scanner fact-check verdicted ${verdict.toUpperCase()}: ` +
          `"${fc.title.slice(0, 110)}". Whether this item repeats, reports on, or debunks the claim ` +
          `requires human review; proximity alone does not mean this item is false.`,
        created_at: new Date(0).toISOString(),
      } as FactcheckMatch;
    })
    .filter(Boolean) as FactcheckMatch[];

  await writeData("factcheck_matches.json", matches);
  const byVerdict = matches.reduce<Record<string, number>>((m, x) => ((m[x.verdict] = (m[x.verdict] || 0) + 1), m), {});
  const byType = matches.reduce<Record<string, number>>((m, x) => {
    const t = byId.get(x.claim_document_id)?.doc_type || "?";
    m[t] = (m[t] || 0) + 1;
    return m;
  }, {});
  console.log(`✓ factcheck_matches.json: ${matches.length} matches`, byVerdict, byType);
  console.log("  strongest:", matches.slice(0, 3).map((m) => `${Math.round(m.similarity_score * 100)}%`).join(", "));
}

main().catch((e) => (console.error("✗ match failed:", e.message), process.exit(1)));
