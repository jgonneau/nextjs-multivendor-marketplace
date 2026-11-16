"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, Languages } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { LOCALES, LOCALE_NAMES } from "@/lib/i18n/config";

export function LanguageSwitcher() {
  const { locale, setLocale, m } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 rounded-xl px-2 py-2 sm:px-2.5 text-sm font-medium text-muted transition hover:bg-surface-2 hover:text-ink"
        aria-label={`${m.common.language}: ${LOCALE_NAMES[locale]}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <Languages className="size-4" />
        {/* Icon only on the narrowest phones; the full name stays in aria-label. */}
        <span className="hidden uppercase min-[400px]:inline">{locale}</span>
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.ul
            role="listbox"
            aria-label={m.common.language}
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 mt-2 w-40 rounded-2xl border border-line bg-surface p-1.5 shadow-xl"
          >
            {LOCALES.map((l) => (
              <li key={l}>
                <button
                  role="option"
                  aria-selected={l === locale}
                  lang={l}
                  onClick={() => {
                    setLocale(l);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition hover:bg-surface-2 ${
                    l === locale ? "text-ink" : "text-muted hover:text-ink"
                  }`}
                >
                  {LOCALE_NAMES[l]}
                  {l === locale && <Check className="size-4 text-accent" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
