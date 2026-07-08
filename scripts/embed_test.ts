/** Feasibility test: load a multilingual embedding model, embed BN+EN text. */
import { pipeline } from "@huggingface/transformers";

const MODEL = process.env.EMBED_HF_MODEL || "Xenova/bge-m3";
const POOLING = (process.env.EMBED_POOLING || "cls") as "cls" | "mean";
const PREFIX = process.env.EMBED_PREFIX || ""; // e5 wants "query: "

async function main() {
  console.log("loading", MODEL, "…");
  const t0 = Date.now();
  const extractor = await pipeline("feature-extraction", MODEL);
  console.log(`model loaded in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const texts = [
    "শেখ হাসিনাকে ফেরাতে দিল্লিকে চিঠি পাঠিয়েছে ঢাকা",
    "Dhaka sent a letter to Delhi seeking Sheikh Hasina's extradition",
    "India-Bangladesh border push-in crisis",
  ];
  const t1 = Date.now();
  const out = await extractor(texts.map((t) => PREFIX + t), { pooling: POOLING, normalize: true });
  const dims = out.dims;
  console.log(`embedded ${texts.length} texts in ${((Date.now() - t1) / 1000).toFixed(1)}s · dims=${JSON.stringify(dims)}`);

  // cosine between the BN and EN paraphrase (should be high) vs unrelated
  const arr = out.tolist() as number[][];
  const cos = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);
  console.log("cos(BN-Hasina, EN-Hasina) =", cos(arr[0], arr[1]).toFixed(3), "(expect high, cross-lingual)");
  console.log("cos(BN-Hasina, border)    =", cos(arr[0], arr[2]).toFixed(3), "(expect lower)");
}
main().catch((e) => (console.error("FAILED:", e.message), process.exit(1)));
