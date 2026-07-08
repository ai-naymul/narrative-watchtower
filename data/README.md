# data/

Bundled, precomputed intelligence — the **runtime source of truth** for the deployed dashboard.

These files are produced by the offline pipeline in `scripts/` and committed so the app can serve
them instantly on Vercel with no external database:

| File | Produced by | Contents |
| --- | --- | --- |
| `audit.json`, `../data_audit.md` | `npm run audit:mongo` | Read-only MongoDB schema audit |
| `documents.json` | `npm run curate` | Curated, normalised, deduped documents |
| `chunks.json` | `npm run embed` | Chunk text + Gemini embeddings |
| `narratives.json` | `npm run analyze` | Narrative clusters + summaries + risk |
| `cross_border.json` | `npm run analyze` | Framing comparisons |
| `factcheck_matches.json` | `npm run analyze` | Rumor Scanner matches |
| `public_figures.json` | `npm run analyze` | Public figure tracking |
| `overview.json` | `npm run analyze` | Aggregate metrics |
| `demo_stories.json` | `npm run build-demo` | Preloaded demo walkthroughs |

Until the pipeline runs, these files are absent and every page renders an honest "awaiting data" state.
