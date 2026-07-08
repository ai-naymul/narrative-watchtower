"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
} from "d3-force";

export interface GNode {
  id: string;
  label: string;
  type: "narrative" | "figure" | "outlet";
  val: number;
  risk?: number;
  track?: string;
  x?: number;
  y?: number;
}
export interface GLink {
  source: string | GNode;
  target: string | GNode;
  value: number;
}

const W = 960;
const H = 620;

const typeFill: Record<GNode["type"], string> = {
  narrative: "fill-accent",
  figure: "fill-accent-2",
  outlet: "fill-muted",
};

export function NetworkGraph({ nodes, links }: { nodes: GNode[]; links: GLink[] }) {
  const [positioned, setPositioned] = useState<GNode[]>([]);
  const [hover, setHover] = useState<string | null>(null);
  const ran = useRef(false);

  // adjacency for hover highlighting
  const adj = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of links) {
      const s = typeof l.source === "string" ? l.source : l.source.id;
      const t = typeof l.target === "string" ? l.target : l.target.id;
      (m.get(s) ?? m.set(s, new Set()).get(s)!).add(t);
      (m.get(t) ?? m.set(t, new Set()).get(t)!).add(s);
    }
    return m;
  }, [links]);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const ns: GNode[] = nodes.map((n) => ({ ...n }));
    const ls: GLink[] = links.map((l) => ({ ...l }));
    const sim = forceSimulation(ns as never)
      .force(
        "link",
        forceLink(ls as never)
          .id((d) => (d as unknown as GNode).id)
          .distance(70)
          .strength(0.35)
      )
      .force("charge", forceManyBody().strength(-210))
      .force("center", forceCenter(W / 2, H / 2))
      .force("collide", forceCollide().radius((d) => (d as unknown as GNode).val + 8))
      .stop();
    for (let i = 0; i < 320; i++) sim.tick();
    // clamp into viewport
    for (const n of ns) {
      n.x = Math.max(30, Math.min(W - 30, n.x ?? W / 2));
      n.y = Math.max(24, Math.min(H - 24, n.y ?? H / 2));
    }
    setPositioned(ns);
  }, [nodes, links]);

  const posById = useMemo(() => new Map(positioned.map((n) => [n.id, n])), [positioned]);
  const isActive = (id: string) => !hover || hover === id || adj.get(hover)?.has(id);

  if (!positioned.length)
    return <div className="flex h-64 items-center justify-center text-sm text-muted">Laying out graph…</div>;

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface/60">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 640 }}>
        {/* links */}
        {links.map((l, i) => {
          const s = posById.get(typeof l.source === "string" ? l.source : l.source.id);
          const t = posById.get(typeof l.target === "string" ? l.target : l.target.id);
          if (!s || !t) return null;
          const active = !hover || isActive(s.id) && isActive(t.id) && (hover === s.id || hover === t.id || !hover);
          return (
            <line
              key={i}
              x1={s.x}
              y1={s.y}
              x2={t.x}
              y2={t.y}
              className="stroke-border-strong"
              strokeWidth={active ? 1.1 : 0.5}
              strokeOpacity={hover ? (active ? 0.7 : 0.08) : 0.35}
            />
          );
        })}
        {/* nodes */}
        {positioned.map((n) => {
          const active = isActive(n.id);
          const r = n.val;
          return (
            <g
              key={n.id}
              transform={`translate(${n.x},${n.y})`}
              onMouseEnter={() => setHover(n.id)}
              onMouseLeave={() => setHover(null)}
              style={{ cursor: "pointer", opacity: active ? 1 : 0.2, transition: "opacity .15s" }}
            >
              <circle
                r={r}
                className={typeFill[n.type]}
                stroke="hsl(var(--base))"
                strokeWidth={1.5}
              />
              {(n.type === "narrative" || hover === n.id) && (
                <text
                  x={r + 4}
                  y={4}
                  className="fill-fg"
                  style={{ fontSize: n.type === "narrative" ? 11 : 10, pointerEvents: "none" }}
                >
                  {n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-4 border-t border-border px-4 py-2 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent" /> Narrative</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-accent-2" /> Public figure</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-muted" /> Media outlet</span>
        <span className="ml-auto text-faint">hover a node to trace its connections</span>
      </div>
    </div>
  );
}
