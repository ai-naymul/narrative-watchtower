/**
 * Precompute top-K dense nearest neighbors per document from the neural embeddings.
 * Ships as data/neighbors.json (small) so the runtime hybrid retriever can do dense
 * expansion with NO model at request time. Output: data/neighbors.json
 */
import { readData, writeData } from "./shared";
import type { EmbeddedDoc } from "./embed";

const K = 6;

async function main() {
  const emb = await readData<{ dim: number; docs: EmbeddedDoc[] }>("embeddings.json", { dim: 0, docs: [] });
  if (!emb.docs.length) throw new Error("No embeddings.json — run `npm run embed` first.");
  const n = emb.docs.length;
  const dim = emb.dim;
  // flat Float32 buffer for speed
  const buf = new Float32Array(n * dim);
  for (let i = 0; i < n; i++) buf.set(emb.docs[i].vec, i * dim);

  const neighbors: Record<string, { id: string; s: number }[]> = {};
  const t0 = Date.now();
  for (let i = 0; i < n; i++) {
    const off = i * dim;
    const top: { j: number; s: number }[] = [];
    let min = -1;
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      let s = 0;
      const off2 = j * dim;
      for (let d = 0; d < dim; d++) s += buf[off + d] * buf[off2 + d];
      if (top.length < K) {
        top.push({ j, s });
        if (top.length === K) {
          top.sort((a, b) => a.s - b.s);
          min = top[0].s;
        }
      } else if (s > min) {
        top[0] = { j, s };
        top.sort((a, b) => a.s - b.s);
        min = top[0].s;
      }
    }
    neighbors[emb.docs[i].id] = top
      .sort((a, b) => b.s - a.s)
      .map((t) => ({ id: emb.docs[t.j].id, s: Math.round(t.s * 1000) / 1000 }));
    if (i % 800 === 0) console.log(`  ${i}/${n} (${((Date.now() - t0) / 1000).toFixed(0)}s)`);
  }
  await writeData("neighbors.json", neighbors);
  console.log(`✓ neighbors.json: ${n} docs × top-${K} · ${((Date.now() - t0) / 1000).toFixed(0)}s`);
}

main().catch((e) => (console.error("✗ neighbors failed:", e.message), process.exit(1)));
