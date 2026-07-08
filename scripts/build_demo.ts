/**
 * Build 3 preloaded Demo Mode stories from the assembled intelligence.
 * Deterministic: picks the strongest real narratives + cross-border cases so the
 * judging walkthrough is fast and reliable. Output: data/demo_stories.json
 */
import { readData, writeData } from "./shared";
import type { Narrative, CrossBorderCase, DemoStory } from "../src/lib/types";

const pick = <T>(arr: T[], f: (x: T) => boolean, fallback: T): T => arr.find(f) ?? fallback;

async function main() {
  const narratives = await readData<Narrative[]>("narratives.json", []);
  const cases = await readData<CrossBorderCase[]>("cross_border.json", []);
  if (!narratives.length) {
    console.error("✗ Run the analysis pipeline first (no narratives.json).");
    process.exit(1);
  }

  const byRisk = [...narratives].sort((a, b) => b.risk.score - a.risk.score);
  const communal = pick(byRisk, (n) => n.track === "communal_misinfo", byRisk[0]);
  const election = pick(
    narratives,
    (n) => /election|legitimacy/i.test(n.title),
    pick(narratives, (n) => n.track === "internal_politics", narratives[0])
  );
  const crossCommunal = pick(cases, (c) => /minority|communal|hindu/i.test(c.topic), cases[0]);
  const crossElection = pick(cases, (c) => /election|legitimacy/i.test(c.topic), cases[1] ?? cases[0]);

  const stories: DemoStory[] = [
    {
      id: "demo_cross_border",
      slug: "cross-border-framing",
      title: "How India and Bangladesh frame the same story differently",
      kind: "cross_border",
      hook: "A single Bangladesh event, two very different national narratives — and where the framing gap creates information-security risk.",
      cross_border_id: crossCommunal?.id,
      narrative_id: communal.id,
      steps: [
        {
          title: "The event",
          body: crossCommunal?.event_summary || communal.summary,
          ref: "/cross-border",
        },
        {
          title: "Bangladeshi framing vs Indian framing",
          body:
            `Bangladeshi outlets emphasise: ${(crossCommunal?.bd_emphasis || []).slice(0, 2).join("; ")}. ` +
            `Indian outlets emphasise: ${(crossCommunal?.foreign_emphasis || []).slice(0, 2).join("; ")}.`,
          ref: "/cross-border",
        },
        {
          title: "The framing gap",
          body: crossCommunal?.framing_gap_explanation || communal.why_it_matters,
          ref: "/cross-border",
        },
        {
          title: "Grounded against fact-checks",
          body: `This narrative connects to ${communal.factcheck_ids.length} Rumor Scanner fact-checks of false/misleading claims — the debunk layer that separates verified fact from amplified framing.`,
          ref: "/rumor-risk",
        },
      ],
    },
    {
      id: "demo_communal",
      slug: "communal-misinformation",
      title: "A communal rumor, from spread to fact-check",
      kind: "communal_misinfo",
      hook: `"${communal.title}" — risk ${communal.risk.score}/100. How a sensitive claim spreads and is checked against known misinformation.`,
      narrative_id: communal.id,
      steps: [
        { title: "The narrative", body: communal.summary, ref: `/narratives/${communal.id}` },
        {
          title: "Why it matters",
          body: communal.why_it_matters,
          ref: `/narratives/${communal.id}`,
        },
        {
          title: "Explainable risk",
          body:
            `Risk ${communal.risk.score}/100 (${communal.risk.level}). ` +
            communal.risk.factors.map((f) => f.label).join(" · ") +
            `. ${communal.risk.rationale}`,
          ref: `/narratives/${communal.id}`,
        },
        {
          title: "Matched to Rumor Scanner",
          body: `${communal.factcheck_ids.length} related fact-checks provide verdicts (false / misleading) with evidence — the system never asserts a claim is false without the fact-check behind it.`,
          ref: "/rumor-risk",
        },
      ],
    },
    {
      id: "demo_political",
      slug: "internal-political-narrative",
      title: "An internal political narrative over time",
      kind: "internal_political",
      hook: `"${election.title}" — how a contested political narrative moves across outlets, figures, and borders.`,
      narrative_id: election.id,
      cross_border_id: crossElection?.id,
      steps: [
        { title: "The narrative", body: election.summary, ref: `/narratives/${election.id}` },
        {
          title: "Public figures connected",
          body: "Party pages and political figures amplify or contest this narrative — traced from their public posts in the Figure Tracker (evidence only, no judgement).",
          ref: "/public-figures",
        },
        {
          title: "Cross-border dimension",
          body: crossElection?.framing_gap_explanation || "Indian and Bangladeshi outlets frame the election's legitimacy differently.",
          ref: "/cross-border",
        },
        {
          title: "Ask the copilot",
          body: "“How do Indian and Bangladeshi outlets frame the 2026 election differently?” — the Analyst Copilot answers with citations and a confidence level.",
          ref: "/copilot",
        },
      ],
    },
  ];

  await writeData("demo_stories.json", stories);
  console.log(`✓ demo_stories.json: ${stories.length} stories`);
  stories.forEach((s) => console.log(`  - ${s.title} (${s.steps.length} steps)`));
}

main().catch((e) => {
  console.error("✗ build_demo failed:", e);
  process.exit(1);
});
