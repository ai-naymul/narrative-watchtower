/**
 * Neural embeddings (offline, local, no API key).
 *
 * Embeds every curated document with a multilingual transformer (multilingual-e5)
 * that handles Bangla + English and cross-lingual matching. Output: data/embeddings.json
 * — consumed offline by match_rumors.ts, the hybrid retriever prep, and the narrative map.
 * The model runs ONLY here; runtime never loads it (serves precomputed artifacts).
 */
import { pipeline } from "@huggingface/transformers";
import { readData } from "./shared";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { SentinelDocument } from "../src/lib/types";

const MODEL = process.env.EMBED_HF_MODEL || "Xenova/multilingual-e5-small";
const POOLING = (process.env.EMBED_POOLING || "mean") as "mean" | "cls";
const DOC_PREFIX = process.env.EMBED_DOC_PREFIX ?? "passage: "; // e5 convention
const BATCH = 48;

export interface EmbeddedDoc {
  id: string;
  doc_type: SentinelDocument["doc_type"];
  vec: number[];
}

async function main() {
  const docs = await readData<SentinelDocument[]>("documents.json", []);
  if (!docs.length) throw new Error("No documents.json — run curate first.");
  console.log(`Embedding ${docs.length} documents with ${MODEL}…`);

  const extractor = await pipeline("feature-extraction", MODEL);
  const out: EmbeddedDoc[] = [];
  const t0 = Date.now();

  for (let i = 0; i < docs.length; i += BATCH) {
    const batch = docs.slice(i, i + BATCH);
    const texts = batch.map((d) => DOC_PREFIX + `${d.title}. ${d.text}`.slice(0, 1200));
    const res = await extractor(texts, { pooling: POOLING, normalize: true });
    const vecs = res.tolist() as number[][];
    batch.forEach((d, j) => out.push({ id: d.id, doc_type: d.doc_type, vec: vecs[j] }));
    if (i % (BATCH * 10) === 0)
      console.log(`  ${Math.min(i + BATCH, docs.length)}/${docs.length} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }

  const dim = out[0]?.vec.length ?? 0;
  await fs.mkdir(path.join(process.cwd(), "data"), { recursive: true });
  await fs.writeFile(
    path.join(process.cwd(), "data", "embeddings.json"),
    JSON.stringify({ model: MODEL, dim, docs: out }),
    "utf-8"
  );
  console.log(`✓ embeddings.json: ${out.length} vectors · dim=${dim} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

main().catch((e) => (console.error("✗ embed failed:", e.message), process.exit(1)));
