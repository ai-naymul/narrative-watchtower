/**
 * Phase 1 — MongoDB data audit (READ-ONLY).
 *
 * Connects to MONGODB_URI, walks every database/collection, samples documents,
 * infers schema + field coverage, detects date ranges / languages, and heuristically
 * classifies collections (article / fact-check / public-post / noisy). Writes a human
 * summary to data_audit.md and a machine summary to data/audit.json.
 *
 * Performs NO writes. Run: npm run audit:mongo
 */
import { MongoClient } from "mongodb";
import { config as loadEnv } from "dotenv";
import { promises as fs } from "node:fs";
import path from "node:path";

loadEnv({ path: ".env.local" });
loadEnv(); // fall back to .env

const SAMPLE = 200;
const BENGALI = /[ঀ-৿]/;

type Any = Record<string, unknown>;

function typeOf(v: unknown): string {
  if (v === null || v === undefined) return "null";
  if (Array.isArray(v)) return "array";
  if (v instanceof Date) return "date";
  if (typeof v === "object") {
    const ctor = (v as { _bsontype?: string })._bsontype;
    if (ctor === "ObjectId" || ctor === "ObjectID") return "objectId";
    return "object";
  }
  return typeof v;
}

function looksLikeDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (typeof v === "string" && /\d{4}-\d{2}-\d{2}/.test(v)) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2100) return d;
  }
  return null;
}

const has = (fields: Set<string>, ...names: string[]) => names.some((n) => fields.has(n));

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("✗ MONGODB_URI not set. Add it to .env.local (see .env.example).");
    process.exit(1);
  }

  const client = new MongoClient(uri, {
    readPreference: "secondaryPreferred",
    serverSelectionTimeoutMS: 20_000,
  });

  console.log("→ Connecting (read-only)…");
  await client.connect();
  console.log("✓ Connected.\n");

  const admin = client.db().admin();
  let dbs: { name: string }[];
  try {
    const res = await admin.listDatabases();
    // Keep `admin` — self-hosted deployments sometimes store data there. Skip only
    // the pure-system databases. System collections are skipped per-collection below.
    dbs = res.databases.filter((d) => !["local", "config"].includes(d.name));
  } catch {
    // Some Atlas users can't listDatabases; fall back to the URI's default db.
    const fallback = client.db().databaseName;
    dbs = [{ name: fallback }];
  }

  const md: string[] = [];
  const json: Any = { generated_at: new Date().toISOString(), databases: [] };
  md.push(`# Narrative Watchtower — MongoDB Data Audit\n`);
  md.push(`_Generated ${new Date().toISOString()} · READ-ONLY inspection._\n`);

  for (const { name: dbName } of dbs) {
    const db = client.db(dbName);
    const collections = await db.listCollections().toArray();
    md.push(`\n## Database: \`${dbName}\` — ${collections.length} collection(s)\n`);
    const dbJson: Any = { name: dbName, collections: [] };

    for (const coll of collections) {
      if (/^system\./.test(coll.name)) continue; // skip system.users, system.version, etc.
      const c = db.collection(coll.name);
      let count = 0;
      try {
        count = await c.estimatedDocumentCount();
      } catch {
        count = await c.countDocuments({}, { limit: 100_000 });
      }

      // sample
      let docs: Any[] = [];
      try {
        docs = (await c.aggregate([{ $sample: { size: SAMPLE } }]).toArray()) as Any[];
      } catch {
        docs = (await c.find({}).limit(SAMPLE).toArray()) as Any[];
      }

      // field coverage + types
      const coverage: Record<string, number> = {};
      const types: Record<string, Set<string>> = {};
      let bengali = 0;
      let english = 0;
      let minDate: Date | null = null;
      let maxDate: Date | null = null;

      for (const d of docs) {
        for (const [k, v] of Object.entries(d)) {
          coverage[k] = (coverage[k] || 0) + 1;
          (types[k] ||= new Set()).add(typeOf(v));
          const dt = looksLikeDate(v);
          if (dt) {
            if (!minDate || dt < minDate) minDate = dt;
            if (!maxDate || dt > maxDate) maxDate = dt;
          }
        }
        // language guess from any long text field
        const text = Object.values(d)
          .filter((v) => typeof v === "string")
          .join(" ")
          .slice(0, 2000);
        if (BENGALI.test(text)) bengali++;
        else if (/[a-zA-Z]{20,}/.test(text)) english++;
      }

      const fields = new Set(Object.keys(coverage));
      const n = docs.length || 1;
      const cov = (k: string) => `${Math.round(((coverage[k] || 0) / n) * 100)}%`;

      // heuristic classification
      const kind =
        has(fields, "verdict", "rating", "claim") ||
        /rumor|fact|check/i.test(coll.name)
          ? "fact_check?"
          : (has(fields, "platform", "username", "figure", "handle") &&
              has(fields, "text", "content", "caption", "message"))
          ? "public_post?"
          : has(fields, "title", "headline") &&
            has(fields, "body", "content", "text", "article")
          ? "article?"
          : count === 0
          ? "empty"
          : "other";

      const lang =
        bengali > english ? "mostly Bangla" : english > bengali ? "mostly English" : "mixed/unknown";

      const topFields = Object.entries(coverage)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 24)
        .map(([k]) => k);

      md.push(`\n### \`${coll.name}\` — ${count.toLocaleString()} docs · **${kind}**\n`);
      md.push(`- Sampled: ${docs.length} · Language: ${lang}`);
      if (minDate && maxDate)
        md.push(
          `- Date range (detected): ${minDate.toISOString().slice(0, 10)} → ${maxDate
            .toISOString()
            .slice(0, 10)}`
        );
      md.push(`\n| field | coverage | type(s) |`);
      md.push(`| --- | --- | --- |`);
      for (const k of topFields) {
        md.push(`| \`${k}\` | ${cov(k)} | ${[...(types[k] || [])].join(", ")} |`);
      }

      // relevance hints for our schema
      const hints: string[] = [];
      if (kind.startsWith("article"))
        hints.push(
          `article fields → title:${has(fields, "title", "headline")} body:${has(
            fields,
            "body",
            "content",
            "text"
          )} url:${has(fields, "url", "link")} date:${has(
            fields,
            "date",
            "published_at",
            "publishedAt",
            "pubdate"
          )} source:${has(fields, "source", "outlet", "publisher")} author:${has(
            fields,
            "author",
            "byline"
          )}`
        );
      if (kind.startsWith("fact_check"))
        hints.push(
          `factcheck fields → claim:${has(fields, "claim", "title")} verdict:${has(
            fields,
            "verdict",
            "rating"
          )} explanation:${has(fields, "explanation", "description", "body")} url:${has(
            fields,
            "url",
            "link"
          )}`
        );
      if (kind.startsWith("public_post"))
        hints.push(
          `post fields → figure:${has(fields, "figure", "name", "author")} platform:${has(
            fields,
            "platform",
            "source"
          )} text:${has(fields, "text", "content", "caption")} engagement:${has(
            fields,
            "likes",
            "shares",
            "engagement",
            "reactions"
          )}`
        );
      if (hints.length) md.push(`\n> ${hints.join(" · ")}`);

      dbJson.collections.push({
        name: coll.name,
        count,
        sampled: docs.length,
        kind,
        language: lang,
        date_range:
          minDate && maxDate
            ? { from: minDate.toISOString(), to: maxDate.toISOString() }
            : null,
        fields: Object.fromEntries(
          topFields.map((k) => [k, { coverage: cov(k), types: [...(types[k] || [])] }])
        ),
      });
    }
    (json.databases as Any[]).push(dbJson);
  }

  await client.close();

  await fs.writeFile("data_audit.md", md.join("\n"), "utf-8");
  await fs.mkdir(path.join("data"), { recursive: true });
  await fs.writeFile(path.join("data", "audit.json"), JSON.stringify(json, null, 2), "utf-8");

  console.log("✓ Wrote data_audit.md and data/audit.json");
  console.log("\nSummary:");
  for (const db of json.databases as Any[]) {
    for (const coll of (db as Any).collections as Any[]) {
      const c = coll as Any;
      console.log(
        `  ${(db as Any).name}.${c.name}: ${(c.count as number).toLocaleString()} docs [${c.kind}] ${c.language}`
      );
    }
  }
}

main().catch((err) => {
  console.error("✗ Audit failed:", err.message);
  process.exit(1);
});
