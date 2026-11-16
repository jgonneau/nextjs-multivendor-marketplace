"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Check, ShieldCheck, ShoppingBag, Store } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { Avatar, PageHeader, staggerContainer, staggerItem } from "@/components/ui/Display";
import { DEMO_IDENTITY, DEMO_VIEWS } from "@/lib/demo/store";

const LOOK = {
  customer: { icon: ShoppingBag, tone: "from-accent-2/20 text-accent-2" },
  vendor: { icon: Store, tone: "from-warn/20 text-warn" },
  admin: { icon: ShieldCheck, tone: "from-accent/20 text-accent" },
} as const;

export default function DemoIndexPage() {
  const { m } = useI18n();
  const c = m.demo.chooser;

  return (
    <>
      <PageHeader eyebrow={c.eyebrow} title={c.title} description={c.description} />
      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="grid gap-5 md:grid-cols-3">
        {DEMO_VIEWS.map((view) => {
          const card = c.cards[view];
          const { icon: Icon, tone } = LOOK[view];
          const who = DEMO_IDENTITY[view];
          return (
            <motion.div key={view} variants={staggerItem} whileHover={{ y: -6 }}>
              <Link
                href={`/demo/${view}`}
                className="group flex h-full flex-col rounded-3xl border border-line bg-surface p-6 shadow-sm transition-shadow hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              >
                <div className={`mb-5 inline-flex self-start rounded-2xl bg-gradient-to-br to-transparent p-3 ${tone}`}>
                  <Icon className="size-6" />
                </div>
                <h2 className="text-xl font-semibold">{card.title}</h2>
                <p className="mt-2 text-sm text-muted">{card.text}</p>
                <ul className="mt-4 space-y-1.5 text-sm">
                  {card.pages.map((page) => (
                    <li key={page} className="flex items-center gap-2">
                      <Check className="size-4 text-ok" /> {page}
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-6">
                  <p className="mb-4 flex items-center gap-2 text-xs text-muted">
                    <Avatar email={who.email} size="sm" /> {c.signedInAs(who.email)}
                  </p>
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-accent">
                    {c.open} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                  </span>
                </div>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>
    </>
  );
}
