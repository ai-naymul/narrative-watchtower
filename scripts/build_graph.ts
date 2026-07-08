/**
 * Build the entity connection graph: public figures ↔ narratives ↔ media outlets.
 * A tripartite graph showing which actors and outlets connect to which narratives.
 * Output: data/graph.json  { nodes, links }
 */
import { readData, writeData } from "./shared";
import type { Narrative, PublicFigure } from "../src/lib/types";

interface Node {
  id: string;
  label: string;
  type: "narrative" | "figure" | "outlet";
  val: number;
  risk?: number;
  track?: string;
}
interface Link {
  source: string;
  target: string;
  value: number;
}

async function main() {
  const narratives = await readData<Narrative[]>("narratives.json", []);
  const figures = await readData<PublicFigure[]>("public_figures.json", []);
  if (!narratives.length) throw new Error("No narratives.json");

  const nodes: Node[] = [];
  const links: Link[] = [];
  const narrIds = new Set(narratives.map((n) => n.id));

  // narrative nodes
  for (const n of narratives)
    nodes.push({
      id: n.id,
      label: n.title.length > 46 ? n.title.slice(0, 44) + "…" : n.title,
      type: "narrative",
      val: 6 + n.risk.score / 12,
      risk: n.risk.score,
      track: n.track,
    });

  // figure nodes (only those linked to >=1 narrative) + figure→narrative links
  const linkedFigures = figures
    .filter((f) => f.connected_narrative_ids.some((id) => narrIds.has(id)))
    .sort((a, b) => b.connected_narrative_ids.length - a.connected_narrative_ids.length)
    .slice(0, 26);
  for (const f of linkedFigures) {
    const fid = `fig:${f.entity_id}`;
    nodes.push({ id: fid, label: f.name.length > 24 ? f.name.slice(0, 22) + "…" : f.name, type: "figure", val: 4 });
    for (const nid of f.connected_narrative_ids)
      if (narrIds.has(nid)) links.push({ source: fid, target: nid, value: 1 });
  }

  // outlet nodes from narrative evidence + outlet→narrative links
  const outletHits = new Map<string, Set<string>>(); // outlet -> narrative ids
  for (const n of narratives)
    for (const e of n.evidence) {
      const name = e.source_name;
      if (!name || name === "Rumor Scanner" || name === "Source") continue;
      (outletHits.get(name) ?? outletHits.set(name, new Set()).get(name)!).add(n.id);
    }
  const topOutlets = [...outletHits.entries()]
    .filter(([, ns]) => ns.size >= 2)
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 14);
  for (const [name, ns] of topOutlets) {
    const oid = `out:${name}`;
    nodes.push({ id: oid, label: name.length > 22 ? name.slice(0, 20) + "…" : name, type: "outlet", val: 3 + ns.size / 2 });
    for (const nid of ns) links.push({ source: oid, target: nid, value: 1 });
  }

  // prune orphan narrative nodes? keep all narratives (they anchor the graph)
  await writeData("graph.json", { nodes, links });
  const byType = nodes.reduce<Record<string, number>>((m, n) => ((m[n.type] = (m[n.type] || 0) + 1), m), {});
  console.log(`✓ graph.json: ${nodes.length} nodes`, byType, `· ${links.length} links`);
}

main().catch((e) => (console.error("✗ build_graph failed:", e.message), process.exit(1)));
