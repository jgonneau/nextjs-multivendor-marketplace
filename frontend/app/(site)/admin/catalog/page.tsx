"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Eye, Package, Search, Store, Trash2, Warehouse } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { ConfirmDialog, Modal } from "@/components/ui/Overlay";
import {
  Avatar,
  EmptyState,
  ErrorState,
  GridSkeleton,
  PageHeader,
  StatCard,
  staggerContainer,
  staggerItem,
} from "@/components/ui/Display";
import { useResource } from "@/lib/client/useResource";
import { errorMessage } from "@/lib/client/api";
import type { ApiProduct, ApiUser, ApiVendor } from "@/lib/client/types";

type Target = { kind: "vendor"; item: ApiVendor } | { kind: "product"; item: ApiProduct };

/** Fresh details from GET /api/vendor/[cuid] or /api/product/[cuid]. */
function DetailsModal({ target, onClose, owner }: { target: Target | null; onClose: () => void; owner?: ApiUser }) {
  const path = target ? `/api/${target.kind}/${target.item.id}` : null;
  const detail = useResource<Record<string, unknown>>(path);
  const { m, formatDate, formatPrice } = useI18n();
  const show = (k: string, v: unknown) =>
    k === "ownerId" && owner
      ? `${owner.email} (${String(v)})`
      : k === "price"
        ? formatPrice(Number(v))
        : /At$/.test(k)
          ? formatDate(String(v), true)
          : typeof v === "boolean"
            ? v ? m.catalog.yes : m.catalog.no
            : String(v ?? "—");
  const rows = detail.data
    ? Object.entries(detail.data).map(([k, v]) => [k, m.catalog.fields[k] ?? k, show(k, v)])
    : [];
  return (
    <Modal open={Boolean(target)} onClose={onClose} title={target?.kind === "vendor" ? m.catalog.shopDetails : m.catalog.productDetails} size="lg">
      {detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.reload} />
      ) : !detail.data ? (
        <GridSkeleton count={2} className="h-20" />
      ) : (
        <motion.dl initial="hidden" animate="show" variants={staggerContainer} className="grid gap-3 text-sm sm:grid-cols-2">
          {rows.map(([k, label, v]) => (
            <motion.div key={k} variants={staggerItem} className="rounded-xl bg-surface-2 p-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 font-medium break-all">{v}</dd>
            </motion.div>
          ))}
        </motion.dl>
      )}
    </Modal>
  );
}

function Catalog() {
  const { can, request } = useSession();
  const toast = useToast();
  const { m, formatPrice } = useI18n();
  const vendors = useResource<ApiVendor[]>("/api/vendor");
  const products = useResource<ApiProduct[]>("/api/product");
  const users = useResource<ApiUser[]>("/api/user");
  const [shops, setShops] = useState<ApiVendor[]>([]);
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [query, setQuery] = useState("");
  const [viewing, setViewing] = useState<Target | null>(null);
  const [deleting, setDeleting] = useState<Target | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { if (vendors.data) setShops(vendors.data); }, [vendors.data]);
  useEffect(() => { if (products.data) setItems(products.data); }, [products.data]);

  const owners = useMemo(() => new Map(users.data?.map((u) => [u.id, u])), [users.data]);
  const canDelete = can("DELETE", "/api/vendor/x");
  const canView = can("GET", "/api/vendor/x");

  const q = query.trim().toLowerCase();
  const visibleShops = shops.filter(
    (v) =>
      !q ||
      v.name.toLowerCase().includes(q) ||
      items.some((p) => p.vendorId === v.id && [p.title, p.reference].some((f) => f?.toLowerCase().includes(q)))
  );

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    const { kind, item } = deleting;
    try {
      await request(`/api/${kind}/${item.id}`, { method: "DELETE" });
      if (kind === "vendor") setShops((s) => s.filter((v) => v.id !== item.id));
      else setItems((s) => s.filter((p) => p.id !== item.id));
      toast.success(kind === "vendor" ? m.catalog.shopDeleted : m.catalog.productDeleted);
      setDeleting(null);
    } catch (error) {
      const message = errorMessage(error);
      toast.error(
        m.catalog.deleteFailed,
        /reference/i.test(message)
          ? kind === "vendor"
            ? m.catalog.shopReferenced
            : m.catalog.productReferenced
          : message
      );
    } finally {
      setBusy(false);
    }
  }

  const iconButton = "rounded-lg p-1.5 text-muted transition";

  return (
    <>
      <PageHeader
        eyebrow={m.catalog.eyebrow}
        title={m.catalog.title}
        description={canDelete ? m.catalog.descriptionDelete : m.catalog.descriptionReadOnly}
      />

      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label={m.catalog.statShops} value={shops.length} icon={<Store className="size-4" />} />
        <StatCard label={m.catalog.statProducts} value={items.length} icon={<Package className="size-4" />} />
        <StatCard
          label={m.catalog.statAveragePrice}
          value={items.length ? items.reduce((s, p) => s + p.price, 0) / items.length : 0}
          format={formatPrice}
          icon={<Warehouse className="size-4" />}
        />
      </motion.div>

      <label className="relative mb-6 block">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={m.catalog.searchPlaceholder}
          aria-label={m.catalog.searchLabel}
          className="w-full rounded-2xl border border-line bg-surface py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
        />
      </label>

      {vendors.error || products.error ? (
        <ErrorState error={(vendors.error ?? products.error)!} onRetry={() => { vendors.reload(); products.reload(); }} />
      ) : !vendors.data || !products.data ? (
        <GridSkeleton count={4} className="h-48" />
      ) : visibleShops.length === 0 ? (
        <EmptyState icon={<Store className="size-7" />} title={shops.length ? m.catalog.nothingMatches : m.catalog.noShops} />
      ) : (
        <motion.div layout className="grid gap-4 md:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {visibleShops.map((shop) => {
              const owner = owners.get(shop.ownerId);
              const shopItems = items.filter((p) => p.vendorId === shop.id);
              return (
                <motion.section
                  key={shop.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94 }}
                  className="rounded-3xl border border-line bg-surface p-5 shadow-sm"
                >
                  <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-warn/15 text-warn">
                      <Store className="size-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <h2 className="truncate font-semibold">{shop.name}</h2>
                      <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted">
                        {owner && <Avatar email={owner.email} name={owner.name} size="sm" />}
                        {owner?.email ?? m.catalog.unknownOwner}
                      </p>
                    </div>
                    {canView && (
                      <button onClick={() => setViewing({ kind: "vendor", item: shop })} className={`${iconButton} hover:bg-surface-2 hover:text-ink`} aria-label={m.common.viewItem(shop.name)}>
                        <Eye className="size-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => setDeleting({ kind: "vendor", item: shop })} className={`${iconButton} hover:bg-danger/10 hover:text-danger`} aria-label={m.common.deleteItem(shop.name)}>
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  <ul className="mt-4 space-y-1">
                    <AnimatePresence initial={false}>
                      {shopItems.length === 0 && <li className="text-sm text-muted">{m.catalog.noProducts}</li>}
                      {shopItems.map((p) => (
                        <motion.li
                          key={p.id}
                          layout
                          exit={{ opacity: 0, height: 0 }}
                          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm hover:bg-surface-2"
                        >
                          <span className="min-w-0 flex-1 truncate">{p.title || p.reference}</span>
                          <span className="tabular-nums text-muted">{formatPrice(p.price)}</span>
                          {canView && (
                            <button onClick={() => setViewing({ kind: "product", item: p })} className={`${iconButton} hover:text-ink`} aria-label={m.common.viewItem(p.title || p.reference)}>
                              <Eye className="size-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button onClick={() => setDeleting({ kind: "product", item: p })} className={`${iconButton} hover:text-danger`} aria-label={m.common.deleteItem(p.title || p.reference)}>
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                </motion.section>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <DetailsModal
        target={viewing}
        onClose={() => setViewing(null)}
        owner={viewing?.kind === "vendor" ? owners.get(viewing.item.ownerId) : undefined}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title={deleting?.kind === "vendor" ? m.catalog.deleteShopTitle : m.catalog.deleteProductTitle}
        description={
          deleting?.kind === "vendor"
            ? m.catalog.deleteShopDescription(deleting.item.name)
            : m.catalog.deleteProductDescription(deleting?.item.title || (deleting?.item as ApiProduct | undefined)?.reference || "")
        }
      />
    </>
  );
}

export default function CatalogPage() {
  return <RoleGate roles={["ADMIN", "SUPERADMIN"]}>{() => <Catalog />}</RoleGate>;
}
