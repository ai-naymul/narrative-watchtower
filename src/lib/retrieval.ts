import { cache } from "react";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getDocuments } from "./data";
import type { SentinelDocument } from "./types";

/** Precomputed dense nearest-neighbors (from multilingual embeddings) for hybrid expansion. */
const loadNeighbors = cache(async (): Promise<Record<string, { id: string; s: number }[]>> => {
  try {
    return JSON.parse(await fs.readFile(path.join(process.cwd(), "data", "neighbors.json"), "utf-8"));
  } catch {
    return {};
  }
});

/**
 * Lexical retrieval over the curated corpus — no embeddings required.
 *
 * A BM25-lite scorer over title+text works well on a small, high-signal corpus
 * and handles Bangla + English (both are largely space-delimited). This grounds
 * the Analyst Copilot: every answer is built only from retrieved documents.
 */

const STOP = new Set([
  "the", "a", "an", "and", "or", "of", "to", "in", "on", "for", "is", "are", "was", "were",
  "what", "which", "who", "how", "why", "when", "about", "with", "that", "this", "these",
  "those", "has", "have", "do", "does", "did", "any", "are", "recent", "recently",
]);

function tokenize(s: string): string[] {
  return (s || "")
    .toLowerCase()
    .split(/[^a-z0-9ঀ-৿]+/)
    .filter((t) => t.length > 1 && !STOP.has(t));
}

interface Indexed {
  doc: SentinelDocument;
  tf: Map<string, number>;
  len: number;
}

interface CorpusIndex {
  items: Indexed[];
  idf: Map<string, number>;
  avgLen: number;
}

const buildIndex = cache(async (): Promise<CorpusIndex> => {
  const docs = await getDocuments();
  const df = new Map<string, number>();
  const items: Indexed[] = docs.map((doc) => {
    const tokens = tokenize(`${doc.title} ${doc.text}`);
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    return { doc, tf, len: tokens.length };
  });
  const N = items.length || 1;
  const idf = new Map<string, number>();
  for (const [t, n] of df) idf.set(t, Math.log(1 + (N - n + 0.5) / (n + 0.5)));
  const avgLen = items.reduce((s, i) => s + i.len, 0) / N;
  return { items, idf, avgLen };
});

export interface Retrieved {
  doc: SentinelDocument;
  score: number;
}

/**
 * HYBRID retrieval: BM25 (sparse) seed + dense expansion using precomputed
 * multilingual-embedding neighbors. The dense step surfaces semantically related
 * documents BM25 misses (incl. cross-lingual paraphrases) with no runtime model.
 */
const DENSE_WEIGHT = 0.5;

export async function retrieve(
  query: string,
  k = 8,
  docTypes?: SentinelDocument["doc_type"][]
): Promise<Retrieved[]> {
  const { items, idf, avgLen } = await buildIndex();
  const neighbors = await loadNeighbors();
  const byId = new Map(items.map((it) => [it.doc.id, it]));
  const allowed = (t: SentinelDocument["doc_type"]) => !docTypes || docTypes.includes(t);

  const qTokens = [...new Set(tokenize(query))];
  const k1 = 1.5;
  const b = 0.75;

  // 1) BM25 sparse scores
  const bm25 = new Map<string, number>();
  for (const it of items) {
    if (!allowed(it.doc.doc_type)) continue;
    let score = 0;
    for (const t of qTokens) {
      const f = it.tf.get(t);
      if (!f) continue;
      const idfT = idf.get(t) || 0;
      score += (idfT * (f * (k1 + 1))) / (f + k1 * (1 - b + (b * it.len) / avgLen));
    }
    if (score > 0) bm25.set(it.doc.id, score);
  }

  // 2) dense expansion from the strongest BM25 hits
  const combined = new Map<string, number>(bm25);
  const topHits = [...bm25.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const maxBm = topHits[0]?.[1] || 1;
  for (const [docId, sc] of topHits) {
    for (const nb of neighbors[docId] || []) {
      const it = byId.get(nb.id);
      if (!it || !allowed(it.doc.doc_type)) continue;
      const contrib = sc * nb.s * DENSE_WEIGHT; // scaled into BM25 range
      combined.set(nb.id, (combined.get(nb.id) || 0) + contrib);
    }
  }

  return [...combined.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id, score]) => ({ doc: byId.get(id)!.doc, score }));
}
