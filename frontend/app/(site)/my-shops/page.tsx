"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, MapPin, Package, Phone, Plus, Store, Trash2, Wallet } from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Field";
import { ConfirmDialog, Modal } from "@/components/ui/Overlay";
import {
  EmptyState,
  ErrorState,
  GridSkeleton,
  PageHeader,
  StatCard,
  staggerContainer,
} from "@/components/ui/Display";
import { useResource } from "@/lib/client/useResource";
import { errorMessage } from "@/lib/client/api";
import type { ApiOrder, ApiProduct, ApiVendor, Session } from "@/lib/client/types";

function RegisterShopModal({ open, onClose, onCreated }: {
  open: boolean;
  onClose: () => void;
  onCreated: (vendor: ApiVendor) => void;
}) {
  const { request } = useSession();
  const toast = useToast();
  const { m } = useI18n();
  const empty = { name: "", description: "", phone: "", address: "" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const body = Object.fromEntries(Object.entries(form).filter(([, v]) => v.trim()).map(([k, v]) => [k, v.trim()]));
      const vendor = await request<ApiVendor>("/api/vendor/register", { method: "POST", body });
      toast.success(m.myShops.shopOpened, m.myShops.shopLive(vendor.name));
      onCreated(vendor);
      setForm(empty);
      onClose();
    } catch (error) {
      toast.error(m.myShops.shopFailed, errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={m.myShops.registerTitle} description={m.myShops.registerDescription}>
      <form onSubmit={submit} className="space-y-4">
        <Input label={m.myShops.shopName} required value={form.name} onChange={set("name")} hint={m.myShops.shopNameHint} />
        <Textarea label={m.common.description} value={form.description} onChange={set("description")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={m.myShops.phone} type="tel" value={form.phone} onChange={set("phone")} />
          <Input label={m.myShops.address} value={form.address} onChange={set("address")} />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>{m.common.cancel}</Button>
          <Button type="submit" loading={saving}>{m.myShops.submitShop}</Button>
        </div>
      </form>
    </Modal>
  );
}

function AddProductModal({ vendor, onClose, onCreated }: {
  vendor: ApiVendor | null;
  onClose: () => void;
  onCreated: (product: ApiProduct) => void;
}) {
  const { request } = useSession();
  const toast = useToast();
  const { m } = useI18n();
  const empty = { reference: "", title: "", description: "", price: "" };
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));
  const priceInvalid = form.price !== "" && !(Number(form.price) > 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendor || priceInvalid) return;
    setSaving(true);
    try {
      const product = await request<ApiProduct>("/api/product", {
        method: "POST",
        body: {
          vendorId: vendor.id,
          reference: form.reference.trim(),
          ...(form.title.trim() && { title: form.title.trim() }),
          ...(form.description.trim() && { description: form.description.trim() }),
          ...(form.price && { price: Number(form.price) }),
        },
      });
      toast.success(m.myShops.productAdded, product.title || product.reference);
      onCreated(product);
      setForm(empty);
      onClose();
    } catch (error) {
      toast.error(m.myShops.productFailed, errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={Boolean(vendor)} onClose={onClose} title={m.myShops.addProductTitle} description={vendor ? m.myShops.addProductTo(vendor.name) : undefined}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label={m.myShops.reference} required value={form.reference} onChange={set("reference")} placeholder="MUG-001" hint={m.myShops.referenceHint} />
          <Input
            label={m.myShops.price}
            type="number"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            value={form.price}
            onChange={set("price")}
            error={priceInvalid ? m.myShops.priceInvalid : undefined}
            hint={m.myShops.priceHint}
          />
        </div>
        <Input label={m.myShops.productTitle} value={form.title} onChange={set("title")} placeholder={m.myShops.productTitlePlaceholder} />
        <Textarea label={m.common.description} value={form.description} onChange={set("description")} />
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>{m.common.cancel}</Button>
          <Button type="submit" loading={saving}>{m.myShops.addProduct}</Button>
        </div>
      </form>
    </Modal>
  );
}

function ShopPanel({ vendor, products, orderCount, expanded, onToggle, onAddProduct, onDeleteProduct }: {
  vendor: ApiVendor;
  products: ApiProduct[];
  orderCount: number;
  expanded: boolean;
  onToggle: () => void;
  onAddProduct: () => void;
  onDeleteProduct?: (product: ApiProduct) => void;
}) {
  const { m, formatPrice } = useI18n();
  return (
    <motion.section
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="overflow-hidden rounded-3xl border border-line bg-surface shadow-sm"
    >
      <button onClick={onToggle} className="flex w-full items-center gap-4 p-5 text-left transition hover:bg-surface-2/50" aria-expanded={expanded}>
        <motion.span
          whileHover={{ rotate: -8 }}
          className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-warn/25 to-accent/20 text-warn"
        >
          <Store className="size-6" />
        </motion.span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-lg font-semibold">{vendor.name}</h2>
          <p className="truncate text-sm text-muted">{vendor.description || m.myShops.noDescription}</p>
        </div>
        <div className="hidden text-right text-sm sm:block">
          <p className="font-semibold tabular-nums">{m.myShops.productCount(products.length)}</p>
          <p className="text-muted tabular-nums">{m.myShops.orderCount(orderCount)}</p>
        </div>
        <motion.span animate={{ rotate: expanded ? 180 : 0 }} className="text-muted">
          <ChevronDown className="size-5" />
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 30 }}
          >
            <div className="border-t border-line p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-sm text-muted">
                <div className="flex flex-wrap gap-4">
                  {vendor.phone && <span className="flex items-center gap-1.5"><Phone className="size-4" /> {vendor.phone}</span>}
                  {vendor.address && <span className="flex items-center gap-1.5"><MapPin className="size-4" /> {vendor.address}</span>}
                </div>
                <Button size="sm" onClick={onAddProduct}>
                  <Plus className="size-4" /> {m.myShops.addProduct}
                </Button>
              </div>
              {products.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-line px-4 py-8 text-center text-sm text-muted">
                  {m.myShops.noProducts}
                </p>
              ) : (
                <ul className="divide-y divide-line">
                  <AnimatePresence initial={false}>
                    {products.map((p, i) => (
                      <motion.li
                        key={p.id}
                        layout
                        initial={{ opacity: 0, x: -16 }}
                        animate={{ opacity: 1, x: 0, transition: { delay: i * 0.03 } }}
                        exit={{ opacity: 0, x: 16 }}
                        className="flex items-center gap-4 py-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{p.title || p.reference}</p>
                          <p className="font-mono text-xs text-muted">{p.reference}</p>
                        </div>
                        <span className={`text-xs ${p.inStock ? "text-ok" : "text-muted"}`}>{p.inStock ? m.myShops.inStock : m.myShops.outOfStock}</span>
                        <span className="w-20 text-right font-semibold tabular-nums">{formatPrice(p.price)}</span>
                        {onDeleteProduct && (
                          <button
                            onClick={() => onDeleteProduct(p)}
                            className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                            aria-label={m.common.deleteItem(p.title || p.reference)}
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

function MyShops({ session }: { session: Session }) {
  const { can, request } = useSession();
  const toast = useToast();
  const { m, formatPrice } = useI18n();
  const vendors = useResource<ApiVendor[]>("/api/vendor");
  const products = useResource<ApiProduct[]>("/api/product");
  const orders = useResource<ApiOrder[]>("/api/order");
  const [shops, setShops] = useState<ApiVendor[]>([]);
  const [items, setItems] = useState<ApiProduct[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [registering, setRegistering] = useState(false);
  const [addingTo, setAddingTo] = useState<ApiVendor | null>(null);
  const [deleting, setDeleting] = useState<ApiProduct | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vendors.data) return;
    const mine = vendors.data.filter((v) => v.ownerId === session.id);
    setShops(mine);
    setExpanded((e) => e ?? mine[0]?.id ?? null);
  }, [vendors.data, session.id]);
  useEffect(() => {
    if (products.data) setItems(products.data);
  }, [products.data]);

  const shopIds = useMemo(() => new Set(shops.map((s) => s.id)), [shops]);
  const myProducts = items.filter((p) => shopIds.has(p.vendorId));
  const myOrders = (orders.data ?? []).filter((o) => shopIds.has(o.vendorId));
  const priceByRef = new Map(myProducts.map((p) => [p.reference, p.price]));
  const revenue = myOrders
    .filter((o) => o.status !== "Cancelled")
    .reduce((sum, o) => sum + o.productsRefs.reduce((s, r) => s + (priceByRef.get(r) ?? 0), 0), 0);

  async function confirmDelete() {
    if (!deleting) return;
    setBusy(true);
    try {
      await request(`/api/product/${deleting.id}`, { method: "DELETE" });
      setItems((all) => all.filter((p) => p.id !== deleting.id));
      toast.success(m.myShops.productDeleted, deleting.title || deleting.reference);
      setDeleting(null);
    } catch (error) {
      toast.error(m.myShops.productDeleteFailed, errorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  const loading = (vendors.loading && !vendors.data) || (products.loading && !products.data);
  const error = vendors.error ?? products.error;

  return (
    <>
      <PageHeader
        eyebrow={m.myShops.eyebrow}
        title={m.myShops.title}
        description={m.myShops.description}
        actions={
          <Button onClick={() => setRegistering(true)}>
            <Plus className="size-4" /> {m.myShops.openShop}
          </Button>
        }
      />

      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label={m.myShops.statShops} value={shops.length} icon={<Store className="size-4" />} />
        <StatCard label={m.myShops.statProducts} value={myProducts.length} icon={<Package className="size-4" />} />
        <StatCard label={m.myShops.statRevenue} value={revenue} format={formatPrice} icon={<Wallet className="size-4" />} />
      </motion.div>

      {error ? (
        <ErrorState error={error} onRetry={() => { vendors.reload(); products.reload(); }} />
      ) : loading ? (
        <GridSkeleton count={2} className="h-24" />
      ) : shops.length === 0 ? (
        <EmptyState
          icon={<Store className="size-7" />}
          title={m.myShops.noShop}
          description={m.myShops.noShopHint}
          action={<Button onClick={() => setRegistering(true)}><Plus className="size-4" /> {m.myShops.openShop}</Button>}
        />
      ) : (
        <motion.div layout className="space-y-4">
          {shops.map((shop) => (
            <ShopPanel
              key={shop.id}
              vendor={shop}
              products={myProducts.filter((p) => p.vendorId === shop.id)}
              orderCount={myOrders.filter((o) => o.vendorId === shop.id).length}
              expanded={expanded === shop.id}
              onToggle={() => setExpanded((e) => (e === shop.id ? null : shop.id))}
              onAddProduct={() => setAddingTo(shop)}
              onDeleteProduct={can("DELETE", "/api/product/x") ? setDeleting : undefined}
            />
          ))}
        </motion.div>
      )}

      <RegisterShopModal
        open={registering}
        onClose={() => setRegistering(false)}
        onCreated={(v) => {
          setShops((s) => [...s, v]);
          setExpanded(v.id);
        }}
      />
      <AddProductModal
        vendor={addingTo}
        onClose={() => setAddingTo(null)}
        onCreated={(p) => setItems((all) => [...all, p])}
      />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={busy}
        title={m.myShops.deleteTitle}
        description={m.myShops.deleteDescription(deleting?.title || deleting?.reference || "")}
      />
    </>
  );
}

export default function MyShopsPage() {
  return (
    <RoleGate roles={["VENDOR", "ADMIN", "SUPERADMIN"]}>{(session) => <MyShops session={session} />}</RoleGate>
  );
}
