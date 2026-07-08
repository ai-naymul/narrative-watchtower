import { promises as fs } from "node:fs";
import path from "node:path";
import { cache } from "react";
import type {
  Narrative,
  CrossBorderCase,
  FactcheckMatch,
  PublicFigure,
  DemoStory,
  OverviewStats,
  SentinelDocument,
  Chunk,
  CopilotAnswer,
} from "./types";

/**
 * Runtime data access layer.
 *
 * The deployed dashboard serves PRECOMPUTED intelligence bundled as JSON in
 * /data (produced by the offline pipeline in scripts/). Every loader degrades
 * gracefully: if the pipeline has not run yet, it returns an empty fallback so
 * the UI renders an honest "awaiting data" state instead of crashing.
 */

const DATA_DIR = path.join(process.cwd(), "data");

async function loadJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(path.join(DATA_DIR, file), "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export const getOverviewStats = cache(
  async (): Promise<OverviewStats | null> => loadJson<OverviewStats | null>("overview.json", null)
);

export const getNarratives = cache(
  async (): Promise<Narrative[]> => loadJson<Narrative[]>("narratives.json", [])
);

export const getNarrative = cache(async (id: string): Promise<Narrative | null> => {
  const all = await getNarratives();
  return all.find((n) => n.id === id) ?? null;
});

export const getCrossBorderCases = cache(
  async (): Promise<CrossBorderCase[]> => loadJson<CrossBorderCase[]>("cross_border.json", [])
);

export const getRumorMatches = cache(
  async (): Promise<FactcheckMatch[]> => loadJson<FactcheckMatch[]>("factcheck_matches.json", [])
);

export const getPublicFigures = cache(
  async (): Promise<PublicFigure[]> => loadJson<PublicFigure[]>("public_figures.json", [])
);

export const getDemoStories = cache(
  async (): Promise<DemoStory[]> => loadJson<DemoStory[]>("demo_stories.json", [])
);

export const getPublicFigure = cache(async (id: string): Promise<PublicFigure | null> => {
  const all = await getPublicFigures();
  return all.find((f) => f.entity_id === id) ?? null;
});

/** All curated Rumor Scanner fact-check documents, newest first. */
export const getFactChecks = cache(async (): Promise<SentinelDocument[]> => {
  const docs = await getDocuments();
  return docs
    .filter((d) => d.doc_type === "fact_check")
    .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""));
});

/** All curated posts for one figure, newest first. */
export const getFigurePosts = cache(async (figureKey: string): Promise<SentinelDocument[]> => {
  const docs = await getDocuments();
  return docs
    .filter((d) => d.doc_type === "public_post" && d.metadata?.figure_key === figureKey)
    .sort((a, b) => (b.published_at || "").localeCompare(a.published_at || ""));
});

export const getDocuments = cache(
  async (): Promise<SentinelDocument[]> => loadJson<SentinelDocument[]>("documents.json", [])
);

export const getChunks = cache(
  async (): Promise<Chunk[]> => loadJson<Chunk[]>("chunks.json", [])
);

/** Evaluation metrics for the Methodology page. */
export const getEval = cache(
  async (): Promise<Record<string, unknown> | null> => loadJson<Record<string, unknown> | null>("eval.json", null)
);

/** Entity connection graph (figures ↔ narratives ↔ outlets). */
export const getGraph = cache(
  async (): Promise<{ nodes: unknown[]; links: unknown[] }> =>
    loadJson<{ nodes: unknown[]; links: unknown[] }>("graph.json", { nodes: [], links: [] })
);

/** Precomputed Copilot answers for canonical demo questions (bulletproof fallback). */
export const getCopilotCache = cache(
  async (): Promise<(CopilotAnswer & { question: string })[]> =>
    loadJson<(CopilotAnswer & { question: string })[]>("copilot_cache.json", [])
);

/** True once the offline pipeline has produced its core artifacts. */
export const isPipelineReady = cache(async (): Promise<boolean> => {
  const stats = await getOverviewStats();
  return stats !== null;
});
