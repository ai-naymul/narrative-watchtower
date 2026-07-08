import { Radar } from "lucide-react";
import { Card, CardBody } from "@/components/ui";

/**
 * Placeholder shown on feature pages before the offline pipeline has produced
 * data. Lists what the surface will contain so the app is legible during build.
 */
export function ComingOnline({
  summary,
  points,
}: {
  summary: string;
  points: string[];
}) {
  return (
    <Card>
      <CardBody className="space-y-4">
        <div className="flex items-center gap-2 text-sm font-medium text-accent">
          <Radar className="h-4 w-4 animate-pulse" />
          Awaiting curated intelligence
        </div>
        <p className="max-w-2xl text-sm text-muted">{summary}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-2 text-sm text-fg">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-2" />
              {p}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
