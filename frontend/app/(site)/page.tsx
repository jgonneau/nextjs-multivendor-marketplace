"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion, useScroll, useTransform, type TargetAndTransition } from "motion/react";
import { ArrowRight, ChevronDown, FlaskConical, Package, ShieldCheck, ShoppingBag, Sparkles, Store, Truck } from "lucide-react";
import { homeFor, useSession } from "@/components/providers/SessionProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { ProductGallery } from "@/components/ProductGallery";
import { buttonClass } from "@/components/ui/Button";
import { DeliveryProgress, StatusBadge, staggerContainer, staggerItem } from "@/components/ui/Display";
import { ORDER_FLOW } from "@/lib/client/format";

const ROLES = [
  {
    icon: ShoppingBag,
    key: "customers",
    tone: "from-accent-2/20 text-accent-2",
  },
  {
    icon: Store,
    key: "vendors",
    tone: "from-warn/20 text-warn",
  },
  {
    icon: ShieldCheck,
    key: "admins",
    tone: "from-accent/20 text-accent",
  },
] as const;

const JOURNEY_ICONS = [ShoppingBag, Package, Store, Truck];
const DEMO_PRICES = [24, 38];

/** A fake order that walks through the delivery flow on a loop. */
function LiveOrderDemo() {
  const { m, formatPrice } = useI18n();
  const [step, setStep] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setStep((s) => (s + 1) % ORDER_FLOW.length), 1800);
    return () => clearInterval(t);
  }, []);
  const status = ORDER_FLOW[step];
  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotate: 2 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={{ type: "spring", stiffness: 120, damping: 18, delay: 0.4 }}
      className="relative mx-auto w-full max-w-sm"
    >
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-3xl border border-line bg-surface/90 p-6 shadow-2xl shadow-accent/10 backdrop-blur"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">{m.home.demo.order("A7F3C2")}</p>
            <p className="font-semibold">{m.home.demo.shop}</p>
          </div>
          <AnimatePresence mode="wait">
            <StatusBadge key={status} status={status} />
          </AnimatePresence>
        </div>
        <ul className="my-5 space-y-2 text-sm">
          {m.home.demo.items.map((name, i) => (
            <li key={i} className="flex justify-between">
              <span className="text-muted">{name}</span>
              <span className="tabular-nums">{formatPrice(DEMO_PRICES[i])}</span>
            </li>
          ))}
        </ul>
        <DeliveryProgress status={status} />
        <div className="mt-3 flex justify-between text-[11px] text-muted">
          {ORDER_FLOW.map((s, i) => (
            <motion.span key={s} animate={{ color: i <= step ? "var(--ink)" : "var(--muted)" }}>
              {m.status[s]}
            </motion.span>
          ))}
        </div>
      </motion.div>
      <motion.div
        animate={{ y: [0, 8, 0], rotate: [0, -4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -top-5 -right-2 flex size-14 sm:-top-6 sm:-right-4 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-xl"
      >
        <Truck className="size-6" />
      </motion.div>
    </motion.div>
  );
}

function Orbs() {
  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {[
        "left-[5%] top-[10%] size-72 bg-accent/30",
        "right-[0%] top-[30%] size-80 bg-accent-2/25",
        "left-[35%] bottom-[0%] size-64 bg-warn/15",
      ].map((cls, i) => (
        <motion.div
          key={cls}
          className={`absolute rounded-full blur-3xl ${cls}`}
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 20, 0], scale: [1, 1.1, 0.95, 1] }}
          transition={{ duration: 16 + i * 4, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

/**
 * "Scroll to explore" cue under the hero; fades out as soon as the page scrolls.
 * Large screens only: on phones the hero is taller than the screen, so the cue
 * would be below the fold and already faded by the time it came into view.
 */
function ScrollCue({ targetId }: { targetId: string }) {
  const { m } = useI18n();
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 160], [1, 0]);
  const y = useTransform(scrollY, [0, 160], [0, 16]);
  const loop = (animate: TargetAndTransition) => (reduce ? {} : { animate, transition: { duration: 1.6, repeat: Infinity, ease: "easeInOut" as const } });

  return (
    <motion.div style={{ opacity, y }} className="hidden justify-center lg:flex">
      <motion.button
        type="button"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2 }}
        onClick={() =>
          document.getElementById(targetId)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" })
        }
        className="group flex flex-col items-center gap-1 rounded-2xl px-4 py-1 text-xs font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-accent"
      >
        <span className="relative flex h-9 w-6 justify-center rounded-full border-2 border-current pt-1.5" aria-hidden>
          <motion.span className="h-2 w-1 rounded-full bg-current" {...loop({ y: [0, 10, 0], opacity: [1, 0, 1] })} />
        </span>
        <motion.span aria-hidden {...loop({ y: [0, 4, 0] })}>
          <ChevronDown className="size-4" />
        </motion.span>
        <span>{m.home.scrollHint}</span>
      </motion.button>
    </motion.div>
  );
}

export default function HomePage() {
  const { session, ready } = useSession();
  const { m, locale } = useI18n();

  return (
    <div className="relative">
      <Orbs />
      <section className="grid items-center gap-14 py-10 lg:grid-cols-2 lg:py-16">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 rounded-full border border-line bg-surface/70 px-3 py-1 text-xs font-medium text-muted backdrop-blur"
          >
            <Sparkles className="size-3.5 text-accent" /> {m.home.eyebrow}
          </motion.span>
          <motion.h1
            key={locale}
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } } }}
            className="mt-6 text-5xl leading-[1.05] font-semibold tracking-tight sm:text-6xl"
          >
            {m.home.headline.map((word, i) => (
              <motion.span
                key={i}
                variants={{
                  hidden: { opacity: 0, y: 30, filter: "blur(8px)" },
                  show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { type: "spring", stiffness: 200, damping: 20 } },
                }}
                className={`mr-3 inline-block ${
                  i % 2 === 1 ? "bg-gradient-to-r from-accent to-accent-2 bg-clip-text text-transparent" : ""
                }`}
              >
                {word}
              </motion.span>
            ))}
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
            className="mt-6 max-w-lg text-lg text-muted"
          >
            {m.home.lead}
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: ready ? 1 : 0, y: 0 }}
            transition={{ delay: 0.85 }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap"
          >
            {session ? (
              <Link href={homeFor(session.role)} className={buttonClass("primary", "lg", "group w-full sm:w-auto")}>
                {m.home.goToMySpace} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
              </Link>
            ) : (
              <>
                <Link href="/signup" className={buttonClass("primary", "lg", "group w-full sm:w-auto")}>
                  {m.home.createAccount} <ArrowRight className="size-4 transition group-hover:translate-x-1" />
                </Link>
                <Link href="/login" className={buttonClass("secondary", "lg", "w-full sm:w-auto")}>
                  {m.common.signIn}
                </Link>
              </>
            )}
            <Link href="/demo" className={buttonClass("ghost", "lg", "group w-full sm:w-auto")}>
              <FlaskConical className="size-4 transition group-hover:rotate-12" /> {m.demo.cta}
            </Link>
          </motion.div>
        </div>
        <LiveOrderDemo />
      </section>

      <ScrollCue targetId="roles" />

      <motion.section
        id="roles"
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-80px" }}
        variants={staggerContainer}
        className="grid scroll-mt-20 gap-4 py-10 md:grid-cols-3"
      >
        {ROLES.map((role) => (
          <motion.article
            key={role.key}
            variants={staggerItem}
            whileHover={{ y: -6 }}
            className="group rounded-3xl border border-line bg-surface p-6 shadow-sm transition-shadow hover:shadow-xl"
          >
            <div className={`mb-5 inline-flex rounded-2xl bg-gradient-to-br to-transparent p-3 ${role.tone}`}>
              <motion.span whileHover={{ rotate: -10, scale: 1.1 }} className="block">
                <role.icon className="size-6" />
              </motion.span>
            </div>
            <h2 className="text-lg font-semibold">{m.home.roles[role.key].title}</h2>
            <p className="mt-2 text-sm text-muted">{m.home.roles[role.key].text}</p>
          </motion.article>
        ))}
      </motion.section>

      <ProductGallery />

      <motion.section
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="my-10 overflow-hidden rounded-3xl border border-line bg-surface p-8 sm:p-12"
      >
        <h2 className="text-2xl font-semibold tracking-tight">{m.home.journey.title}</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-4">
          {m.home.journey.steps.map(({ title, text }, i) => {
            const StepIcon = JOURNEY_ICONS[i];
            return (
              <motion.li
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.12 }}
                className="relative"
              >
                <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                  <StepIcon className="size-5" />
                </span>
                <p className="font-semibold">
                  <span className="mr-2 text-muted tabular-nums">0{i + 1}</span>
                  {title}
                </p>
                <p className="mt-1 text-sm text-muted">{text}</p>
              </motion.li>
            );
          })}
        </ol>
      </motion.section>
    </div>
  );
}
