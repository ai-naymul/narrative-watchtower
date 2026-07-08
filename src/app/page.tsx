import Link from "next/link";
import {
  ArrowLeftRight,
  ShieldAlert,
  Users,
  Bot,
  ArrowRight,
  Info,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardBody, StatTile, Badge, Disclaimer, RankedBar } from "@/components/ui";
import { getOverviewStats } from "@/lib/data";
import { formatDate } from "@/lib/utils";

const CAPABILITIES = [
  {
    href: "/cross-border",
    icon: ArrowLeftRight,
    title: "Cross-border narrative tracking",
    body: "Compare how Bangladeshi and Indian/foreign outlets frame the same event — surfacing what is emphasised, omitted, or amplified.",
  },
  {
    href: "/rumor-risk",
    icon: ShieldAlert,
    title: "Misinformation & rumor risk",
    body: "Match live articles and posts against known Rumor Scanner fact-checks to catch repeated or mutated false claims, with explainable risk.",
  },
  {
    href: "/public-figures",
    icon: Users,
    title: "Public figure position tracking",
    body: "Trace what public figures emphasise over time and which narratives their public statements connect to — evidence only, no judgement.",
  },
  {
    href: "/copilot",
    icon: Bot,
    title: "Analyst copilot with evidence",
    body: "Ask questions in natural language and get answers grounded strictly in retrieved sources, every claim carrying a citation and confidence level.",
  },
];

export default async function OverviewPage() {
  const stats = await getOverviewStats();

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="SciBlitz AI Challenge 2026 · Track E — National Defence"
        title="Information-security intelligence for Bangladesh"
        description="Modern national security is shaped by information flows. Narrative Watchtower monitors public-source narratives, misinformation, and cross-border framing to support early warning and evidence-backed analysis."
        actions={
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3.5 py-2 text-sm font-medium text-accent transition-colors hover:bg-accent/20"
          >
            View demo stories <ArrowRight className="h-4 w-4" />
          </Link>
        }
      />

      {/* Capability cards */}
      <div className="grid gap-4 sm:grid-cols-2">
        {CAPABILITIES.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.href} href={c.href} className="group">
              <Card className="h-full transition-colors hover:border-border-strong hover:bg-elevated/70">
                <CardBody className="flex gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-border-strong bg-elevated transition-colors group-hover:border-accent/40">
                    <Icon className="h-5 w-5 text-muted transition-colors group-hover:text-accent" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 font-medium text-fg">
                      {c.title}
                      <ArrowRight className="h-3.5 w-3.5 -translate-x-1 text-faint opacity-0 transition-all group-hover:translate-x-0 group-hover:opacity-100" />
                    </div>
                    <p className="mt-1.5 text-sm text-muted">{c.body}</p>
                  </div>
                </CardBody>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* KPIs */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-[0.14em] text-muted">
            Corpus under analysis
          </h2>
          {stats?.date_range?.from ? (
            <Badge tone="muted">
              {formatDate(stats.date_range.from)} — {formatDate(stats.date_range.to)}
            </Badge>
          ) : null}
        </div>

        {stats ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <StatTile label="Documents" value={stats.documents.toLocaleString()} />
            <StatTile label="Articles" value={stats.articles.toLocaleString()} />
            <StatTile label="Public posts" value={stats.public_posts.toLocaleString()} />
            <StatTile label="Fact-checks" value={stats.fact_checks.toLocaleString()} />
            <StatTile label="Narratives" value={stats.narratives.toLocaleString()} />
            <StatTile label="Sources" value={stats.sources.toLocaleString()} />
          </div>
        ) : (
          <Card>
            <CardBody className="flex items-start gap-3 text-sm text-muted">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-2" />
              <span>
                The curated intelligence pipeline has not been run yet. Once the MongoDB
                data audit and offline AI pipeline complete, live corpus metrics, emerging
                narratives, and risk scores will populate here from bundled, precomputed data.
              </span>
            </CardBody>
          </Card>
        )}
      </section>

      {/* Insight lists (populate once curation has run) */}
      {stats ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">Most active sources</span>
              <Badge tone="muted">articles</Badge>
            </CardHeader>
            <CardBody className="space-y-0.5">
              {stats.top_sources.map((s) => (
                <RankedBar
                  key={s.name}
                  label={s.name}
                  value={s.count}
                  max={stats.top_sources[0]?.count ?? 1}
                />
              ))}
            </CardBody>
          </Card>

          <Card>
            <CardHeader className="flex items-center justify-between">
              <span className="text-sm font-semibold text-fg">Most tracked public figures</span>
              <Badge tone="muted">public posts</Badge>
            </CardHeader>
            <CardBody className="space-y-0.5">
              {stats.top_figures.map((f) => (
                <RankedBar
                  key={f.name}
                  label={f.name}
                  value={f.count}
                  max={stats.top_figures[0]?.count ?? 1}
                  href="/public-figures"
                />
              ))}
            </CardBody>
          </Card>
        </section>
      ) : null}

      <Disclaimer />
    </div>
  );
}
