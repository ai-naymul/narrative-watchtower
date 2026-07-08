# Narrative Watchtower

**AI-powered public-source narrative intelligence for Bangladesh's information security.**

Built for the **SciBlitz AI Challenge 2026** (IEEE Student Branch, CUET) — **Track E: National Defence**.

> **🔴 Live demo (no login):** https://narrative-watchtower.vercel.app
> **🧠 AI:** narrative analysis by **Claude Opus 4.8** + local **multilingual-e5** embeddings — precomputed offline, served as bundled JSON.
> The project report and Model & Data Card are submitted separately per the competition process.

Modern national security is shaped not only by borders but by information flows. In Bangladesh,
public narratives move quickly across local media, foreign media, fact-checkers, and political
actors — and a distorted or communal claim can create diplomatic pressure or communal tension before
institutions respond. Narrative Watchtower is a **public-source OSINT and narrative-intelligence
dashboard** that detects emerging narratives, compares cross-border media framing, matches claims
against fact-checks, and gives analysts **evidence-backed early warnings**.

> This is **not** a surveillance product. It uses only public-source data, never identifies private
> citizens, never assigns guilt or intent, links evidence for every claim, flags uncertainty, and
> requires human analyst review. It is designed for democratic resilience and misinformation response.

## Features

- **Overview** — mission + live corpus metrics and emerging risks.
- **Narrative Explorer** — clusters of articles/posts/fact-checks with AI summaries and explainable risk.
- **Cross-Border Framing** — how Bangladeshi vs Indian/foreign outlets frame the same event, with an AI framing-gap explanation and citations.
- **Rumor Risk Center** — matches current coverage against Rumor Scanner fact-checks (verdicts: false / misleading / distorted).
- **Public Figure Tracker** — recent emphasis and connected narratives from public posts (evidence only, non-defamatory).
- **Analyst Copilot** — retrieval-grounded chat; every answer carries citations + a confidence level.
- **Demo Mode** — three preloaded, reliable intelligence stories for judging.
- **Methodology** — full transparency on data, pipeline, scoring, and ethics.

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend + API | Next.js 16 (App Router) · TypeScript · Tailwind CSS v4 |
| UI | Custom dark "intelligence console" design system · lucide-react · d3-force graph |
| Reasoning | **Claude Opus 4.8 (1M context)** — narrative clustering, cross-border framing, figure summaries (offline) |
| Embeddings | **multilingual-e5** (Transformers.js/ONNX, local, 384-dim) — Bangla + English, cross-lingual |
| Retrieval | Hybrid: BM25 sparse + dense embedding-neighbor expansion (no runtime model) |
| Raw data | MongoDB (read-only) — scraped articles, fact-checks, public posts |
| Deploy | Vercel (public URL, no login, no runtime secrets) |

## Architecture — precompute offline, serve intelligence at runtime

All expensive/flaky AI (embeddings, clustering, cross-border framing, claim matching, risk, graph)
runs **offline** in `scripts/` and is cached to `data/*.json`. The deployed app serves that precomputed
intelligence — fast, cheap, and unbreakable during judging, with **no runtime secrets**. The Analyst
Copilot does hybrid retrieval + a grounded answer (precomputed cache + optional live Claude synthesis).

```
MongoDB + FB posts + Rumor Scanner
   → curate → embed (multilingual-e5, local) → Claude Opus 4.8 analysis (offline)
   → match (cross-lingual) · neighbors · graph · risk · eval
   → data/*.json (bundled) → Next.js on Vercel → dashboard + /api/copilot (hybrid retrieval)
```

## Setup

```bash
# 1. Install
npm install

# 2. Configure (offline pipeline only; runtime needs NO secrets)
cp .env.example .env.local
#   MONGODB_URI=...            (read-only, for the data pipeline)
#   ANTHROPIC_API_KEY=...      (optional — enables live Copilot synthesis)

# 3. Run the offline pipeline (produces data/*.json)
npm run audit:mongo    # inspect the database (read-only) → data_audit.md
npm run curate         # normalise + curate the high-signal corpus
npm run reindex        # embed (multilingual-e5) → match → neighbors → graph → eval
#   Narrative / cross-border / figure analysis is run via Claude Opus 4.8 (see scripts/).
npm run assemble && npm run build-demo

# 4. Develop / build
npm run dev            # http://localhost:3000
npm run build && npm start
```

The deployed app needs **no runtime secrets** — all intelligence is bundled JSON. It shows an honest
"awaiting data" state until the pipeline has produced `data/*.json`.

## Attributions

- **Rumor Scanner Bangladesh** — fact-check reference data (verdict taxonomy: false / misleading / unverified / satire).
- **Claude Opus 4.8** (Anthropic) — narrative/framing/figure analysis and optional Copilot synthesis, used under Anthropic's terms.
- **multilingual-e5** embedding model, run locally via **Transformers.js / ONNX Runtime** (no data leaves for embeddings).
- Open-source: Next.js, React, Tailwind CSS, MongoDB Node driver, d3-force, lucide-react.
- Indian/foreign coverage of Bangladesh is drawn from the provided corpus (Anandabazar Patrika, ABP Ananda, etc.); no separate scraping was needed.

See the **Methodology** page in-app and the Model & Data Card for full detail on data, models, limitations, and ethics.
