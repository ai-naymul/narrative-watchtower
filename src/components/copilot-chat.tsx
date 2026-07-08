"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, ExternalLink, Loader2, Quote } from "lucide-react";
import { Card, CardBody, Badge } from "@/components/ui";
import type { CopilotAnswer } from "@/lib/types";

const SUGGESTIONS = [
  "What narratives about India–Bangladesh relations are rising?",
  "Which claims are similar to known misinformation about attacks on Hindus?",
  "Summarize the main national information-security risks.",
  "What has Mirza Fakhrul been emphasizing recently?",
  "How do Indian and Bangladeshi outlets frame the 2026 election differently?",
];

interface Msg {
  role: "user" | "assistant";
  text?: string;
  data?: CopilotAnswer & { mode?: string };
  loading?: boolean;
}

const confTone = { high: "accent", medium: "muted", low: "muted" } as const;

export function CopilotChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", text: question }, { role: "assistant", loading: true }]);
    setBusy(true);
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
      });
      const data = await res.json();
      setMessages((m) => {
        const copy = m.slice(0, -1);
        return [...copy, { role: "assistant", data }];
      });
    } catch {
      setMessages((m) => {
        const copy = m.slice(0, -1);
        return [...copy, { role: "assistant", text: "Sorry — the copilot is unavailable right now." }];
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {messages.length === 0 ? (
        <Card>
          <CardBody className="space-y-3">
            <p className="text-sm text-muted">
              Ask about narratives, sources, figures, or misinformation. Every answer is grounded in
              retrieved evidence with citations and a confidence level.
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => ask(s)}
                  className="rounded-lg border border-border bg-surface px-3 py-1.5 text-left text-xs text-muted transition-colors hover:border-accent-2/50 hover:text-fg"
                >
                  {s}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>
      ) : null}

      <div className="space-y-4">
        {messages.map((m, i) => (
          <div key={i} className="flex gap-3">
            <div
              className={
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border " +
                (m.role === "user" ? "border-border-strong bg-elevated" : "border-accent/40 bg-accent/10")
              }
            >
              {m.role === "user" ? (
                <User className="h-4 w-4 text-muted" />
              ) : (
                <Bot className="h-4 w-4 text-accent" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              {m.loading ? (
                <div className="flex items-center gap-2 pt-1.5 text-sm text-muted">
                  <Loader2 className="h-4 w-4 animate-spin" /> Retrieving evidence…
                </div>
              ) : m.text ? (
                <p className="pt-1 text-sm text-fg">{m.text}</p>
              ) : m.data ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge tone={confTone[m.data.confidence]}>confidence: {m.data.confidence}</Badge>
                    {m.data.mode ? <span className="text-[10px] uppercase tracking-wider text-faint">{m.data.mode}</span> : null}
                  </div>
                  <p className="whitespace-pre-line text-sm text-fg">{m.data.answer}</p>
                  {m.data.caveat ? <p className="text-xs italic text-risk-med">{m.data.caveat}</p> : null}
                  {m.data.citations?.length ? (
                    <div className="space-y-1.5 border-l-2 border-border pl-3">
                      {m.data.citations.map((c, j) => (
                        <div key={c.document_id + j} className="text-xs text-muted">
                          <Quote className="mr-1 inline h-3 w-3 text-faint" />
                          <span className="text-accent-2">{c.source_name}</span> — {c.quote.slice(0, 130)}
                          {c.url ? (
                            <a href={c.url} target="_blank" rel="noopener noreferrer" className="ml-1 inline-flex items-center text-accent-2 hover:underline">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-0 flex gap-2 bg-base/80 py-2 backdrop-blur"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the corpus…"
          className="flex-1 rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-fg placeholder:text-faint outline-none focus:border-accent-2/50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-4 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-accent/20 disabled:opacity-40"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
