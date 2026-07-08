import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names with conflict resolution. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format an ISO date as a short, locale-stable label (e.g. "12 Jan 2025"). */
export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Clamp a number into a [min, max] range. */
export function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

/** Map a 0-100 risk score to a discrete level. */
export function riskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 67) return "high";
  if (score >= 34) return "medium";
  return "low";
}

/** Human label for a narrative track. */
export function trackLabel(track: string): string {
  return (
    {
      internal_politics: "Internal Politics",
      india_bangladesh: "India–Bangladesh",
      communal_misinfo: "Communal Misinfo",
      national_security: "National Security",
      foreign_framing: "Foreign Framing",
    }[track] ?? track
  );
}
