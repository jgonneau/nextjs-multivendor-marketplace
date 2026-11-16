"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ApiProduct } from "@/lib/client/types";
import { useSession } from "./SessionProvider";

export type BasketItem = Pick<ApiProduct, "id" | "reference" | "title" | "price" | "vendorId">;

type BasketApi = {
  items: BasketItem[];
  count: number;
  total: number;
  has: (productId: string) => boolean;
  add: (product: BasketItem) => void;
  remove: (productId: string) => void;
  clear: () => void;
  open: boolean;
  setOpen: (open: boolean) => void;
};

const BasketContext = createContext<BasketApi | null>(null);

export function BasketProvider({ children }: { children: React.ReactNode }) {
  const { session } = useSession();
  // One basket per signed-in user, kept across reloads.
  const storageKey = session ? `nextjs-multivendor-marketplace.basket.${session.id}` : null;
  const [items, setItems] = useState<BasketItem[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!storageKey) {
      setItems([]);
      return;
    }
    try {
      setItems(JSON.parse(localStorage.getItem(storageKey) ?? "[]"));
    } catch {
      setItems([]);
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: BasketItem[]) => {
      setItems(next);
      if (!storageKey) return;
      try {
        localStorage.setItem(storageKey, JSON.stringify(next));
      } catch {}
    },
    [storageKey]
  );

  const value = useMemo<BasketApi>(
    () => ({
      items,
      count: items.length,
      total: items.reduce((sum, item) => sum + item.price, 0),
      has: (id) => items.some((item) => item.id === id),
      add: (product) => {
        if (!items.some((item) => item.id === product.id)) persist([...items, product]);
      },
      remove: (id) => persist(items.filter((item) => item.id !== id)),
      clear: () => persist([]),
      open,
      setOpen,
    }),
    [items, open, persist]
  );

  return <BasketContext.Provider value={value}>{children}</BasketContext.Provider>;
}

export function useBasket() {
  const ctx = useContext(BasketContext);
  if (!ctx) throw new Error("useBasket must be used inside <BasketProvider>");
  return ctx;
}
