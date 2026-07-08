import { PageHeader } from "@/components/page-header";
import { ComingOnline } from "@/components/coming-online";
import { Badge, Disclaimer } from "@/components/ui";
import { CrossBorderView } from "@/components/cross-border-view";
import { getCrossBorderCases } from "@/lib/data";

export default async function CrossBorderPage() {
  const cases = await getCrossBorderCases();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Cross-Border Framing"
        title="How the same event is framed across borders"
        description="For each topic, compare what Bangladeshi and Indian/foreign outlets emphasise — common facts, divergent claims, amplified or missing context — with a Claude-generated framing-gap analysis."
        actions={cases.length ? <Badge tone="info">{cases.length} cases</Badge> : undefined}
      />

      {cases.length ? (
        <CrossBorderView cases={cases} />
      ) : (
        <ComingOnline
          summary="Articles about the same event are grouped by source country; Claude contrasts the two framings and cites the specific passages behind each claim."
          points={[
            "What Bangladeshi sources emphasise",
            "What Indian / foreign sources emphasise",
            "Common facts vs divergent facts",
            "What is missing or amplified",
            "Framing tags (alarmist, communal, geopolitical, sovereignty-focused…)",
            "AI framing-gap explanation with citations",
          ]}
        />
      )}

      <Disclaimer />
    </div>
  );
}
