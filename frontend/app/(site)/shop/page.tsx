"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { Check, PackageX, Plus, Search, ShoppingBag, Store } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useBasket } from "@/components/providers/BasketProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui/Button";
import { EmptyState, ErrorState, GridSkeleton, PageHeader } from "@/components/ui/Display";
import { useResource } from "@/lib/client/useResource";
import type { ApiProduct, ApiVendor } from "@/lib/client/types";

function ProductCard({ product, vendor }: { product: ApiProduct; vendor?: ApiVendor }) {
  const basket = useBasket();
  const { m, formatPrice } = useI18n();
  const inBasket = basket.has(product.id);
  const available = product.inStock && product.activated;
  // Stable gradient per product for the "image".
  const hue = [...product.reference].reduce((h, c) => (h * 17 + c.charCodeAt(0)) % 360, 3);

  function toggle() {
    if (inBasket) basket.remove(product.id);
    else basket.add({ id: product.id, reference: product.reference, title: product.title, price: product.price, vendorId: product.vendorId });
  }

  return (
    <motion.article
      layout
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15 } }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      whileHover={{ y: -6 }}
      className="group flex flex-col overflow-hidden rounded-3xl border border-line bg-surface shadow-sm transition-shadow hover:shadow-xl"
    >
      <div
        className="relative flex h-36 items-center justify-center overflow-hidden"
        style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 62% / 0.35), hsl(${(hue + 60) % 360} 70% 55% / 0.2))` }}
      >
        <motion.span
          className="text-5xl font-bold text-ink/15 select-none"
          whileHover={{ scale: 1.15, rotate: -6 }}
        >
          {(product.title || product.reference).slice(0, 2).toUpperCase()}
        </motion.span>
        {!available && (
          <span className="absolute top-3 left-3 rounded-full bg-surface/90 px-2.5 py-1 text-xs font-medium text-muted">
            {m.shop.outOfStock}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-xs text-muted">
          <Store className="size-3.5" /> {vendor?.name ?? m.shop.unknownShop}
        </p>
        <h3 className="mt-1 font-semibold">{product.title || product.reference}</h3>
        {product.description && <p className="mt-1 line-clamp-2 text-sm text-muted">{product.description}</p>}
        <div className="mt-auto flex items-center justify-between pt-4">
          <span className="text-lg font-semibold tabular-nums">{formatPrice(product.price)}</span>
          <Button
            size="sm"
            variant={inBasket ? "secondary" : "primary"}
            disabled={!available}
            onClick={toggle}
            aria-pressed={inBasket}
            className="min-w-24 overflow-hidden"
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={inBasket ? "in" : "out"}
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -12, opacity: 0 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-1.5"
              >
                {inBasket ? <Check className="size-4" /> : <Plus className="size-4" />}
                {inBasket ? m.shop.added : m.shop.add}
              </motion.span>
            </AnimatePresence>
          </Button>
        </div>
      </div>
    </motion.article>
  );
}

function Shop() {
  const products = useResource<ApiProduct[]>("/api/product");
  const vendors = useResource<ApiVendor[]>("/api/vendor");
  const basket = useBasket();
  const { m } = useI18n();
  const [vendorFilter, setVendorFilter] = useState<string>("all");
  const [query, setQuery] = useState("");

  const vendorById = useMemo(() => new Map(vendors.data?.map((v) => [v.id, v])), [vendors.data]);
  const shopsWithProducts = useMemo(
    () => (vendors.data ?? []).filter((v) => products.data?.some((p) => p.vendorId === v.id)),
    [vendors.data, products.data]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (products.data ?? [])
      .filter((p) => vendorFilter === "all" || p.vendorId === vendorFilter)
      .filter(
        (p) =>
          !q ||
          [p.title, p.reference, p.description, vendorById.get(p.vendorId)?.name].some((f) =>
            f?.toLowerCase().includes(q)
          )
      );
  }, [products.data, vendorFilter, query, vendorById]);

  return (
    <>
      <PageHeader
        eyebrow={m.shop.eyebrow}
        title={m.shop.title}
        description={m.shop.description}
        actions={
          <Button variant="secondary" onClick={() => basket.setOpen(true)}>
            <ShoppingBag className="size-4" /> {m.shop.basketButton(basket.count)}
          </Button>
        }
      />

      <div className="mb-6 flex flex-col gap-4">
        <label className="relative block">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={m.shop.searchPlaceholder}
            aria-label={m.shop.searchLabel}
            className="w-full rounded-2xl border border-line bg-surface py-3 pr-4 pl-10 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
        </label>
        <LayoutGroup id="shop-filters">
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0" role="tablist" aria-label={m.shop.filterByShop}>
            {[{ id: "all", name: m.shop.allShops }, ...shopsWithProducts].map((v) => {
              const active = vendorFilter === v.id;
              return (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={active}
                  onClick={() => setVendorFilter(v.id)}
                  className={`relative shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                    active ? "text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="shop-filter-pill"
                      className="absolute inset-0 rounded-full bg-accent shadow-lg shadow-accent/25"
                      transition={{ type: "spring", stiffness: 450, damping: 32 }}
                    />
                  )}
                  <span className="relative">{v.name}</span>
                </button>
              );
            })}
          </div>
        </LayoutGroup>
      </div>

      {products.error ? (
        <ErrorState error={products.error} onRetry={products.reload} />
      ) : products.loading && !products.data ? (
        <GridSkeleton className="h-72" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<PackageX className="size-7" />}
          title={products.data?.length ? m.shop.noMatches : m.shop.noProducts}
          description={
            products.data?.length
              ? m.shop.tryAnother
              : m.shop.checkBack
          }
        />
      ) : (
        <motion.div layout className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {visible.map((product) => (
              <ProductCard key={product.id} product={product} vendor={vendorById.get(product.vendorId)} />
            ))}
          </AnimatePresence>
        </motion.div>
      )}
    </>
  );
}

export default function ShopPage() {
  return <RoleGate roles={["CUSTOMER", "ADMIN", "SUPERADMIN"]}>{() => <Shop />}</RoleGate>;
}
