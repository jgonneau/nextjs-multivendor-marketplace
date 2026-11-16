"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { FlaskConical, LogOut, RotateCcw } from "lucide-react";
import { Nav } from "@/components/Nav";
import { SiteFooter } from "@/components/SiteFooter";
import { BasketDrawer } from "@/components/BasketDrawer";
import { BasketProvider } from "@/components/providers/BasketProvider";
import { DemoSessionProvider } from "@/components/providers/DemoSessionProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { DEMO_HOME, DEMO_VIEWS, type DemoView } from "@/lib/demo/store";

function DemoBanner({ view }: { view: DemoView }) {
  const { m } = useI18n();
  const pathname = usePathname();
  // Keep the same page when switching view if the other role has it (e.g. /orders).
  const subpath = pathname.replace(/^\/demo\/[^/]+/, "");
  const targetFor = (v: DemoView) =>
    `/demo/${v}${subpath === "/orders" || (subpath.startsWith("/admin") && v === "admin") ? subpath : DEMO_HOME[v]}`;

  return (
    <div className="border-b border-accent/20 bg-gradient-to-r from-accent/10 via-accent-2/10 to-accent/10">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 text-sm sm:px-6">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-white">
          <FlaskConical className="size-3.5" /> {m.demo.badge}
        </span>
        <span className="hidden text-muted md:inline">{m.demo.notice}</span>

        <div className="flex items-center gap-2 sm:ml-auto">
          <span className="text-xs text-muted">{m.demo.viewAs}</span>
          <div className="flex gap-1 rounded-xl border border-line bg-surface/70 p-0.5" role="tablist">
            {DEMO_VIEWS.map((v) => (
              <Link
                key={v}
                href={targetFor(v)}
                role="tab"
                aria-selected={v === view}
                className={`relative rounded-lg px-2.5 py-1 text-xs font-medium transition-colors ${
                  v === view ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {v === view && (
                  <motion.span
                    layoutId="demo-view-pill"
                    className="absolute inset-0 rounded-lg bg-surface shadow-sm ring-1 ring-line"
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <span className="relative">{m.demo.views[v]}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-1 sm:ml-0">
          {/* The sample data lives in memory, so a reload restores it. */}
          <button
            onClick={() => window.location.reload()}
            title={m.demo.resetHint}
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <RotateCcw className="size-3.5" /> {m.demo.reset}
          </button>
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
          >
            <LogOut className="size-3.5" /> {m.demo.exit}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Same chrome as the real site, but under a demo identity with sample data. */
export function DemoShell({ view, children }: { view: DemoView; children: React.ReactNode }) {
  return (
    <DemoSessionProvider view={view}>
      <BasketProvider>
        <div className="app-backdrop flex min-h-screen flex-col">
          <DemoBanner view={view} />
          <Nav />
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-24 sm:px-6">{children}</main>
          <SiteFooter />
          <BasketDrawer />
        </div>
      </BasketProvider>
    </DemoSessionProvider>
  );
}
