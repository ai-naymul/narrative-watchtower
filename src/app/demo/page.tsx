import { PageHeader } from "@/components/page-header";
import { ComingOnline } from "@/components/coming-online";
import { Badge } from "@/components/ui";
import { DemoMode } from "@/components/demo-mode";
import { getDemoStories } from "@/lib/data";

export default async function DemoPage() {
  const stories = await getDemoStories();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Demo Mode"
        title="Three guided intelligence stories"
        description="Preloaded, reliable walkthroughs — each traces a real, documented information-security case end to end. Pick a story, then follow the steps into the live dashboard."
        actions={stories.length ? <Badge tone="accent">{stories.length} stories</Badge> : undefined}
      />

      {stories.length ? (
        <DemoMode stories={stories} />
      ) : (
        <ComingOnline
          summary="Demo Mode assembles three curated stories from the precomputed corpus so they load instantly and never depend on a live model call during judging."
          points={[
            "A · Cross-border framing gap on a minority-safety narrative",
            "B · A communal rumor matched to a Rumor Scanner verdict",
            "C · An internal political narrative traced over time",
            "Each step links to the underlying evidence in the dashboard",
          ]}
        />
      )}
    </div>
  );
}
