/**
 * Focused, READ-ONLY schema peek at the high-signal content collections.
 * Reveals nested object structure + value distributions the field-coverage audit
 * can't show. Touches only public news/fact-check collections (never users/PII).
 * Run: npx tsx scripts/peek.ts
 */
import { MongoClient } from "mongodb";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });
loadEnv();

const DB = "google_news_database";

/** Truncate deep values so output stays readable. */
function trunc(v: unknown, depth = 0): unknown {
  if (typeof v === "string") return v.length > 160 ? v.slice(0, 160) + "…" : v;
  if (Array.isArray(v)) return v.slice(0, 3).map((x) => trunc(x, depth + 1));
  if (v && typeof v === "object") {
    if ((v as { _bsontype?: string })._bsontype) return String(v);
    if (depth > 2) return "{…}";
    return Object.fromEntries(
      Object.entries(v as Record<string, unknown>).map(([k, val]) => [k, trunc(val, depth + 1)])
    );
  }
  return v;
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!, { readPreference: "secondaryPreferred" });
  await client.connect();
  const db = client.db(DB);

  // ---- rumor_checks: verdict taxonomy + sample ----
  console.log("\n================ rumor_checks ================");
  const rc = db.collection("rumor_checks");
  for (const field of ["verdict", "verdict_type", "confidence_tier", "category", "source"]) {
    const vals = await rc
      .aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 12 }])
      .toArray();
    console.log(`  ${field}:`, vals.map((v) => `${v._id}(${v.n})`).join(", "));
  }
  const rcSample = await rc.findOne({ verdict: { $exists: true } });
  console.log("  SAMPLE:", JSON.stringify(trunc(rcSample), null, 1));

  // ---- google_news_events: nested info/bias, distributions ----
  console.log("\n================ google_news_events ================");
  const ev = db.collection("google_news_events");
  for (const field of ["country_code", "language_code", "bangladesh_relevance_category", "is_bangladesh_news", "category"]) {
    const vals = await ev
      .aggregate([{ $group: { _id: `$${field}`, n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 15 }])
      .toArray();
    console.log(`  ${field}:`, vals.map((v) => `${v._id}(${v.n})`).join(", "));
  }
  console.log("  --- top sources ---");
  const srcs = await ev
    .aggregate([{ $group: { _id: "$source", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 25 }])
    .toArray();
  console.log("   ", srcs.map((v) => `${v._id}(${v.n})`).join(", "));
  const evSample = await ev.findOne({ is_bangladesh_news: true }, { sort: { published_at: -1 } });
  console.log("  SAMPLE (bangladesh, enriched):", JSON.stringify(trunc(evSample), null, 1));

  // ---- newsmedia: source registry with bias/geo ----
  console.log("\n================ newsmedia ================");
  const nm = db.collection("newsmedia");
  const geos = await nm
    .aggregate([{ $group: { _id: "$geo", n: { $sum: 1 } } }, { $sort: { n: -1 } }, { $limit: 20 }])
    .toArray();
  console.log("  geo:", geos.map((v) => `${v._id}(${v.n})`).join(", "));
  const nmSample = await nm.findOne({ bias: { $exists: true } });
  console.log("  SAMPLE (with bias):", JSON.stringify(trunc(nmSample), null, 1));

  // ---- opinions + youtube_videos: are these public-figure content? ----
  console.log("\n================ opinions ================");
  console.log("  SAMPLE:", JSON.stringify(trunc(await db.collection("opinions").findOne()), null, 1));
  console.log("\n================ youtube_videos ================");
  console.log("  SAMPLE:", JSON.stringify(trunc(await db.collection("youtube_videos").findOne()), null, 1));

  await client.close();
}

main().catch((e) => {
  console.error("peek failed:", e.message);
  process.exit(1);
});
