import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { Play, Radar } from "lucide-react";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Narrative Watchtower — Information-Security Intelligence for Bangladesh",
  description:
    "AI-powered public-source narrative intelligence: cross-border framing, misinformation risk, and evidence-backed early warning for Bangladesh's information security.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface/60 px-4 md:px-6">
              <Link href="/" className="flex items-center gap-2 md:hidden">
                <Radar className="h-5 w-5 text-accent" />
                <span className="text-sm font-semibold">Narrative Watchtower</span>
              </Link>
              <div className="hidden items-center gap-2 text-xs text-faint md:flex">
                <span className="h-1.5 w-1.5 rounded-full bg-risk-low animate-pulse" />
                SYSTEM LIVE · Public-source intelligence · Demo build
              </div>
              <Link
                href="/demo"
                className="inline-flex items-center gap-1.5 rounded-lg border border-accent/40 bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/20"
              >
                <Play className="h-3.5 w-3.5" />
                Enter Demo Mode
              </Link>
            </header>
            <main className="flex-1 overflow-y-auto bg-grid">
              <div className="mx-auto max-w-6xl px-4 py-6 md:px-8 md:py-8">{children}</div>
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
