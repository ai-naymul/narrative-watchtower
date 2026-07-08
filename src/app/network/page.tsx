import { PageHeader } from "@/components/page-header";
import { ComingOnline } from "@/components/coming-online";
import { Badge, Disclaimer } from "@/components/ui";
import { NetworkGraph, type GNode, type GLink } from "@/components/network-graph";
import { getGraph } from "@/lib/data";

export default async function NetworkPage() {
  const { nodes, links } = await getGraph();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Connection Graph"
        title="How actors and outlets connect to narratives"
        description="A force-directed graph linking public figures and media outlets to the narratives their public activity connects to. Associations are drawn from public data — evidence of connection, never of intent."
        actions={nodes.length ? <Badge tone="info">{nodes.length} nodes · {links.length} links</Badge> : undefined}
      />

      {nodes.length ? (
        <NetworkGraph nodes={nodes as GNode[]} links={links as GLink[]} />
      ) : (
        <ComingOnline
          summary="An entity graph connects figures and outlets to the narratives they are associated with, built from the analysed corpus."
          points={["Public figures", "Media outlets", "Narrative clusters", "Connection strength", "Interactive exploration"]}
        />
      )}

      <Disclaimer />
    </div>
  );
}
