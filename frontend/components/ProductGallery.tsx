"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ChevronLeft, ChevronRight, Store } from "lucide-react";
import { useI18n } from "@/components/providers/I18nProvider";
import { staggerContainer, staggerItem } from "@/components/ui/Display";

/** Demo prices and picsum seeds, in the same order as `m.home.gallery.items`. */
const EXAMPLES = [
  { seed: "mug", price: 24 },
  { seed: "tote", price: 32 },
  { seed: "coffee", price: 14.5 },
  { seed: "candle", price: 18 },
  { seed: "notebook", price: 27 },
  { seed: "board", price: 45 },
  { seed: "throw", price: 89 },
  { seed: "tea", price: 21 },
];

const photo = (seed: string) => `https://picsum.photos/seed/marketplace-${seed}/480/360`;

/** Horizontally scrolling strip of example products (photos from picsum.photos). */
export function ProductGallery() {
  const { m, formatPrice } = useI18n();
  const g = m.home.gallery;
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  const updateEdges = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

  useEffect(() => {
    updateEdges();
    window.addEventListener("resize", updateEdges);
    return () => window.removeEventListener("resize", updateEdges);
  }, [updateEdges]);

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  const arrow =
    "flex size-10 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-sm transition hover:border-accent/50 hover:text-ink disabled:pointer-events-none disabled:opacity-40";

  return (
    <motion.section
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      className="py-10"
      aria-label={g.label}
    >
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-accent uppercase">{g.eyebrow}</p>
          <h2 className="text-2xl font-semibold tracking-tight">{g.title}</h2>
          <p className="mt-1 max-w-xl text-sm text-muted">{g.subtitle}</p>
        </div>
        <div className="hidden shrink-0 gap-2 sm:flex">
          <button className={arrow} onClick={() => scrollBy(-1)} disabled={edges.start} aria-label={g.previous}>
            <ChevronLeft className="size-5" />
          </button>
          <button className={arrow} onClick={() => scrollBy(1)} disabled={edges.end} aria-label={g.next}>
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <motion.ul
        ref={track}
        onScroll={updateEdges}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true }}
        variants={staggerContainer}
        className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-4 [scrollbar-width:thin] sm:mx-0 sm:scroll-px-0 sm:px-0"
      >
        {EXAMPLES.map(({ seed, price }, i) => {
          const item = g.items[i];
          if (!item) return null;
          return (
            <motion.li
              key={seed}
              variants={staggerItem}
              whileHover={{ y: -6 }}
              className="group w-60 shrink-0 snap-start overflow-hidden rounded-3xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-xl sm:w-64"
            >
              <div className="relative aspect-[4/3] overflow-hidden bg-surface-2">
                {/* Remote demo photo; plain <img> avoids needing the Next image optimizer for picsum. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo(seed)}
                  alt={item.name}
                  width={480}
                  height={360}
                  loading="lazy"
                  className="size-full object-cover transition duration-500 group-hover:scale-105"
                />
                <span className="absolute right-3 bottom-3 rounded-full bg-surface/90 px-2.5 py-1 text-sm font-semibold tabular-nums shadow backdrop-blur">
                  {formatPrice(price)}
                </span>
              </div>
              <div className="p-4">
                <p className="flex items-center gap-1.5 text-xs text-muted">
                  <Store className="size-3.5" /> {item.shop}
                </p>
                <h3 className="mt-1 truncate font-semibold">{item.name}</h3>
              </div>
            </motion.li>
          );
        })}
      </motion.ul>
    </motion.section>
  );
}
