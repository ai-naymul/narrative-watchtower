"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Layers,
  ArrowLeftRight,
  ShieldAlert,
  Users,
  Waypoints,
  Bot,
  Play,
  BookOpen,
  Radar,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  desc: string;
}

export const NAV: NavItem[] = [
  { href: "/", label: "Overview", icon: LayoutDashboard, desc: "Mission & intelligence summary" },
  { href: "/narratives", label: "Narratives", icon: Layers, desc: "Emerging narrative clusters" },
  { href: "/cross-border", label: "Cross-Border Framing", icon: ArrowLeftRight, desc: "BD vs foreign media" },
  { href: "/rumor-risk", label: "Rumor Risk", icon: ShieldAlert, desc: "Misinformation matching" },
  { href: "/public-figures", label: "Public Figures", icon: Users, desc: "Position tracking" },
  { href: "/network", label: "Connection Graph", icon: Waypoints, desc: "Actors ↔ narratives" },
  { href: "/copilot", label: "Analyst Copilot", icon: Bot, desc: "Evidence-grounded chat" },
  { href: "/demo", label: "Demo Mode", icon: Play, desc: "Preloaded stories" },
  { href: "/methodology", label: "Methodology", icon: BookOpen, desc: "How it works & ethics" },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-[264px] shrink-0 flex-col border-r border-border bg-surface/60">
      <div className="flex items-center gap-2.5 px-5 py-4 border-b border-border">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-accent/40 bg-accent/10">
          <Radar className="h-5 w-5 text-accent" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-fg">Narrative Watchtower</div>
          <div className="text-[11px] text-faint">Bangladesh OSINT</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3">
        {NAV.map((item) => {
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-elevated text-fg border border-border-strong"
                  : "text-muted hover:bg-elevated/60 hover:text-fg border border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4 shrink-0",
                  active ? "text-accent" : "text-faint group-hover:text-muted"
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border px-4 py-3 text-[11px] text-faint">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-risk-low animate-pulse" />
          Public-source OSINT · Track E
        </div>
        <div className="mt-1">Human-in-the-loop · No private data</div>
      </div>
    </aside>
  );
}
