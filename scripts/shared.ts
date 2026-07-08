/**
 * Shared helpers for the offline pipeline (curate / embed / analyze / build_demo).
 * READ-ONLY with respect to MongoDB. Type contracts are single-sourced from the app.
 */
import { MongoClient, type Db } from "mongodb";
import { config as loadEnv } from "dotenv";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { SourceType, Language } from "../src/lib/types";

loadEnv({ path: ".env.local" });
loadEnv();

export const CONTENT_DB = "google_news_database";
export const DATA_DIR = path.join(process.cwd(), "data");
export const FIGURE_DIR =
  "/media/escobar/C85A85AC5A8597B8/workspace/UpworksStuff/fb_scraping_test/fb-page-scraper/output";

// ---------------------------------------------------------------------------
// Mongo (read-only)
// ---------------------------------------------------------------------------
let client: MongoClient | null = null;
export async function contentDb(): Promise<Db> {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URI!, {
      readPreference: "secondaryPreferred",
      serverSelectionTimeoutMS: 20_000,
    });
    await client.connect();
  }
  return client.db(CONTENT_DB);
}
export async function closeDb() {
  if (client) await client.close();
  client = null;
}

// ---------------------------------------------------------------------------
// Source classification
// ---------------------------------------------------------------------------
const INDIAN = [
  "anandabazar", "abp ananda", "abp", "times of india", "hindustan times", "ndtv",
  "india today", "republic", "zee", "the hindu", "telegraph india", "the telegraph",
  "sangbad pratidin", "bartaman", "ei samay", "news18", "firstpost", "swarajya",
  "opindia", "dainik", "aaj tak", "wion", "the wire", "scroll.in", "the print",
  "deccan", "kolkata", "24 ghanta", "24 ghonta", "indian express", "ians",
];
const BD = [
  "prothom alo", "prothomalo", "daily star", "thedailystar", "ittefaq", "bdnews24",
  "jugantor", "kaler kantho", "kalerkantho", "samakal", "bd-pratidin", "bangladesh pratidin",
  "banglanews24", "jagonews24", "jago news", "dhaka tribune", "new age", "bss",
  "bangladesh sangbad sangstha", "rtv", "somoy", "jamuna", "channel 24", "channel24",
  "dhaka post", "dhakapost", "ekattor", "dbc", "desh rupantor", "amader shomoy", "kalbela",
  "manab zamin", "naya diganta", "inqilab", "sangram", "risingbd", "bonik barta",
  "business standard", "tbsnews", "dhakatimes", "barta24", "ajker patrika", "protidin",
];
const FOREIGN = [
  "bbc", "reuters", "associated press", "al jazeera", "aljazeera", "cnn", "the guardian",
  "new york times", "washington post", "afp", "deutsche welle", "dw", "voa",
  "voice of america", "anadolu", "the diplomat", "nikkei",
];
const FACTCHECK = ["rumor_scanner", "rumor scanner", "rumorscanner"];

/** Classify a source by name (and optional geo hint from newsmedia). */
export function classifySource(
  nameRaw: string,
  geo?: string | null
): { type: SourceType; country: string } {
  const n = (nameRaw || "").toLowerCase().trim();
  const g = (geo || "").toLowerCase();
  if (FACTCHECK.some((s) => n.includes(s))) return { type: "fact_checker", country: "BD" };
  if (INDIAN.some((s) => n.includes(s)) || g === "in" || g === "india")
    return { type: "indian_media", country: "IN" };
  if (BD.some((s) => n.includes(s)) || g === "bd" || g === "bangladesh")
    return { type: "bangladesh_media", country: "BD" };
  if (FOREIGN.some((s) => n.includes(s))) return { type: "foreign_media", country: g.toUpperCase() || "XX" };
  // fall back on geo if present
  if (g === "in") return { type: "indian_media", country: "IN" };
  if (g === "bd") return { type: "bangladesh_media", country: "BD" };
  return { type: "other", country: g ? g.toUpperCase() : "" };
}

// ---------------------------------------------------------------------------
// Normalization helpers
// ---------------------------------------------------------------------------
export function toISO(v: unknown): string | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  if (typeof v === "number") {
    const d = new Date(v < 1e12 ? v * 1000 : v);
    return Number.isNaN(d.getTime()) ? null : d.toISOString();
  }
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime()) && d.getFullYear() > 2000 && d.getFullYear() < 2100)
      return d.toISOString();
  }
  return null;
}

/** Does this text concern Bangladesh? Used to keep only Bangladesh-relevant
 *  coverage from Indian/foreign outlets (drop their domestic news). */
const BD_MENTION =
  /বাংলাদেশ|bangladesh|ঢাকা|dhaka|হাসিনা|hasina|ইউনূস|yunus|আওয়ামী|awami|বিএনপি|\bbnp\b|জামায়াত|jamaat|jamaat-e-islami|তারেক|tarique|খালেদা|khaleda|চট্টগ্রাম|chattogram|chittagong|রোহিঙ্গা|rohingya|শেখ মুজিব|mujib|পদ্মা|নাহিদ ইসলাম|সারজিস|হাসনাত|hasnat|sarjis|nahid islam|যমুনা|জুলাই আন্দোলন|ছাত্রলীগ|ছাত্রদল|শিবির|padma|শেখ হাসিনা|জাতীয় নাগরিক|dhaka university|ঢাকা বিশ্ববিদ্যালয়/i;
export function mentionsBangladesh(text: string): boolean {
  return BD_MENTION.test(text || "");
}

const BENGALI = /[ঀ-৿]/;
export function detectLang(text: string): Language {
  const hasBn = BENGALI.test(text);
  const hasEn = /[a-zA-Z]{15,}/.test(text);
  if (hasBn && hasEn) return "mixed";
  if (hasBn) return "bn";
  if (hasEn) return "en";
  return "other";
}

/** Collapse whitespace and strip markdown link scaffolding / boilerplate. */
export function cleanText(s: string): string {
  return (s || "")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // markdown links → text
    .replace(/https?:\/\/\S+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Split long text into ~maxChars chunks on sentence-ish boundaries. */
export function chunkText(text: string, maxChars = 1100, overlap = 120): string[] {
  const t = cleanText(text);
  if (t.length <= maxChars) return t ? [t] : [];
  const chunks: string[] = [];
  let i = 0;
  while (i < t.length) {
    let end = Math.min(i + maxChars, t.length);
    if (end < t.length) {
      const slice = t.slice(i, end);
      const brk = Math.max(slice.lastIndexOf("। "), slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
      if (brk > maxChars * 0.5) end = i + brk + 1;
    }
    chunks.push(t.slice(i, end).trim());
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks.filter(Boolean);
}

export function slugify(s: string): string {
  return (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9ঀ-৿]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Deterministic short id from a seed string (no randomness — stable across runs). */
export function hashId(seed: string): string {
  let h = 5381;
  for (let i = 0; i < seed.length; i++) h = ((h << 5) + h + seed.charCodeAt(i)) >>> 0;
  return h.toString(36);
}

// ---------------------------------------------------------------------------
// IO helpers
// ---------------------------------------------------------------------------
export async function writeData(file: string, data: unknown) {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(path.join(DATA_DIR, file), JSON.stringify(data), "utf-8");
}
export async function readData<T>(file: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(path.join(DATA_DIR, file), "utf-8")) as T;
  } catch {
    return fallback;
  }
}

export interface FigureFile {
  figureKey: string; // filename without extension
  pageName: string;
  posts: Array<{
    post_id: string;
    content: string;
    created_at: string;
    reactions_count?: number;
    comment_count?: number;
    share_count?: number;
    post_url?: string;
    media_type?: string;
    author?: { name?: string };
  }>;
}

/** Load all readable public-figure post files (skips _state* and unreadable). */
export async function loadFigureFiles(): Promise<FigureFile[]> {
  const entries = await fs.readdir(FIGURE_DIR);
  const files = entries.filter((f) => f.endsWith(".json") && !f.startsWith("_")).sort();
  const out: FigureFile[] = [];
  for (const f of files) {
    try {
      const raw = await fs.readFile(path.join(FIGURE_DIR, f), "utf-8");
      const data = JSON.parse(raw);
      const posts = Array.isArray(data) ? data : data.posts || [];
      if (!posts.length) continue;
      out.push({
        figureKey: f.replace(/\.json$/, ""),
        pageName: (data.page && (data.page.name || data.page)) || f.replace(/\.json$/, "").replace(/_/g, " "),
        posts,
      });
    } catch {
      // unreadable (e.g. Independent_Television.json EINVAL) — skip
    }
  }
  return out;
}
