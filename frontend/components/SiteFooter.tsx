"use client";

import Link from "next/link";
import { useI18n } from "@/components/providers/I18nProvider";

const link = "inline-flex min-h-11 items-center px-2 underline-offset-4 hover:text-ink hover:underline";

export function SiteFooter() {
  const { m } = useI18n();
  return (
    <footer className="flex flex-wrap items-center justify-center gap-x-1 border-t border-line px-4 py-3 text-center text-xs text-muted">
      {/* Phones: credit on its own line, links together below it. */}
      <span className="basis-full sm:basis-auto">{m.footer.poweredBy}</span>
      <span aria-hidden className="hidden sm:inline">·</span>
      {/* min-h-11: 44px touch targets */}
      <a href="/docs" className={link}>
        {m.footer.apiDocs}
      </a>
      <span aria-hidden>·</span>
      <Link href="/demo" className={link}>
        {m.footer.demo}
      </Link>
    </footer>
  );
}
