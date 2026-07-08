/**
 * READ-ONLY inspection of the Facebook page-scraper output (public figure posts).
 * Prints per-file post counts + the structure of a couple of samples so we can
 * design normalization. Handles unreadable files gracefully.
 * Run: npx tsx scripts/peek_figures.ts
 */
import { promises as fs } from "node:fs";
import path from "node:path";

const DIR =
  "/media/escobar/C85A85AC5A8597B8/workspace/UpworksStuff/fb_scraping_test/fb-page-scraper/output";

function trunc(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.length > 140 ? v.slice(0, 140) + "…" : v;
  if (Array.isArray(v)) return v.slice(0, 2).map((x) => trunc(x, depth + 1));
  if (v && typeof v === "object") {
    if (depth > 2) return "{…}";
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, trunc(val, depth + 1)])
    );
  }
  return v;
}

/** Find the array of posts inside whatever wrapper the file uses. */
function extractPosts(data: unknown): unknown[] {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") {
    for (const key of ["posts", "data", "results", "items"]) {
      const v = (data as Record<string, unknown>)[key];
      if (Array.isArray(v)) return v;
    }
  }
  return [];
}

async function main() {
  const entries = await fs.readdir(DIR);
  const files = entries.filter((f) => f.endsWith(".json") && !f.startsWith("_")).sort();

  let total = 0;
  const unreadable: string[] = [];
  const structurePrinted = new Set<string>();

  console.log(`Found ${files.length} figure files.\n`);
  for (const f of files) {
    const full = path.join(DIR, f);
    let raw: string;
    try {
      raw = await fs.readFile(full, "utf-8");
    } catch (e) {
      unreadable.push(`${f} (${(e as Error).message})`);
      continue;
    }
    let data: unknown;
    try {
      data = JSON.parse(raw);
    } catch (e) {
      unreadable.push(`${f} (parse: ${(e as Error).message})`);
      continue;
    }
    const posts = extractPosts(data);
    total += posts.length;
    const wrapperKeys =
      data && typeof data === "object" && !Array.isArray(data)
        ? Object.keys(data as object).join(",")
        : "(array)";
    console.log(`${f.replace(".json", "").padEnd(34)} posts=${String(posts.length).padStart(5)}  wrapper=[${wrapperKeys}]`);

    // print structure of first 2 distinct-shaped files
    if (structurePrinted.size < 2 && posts.length > 0) {
      structurePrinted.add(f);
      console.log(`   post keys: ${Object.keys(posts[0] as object).join(", ")}`);
      console.log(`   SAMPLE: ${JSON.stringify(trunc(posts[0]))}\n`);
    }
  }

  console.log(`\nTOTAL posts across ${files.length} files: ${total.toLocaleString()}`);
  if (unreadable.length) console.log(`Unreadable: ${unreadable.join("; ")}`);
}

main().catch((e) => {
  console.error("failed:", e.message);
  process.exit(1);
});
