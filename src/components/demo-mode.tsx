"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, ShieldAlert, Landmark, ArrowRight, Play } from "lucide-react";
import { Card, CardBody, Badge } from "@/components/ui";
import type { DemoStory } from "@/lib/types";

const KIND_META: Record<string, { label: string; Icon: typeof Play }> = {
  cross_border: { label: "Cross-border framing", Icon: ArrowLeftRight },
  communal_misinfo: { label: "Communal misinformation", Icon: ShieldAlert },
  internal_political: { label: "Internal political", Icon: Landmark },
};

export function DemoMode({ stories }: { stories: DemoStory[] }) {
  const [active, setActive] = useState(0);
  const story = stories[active];

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        {stories.map((s, i) => {
          const meta = KIND_META[s.kind] ?? { label: s.kind, Icon: Play };
          const Icon = meta.Icon;
          const isActive = i === active;
          return (
            <button key={s.id} onClick={() => setActive(i)} className="text-left">
              <Card
                className={
                  "h-full transition-colors " +
                  (isActive ? "border-accent/50 bg-accent/5" : "hover:border-border-strong hover:bg-elevated/60")
                }
              >
                <CardBody className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={"flex h-8 w-8 items-center justify-center rounded-lg border " + (isActive ? "border-accent/40 bg-accent/10" : "border-border bg-elevated")}>
                      <Icon className={"h-4 w-4 " + (isActive ? "text-accent" : "text-muted")} />
                    </div>
                    <span className="text-[11px] font-medium uppercase tracking-wider text-faint">
                      Demo {String.fromCharCode(65 + i)}
                    </span>
                  </div>
                  <div className="text-sm font-medium leading-snug text-fg">{s.title}</div>
                  <Badge tone={isActive ? "accent" : "muted"}>{meta.label}</Badge>
                </CardBody>
              </Card>
            </button>
          );
        })}
      </div>

      <Card className="border-accent/20 bg-accent/5">
        <CardBody>
          <p className="text-sm text-fg">{story.hook}</p>
        </CardBody>
      </Card>

      <ol className="space-y-3">
        {story.steps.map((step, i) => (
          <li key={i}>
            <Card>
              <CardBody className="flex gap-4">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-strong bg-elevated font-mono text-xs text-accent">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-fg">{step.title}</div>
                  <p className="mt-1 text-sm text-muted">{step.body}</p>
                  {step.ref ? (
                    <Link
                      href={step.ref}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-accent-2 hover:underline"
                    >
                      Open in dashboard <ArrowRight className="h-3 w-3" />
                    </Link>
                  ) : null}
                </div>
              </CardBody>
            </Card>
          </li>
        ))}
      </ol>
    </div>
  );
}
