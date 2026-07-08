import Link from "next/link";
import { Users, ArrowRight, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { ComingOnline } from "@/components/coming-online";
import { Card, CardBody, Badge, Disclaimer } from "@/components/ui";
import { getPublicFigures } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function PublicFiguresPage() {
  const figures = await getPublicFigures();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Public Figure Tracker"
        title="What public figures are emphasising"
        description="Built from public posts and statements. Associations are drawn from public data only — never assigning intent or wrongdoing."
        actions={figures.length ? <Badge tone="info">{figures.length} tracked</Badge> : undefined}
      />

      {figures.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {figures.map((f) => {
            const latest = f.position_timeline[0];
            const snippet = f.evidence[0]?.quote || latest?.summary || "";
            return (
              <Link key={f.entity_id} href={`/public-figures/${encodeURIComponent(f.entity_id)}`} className="group">
                <Card className="flex h-full flex-col transition-colors hover:border-border-strong hover:bg-elevated/70">
                  <CardBody className="flex flex-1 flex-col gap-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border-strong bg-elevated">
                        <Users className="h-4 w-4 text-accent-2" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-fg group-hover:text-accent-2">
                          {f.name}
                        </div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-faint">
                          <MessageSquare className="h-3 w-3" />
                          {(f.post_count_total ?? f.post_ids.length).toLocaleString()} posts
                          {latest?.date ? <span>· {formatDate(latest.date)}</span> : null}
                        </div>
                      </div>
                    </div>
                    {snippet ? (
                      <p className="line-clamp-3 text-sm text-muted">{snippet}</p>
                    ) : null}
                    <div className="mt-auto flex items-center gap-1 pt-1 text-xs text-accent-2 opacity-0 transition-opacity group-hover:opacity-100">
                      View timeline <ArrowRight className="h-3 w-3" />
                    </div>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : (
        <ComingOnline
          summary="Public figures are linked to their posts and to narrative clusters; Gemini produces a careful, non-defamatory summary of recent emphasis and position shifts over time."
          points={[
            "Recent public posts / statements",
            "Topics they discuss most",
            "Narrative clusters connected to them",
            "Timeline of positions over time",
            "Careful AI summary of recent emphasis",
            "Evidence list with actual posts and URLs",
          ]}
        />
      )}

      <Disclaimer />
    </div>
  );
}
