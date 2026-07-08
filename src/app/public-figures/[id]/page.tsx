import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Heart, MessageCircle, Share2, ExternalLink, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardBody, CardHeader, Badge, Disclaimer } from "@/components/ui";
import { getPublicFigure, getFigurePosts, getPublicFigures } from "@/lib/data";
import { formatDate } from "@/lib/utils";

/** Prerender every figure at build time → fully static, no runtime fs needed. */
export async function generateStaticParams() {
  const figures = await getPublicFigures();
  return figures.map((f) => ({ id: f.entity_id }));
}

export default async function FigureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const figure = await getPublicFigure(decodeURIComponent(id));
  if (!figure) notFound();
  const posts = await getFigurePosts(figure.entity_id);

  return (
    <div className="space-y-6">
      <Link
        href="/public-figures"
        className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-fg"
      >
        <ArrowLeft className="h-4 w-4" /> All figures
      </Link>

      <PageHeader
        eyebrow="Public Figure Tracker"
        title={figure.name}
        description={figure.role || undefined}
        actions={
          <Badge tone="muted">
            {(figure.post_count_total ?? figure.post_ids.length).toLocaleString()} posts · {figure.post_ids.length} analysed
          </Badge>
        }
      />

      {/* AI summary (populated by the Gemini enrichment stage) */}
      <Card>
        <CardHeader className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-sm font-semibold text-fg">Recent emphasis — AI summary</span>
        </CardHeader>
        <CardBody className="text-sm text-muted">
          {figure.ai_summary ? (
            <p className="text-fg">{figure.ai_summary}</p>
          ) : (
            <p>
              Evidence-grounded summary of this figure&apos;s recent emphasis and position shifts will
              generate here once the Gemini enrichment stage runs. The post timeline below is live.
            </p>
          )}
          {figure.top_topics.length ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {figure.top_topics.map((t) => (
                <Badge key={t.topic} tone="info">
                  {t.topic} · {t.count}
                </Badge>
              ))}
            </div>
          ) : null}
        </CardBody>
      </Card>

      {/* Post timeline */}
      <section className="space-y-3">
        <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          Position timeline · {posts.length} posts
        </h2>
        <div className="space-y-3">
          {posts.map((p) => {
            const m = p.metadata ?? {};
            return (
              <Card key={p.id}>
                <CardBody className="space-y-2">
                  <div className="flex items-center justify-between gap-2 text-xs text-faint">
                    <span>{formatDate(p.published_at)}</span>
                    {p.url ? (
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-accent-2 hover:underline"
                      >
                        View post <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : null}
                  </div>
                  <p className="whitespace-pre-line text-sm text-fg">{p.text.slice(0, 600)}</p>
                  <div className="flex items-center gap-4 pt-1 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Heart className="h-3 w-3" /> {((m.reactions as number) || 0).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageCircle className="h-3 w-3" /> {((m.comments as number) || 0).toLocaleString()}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Share2 className="h-3 w-3" /> {((m.shares as number) || 0).toLocaleString()}
                    </span>
                  </div>
                </CardBody>
              </Card>
            );
          })}
        </div>
      </section>

      <Disclaimer />
    </div>
  );
}
