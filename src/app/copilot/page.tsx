import { PageHeader } from "@/components/page-header";
import { CopilotChat } from "@/components/copilot-chat";
import { Disclaimer } from "@/components/ui";

export default function CopilotPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analyst Copilot"
        title="Ask the corpus — with evidence"
        description="A retrieval-grounded assistant. Every answer is built only from retrieved sources and carries citations plus a confidence level. If the evidence is weak, it says so."
      />
      <CopilotChat />
      <Disclaimer />
    </div>
  );
}
