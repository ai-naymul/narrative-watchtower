/**
 * Core domain model for Narrative Watchtower.
 * These interfaces are the contract between the offline AI pipeline (scripts/)
 * and the runtime dashboard. They mirror the pgvector-ready schema in the design
 * spec 1:1 — at runtime they live as bundled JSON in /data.
 */

export type SourceType =
  | "bangladesh_media"
  | "indian_media"
  | "fact_checker"
  | "public_figure"
  | "foreign_media"
  | "other";

export type DocType = "article" | "fact_check" | "public_post";

export type Language = "bn" | "en" | "mixed" | "other";

export type RiskLevel = "low" | "medium" | "high";

/** Fact-check verdicts — aligned with Rumor Scanner's taxonomy. */
export type Verdict =
  | "false"
  | "misleading"
  | "distorted"
  | "true"
  | "unverified";

export type FramingTag =
  | "alarmist"
  | "communal"
  | "geopolitical"
  | "pro-government"
  | "anti-government"
  | "sovereignty-focused"
  | "india-centric"
  | "security-focused"
  | "neutral";

export interface Source {
  id: string;
  name: string;
  domain: string | null;
  country: string | null;
  type: SourceType;
  political_orientation?: string | null;
  created_at: string;
}

export interface EvidenceSnippet {
  document_id: string;
  quote: string;
  url: string | null;
  source_name: string;
  published_at: string | null;
}

export interface SentinelDocument {
  id: string;
  raw_source_id: string | null; // original Mongo _id for traceability
  source_id: string;
  doc_type: DocType;
  title: string;
  text: string;
  url: string | null;
  author: string | null;
  published_at: string | null;
  language: Language;
  country_context: string | null;
  // AI-derived, cached:
  topics?: string[];
  framing_tags?: FramingTag[];
  tone?: "alarmist" | "neutral" | "factual" | "opinion";
  national_security_relevance?: number; // 0-1
  communal_sensitivity?: number; // 0-1
  cross_border_relevance?: number; // 0-1
  misinformation_likelihood?: number; // 0-1
  metadata?: Record<string, unknown>;
  created_at: string;
}

export interface Chunk {
  id: string;
  document_id: string;
  chunk_text: string;
  embedding: number[];
  metadata?: Record<string, unknown>;
}

export interface RiskFactor {
  key: string;
  label: string;
  weight: number; // contribution 0-1
  value: number; // observed 0-1
  detail: string;
}

export interface RiskScore {
  score: number; // 0-100
  level: RiskLevel;
  factors: RiskFactor[]; // explainable breakdown
  rationale: string;
}

export interface Narrative {
  id: string;
  title: string;
  summary: string; // one-sentence AI summary
  why_it_matters: string;
  risk: RiskScore;
  tags: FramingTag[];
  track:
    | "internal_politics"
    | "india_bangladesh"
    | "communal_misinfo"
    | "national_security"
    | "foreign_framing";
  document_ids: string[];
  entity_ids: string[];
  factcheck_ids: string[];
  timeline: { date: string; count: number }[];
  evidence: EvidenceSnippet[];
  generated_at: string;
}

export interface Entity {
  id: string;
  name: string;
  type: "person" | "organization" | "party" | "country" | "location" | "media_outlet";
  aliases: string[];
  metadata?: Record<string, unknown>;
}

export interface FactcheckMatch {
  id: string;
  claim_document_id: string; // a current article/post
  factcheck_document_id: string; // the Rumor Scanner report
  verdict: Verdict;
  similarity_score: number; // 0-1
  explanation: string;
  created_at: string;
}

/** A framing comparison between Bangladeshi and Indian/foreign coverage of one topic. */
export interface CrossBorderCase {
  id: string;
  topic: string;
  event_summary: string;
  bd_emphasis: string[];
  foreign_emphasis: string[];
  common_facts: string[];
  divergent_facts: string[];
  missing_or_amplified: string[];
  bd_framing_tags: FramingTag[];
  foreign_framing_tags: FramingTag[];
  framing_gap_explanation: string; // AI-generated, with citations
  bd_evidence: EvidenceSnippet[];
  foreign_evidence: EvidenceSnippet[];
  factcheck_ids: string[];
  web_collected: boolean; // true if foreign sources were scraped for the demo
}

export interface PublicFigure {
  entity_id: string;
  name: string;
  role?: string | null;
  platforms: string[];
  post_ids: string[];
  post_count_total?: number; // total scraped posts (curated set = post_ids)
  top_topics: { topic: string; count: number }[];
  connected_narrative_ids: string[];
  position_timeline: { date: string; summary: string; document_id: string }[];
  ai_summary: string; // careful, non-defamatory
  evidence: EvidenceSnippet[];
}

/** A preloaded, reliable demo story. */
export interface DemoStory {
  id: string;
  slug: string;
  title: string;
  kind: "cross_border" | "communal_misinfo" | "internal_political";
  hook: string;
  steps: { title: string; body: string; ref?: string }[];
  narrative_id?: string;
  cross_border_id?: string;
}

export interface CopilotCitation {
  document_id: string;
  quote: string;
  url: string | null;
  source_name: string;
}

export interface CopilotAnswer {
  answer: string;
  citations: CopilotCitation[];
  confidence: "high" | "medium" | "low";
  caveat?: string;
}

/** Aggregate metrics for the Overview page. */
export interface OverviewStats {
  documents: number;
  articles: number;
  public_posts: number;
  fact_checks: number;
  narratives: number;
  sources: number;
  entities: number;
  date_range: { from: string | null; to: string | null };
  top_sources: { name: string; count: number }[];
  top_figures: { name: string; count: number }[];
  top_risk_topics: { title: string; score: number }[];
  generated_at: string;
}
