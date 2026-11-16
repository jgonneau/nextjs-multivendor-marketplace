"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import {
  CalendarDays,
  CircleCheck,
  Eye,
  Package,
  PackageOpen,
  RefreshCw,
  Store,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import { RoleGate } from "@/components/RoleGate";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Button, buttonClass } from "@/components/ui/Button";
import { Input, Segmented } from "@/components/ui/Field";
import { ConfirmDialog, Modal } from "@/components/ui/Overlay";
import {
  Avatar,
  DeliveryProgress,
  EmptyState,
  ErrorState,
  GridSkeleton,
  PageHeader,
  StatCard,
  StatusBadge,
  staggerContainer,
} from "@/components/ui/Display";
import { useResource } from "@/lib/client/useResource";
import { errorMessage } from "@/lib/client/api";
import { ORDER_STATUSES, shortId, statusStep } from "@/lib/client/format";
import type { ApiOrder, ApiProduct, ApiUser, ApiVendor, Session } from "@/lib/client/types";

type Lookups = {
  vendor: (id: string) => ApiVendor | undefined;
  product: (ref: string) => ApiProduct | undefined;
  user: (id: string) => ApiUser | undefined;
};

const orderValue = (order: ApiOrder, lookups: Lookups) =>
  order.productsRefs.reduce((sum, ref) => sum + (lookups.product(ref)?.price ?? 0), 0);

function UpdateDeliveryModal({ order, onClose, onSaved }: {
  order: ApiOrder | null;
  onClose: () => void;
  onSaved: (order: ApiOrder) => void;
}) {
  const { request } = useSession();
  const toast = useToast();
  const { m } = useI18n();
  const [status, setStatus] = useState("Pending");
  const [date, setDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);

  // Reset the form each time a different order is opened.
  if (order && order.orderId !== lastId) {
    setLastId(order.orderId);
    setStatus(ORDER_STATUSES.includes(order.status as never) ? order.status : "Pending");
    setDate(order.deliveryDate ? order.deliveryDate.slice(0, 10) : "");
  }

  async function save() {
    if (!order) return;
    setSaving(true);
    try {
      const updated = await request<ApiOrder>(`/api/order/${order.orderId}/updateDelivery`, {
        method: "PUT",
        body: { status, ...(date && { deliveryDate: date }) },
      });
      toast.success(m.orders.deliveryUpdated, m.orders.nowStatus(shortId(order.orderId), m.status[status as keyof typeof m.status] ?? status));
      onSaved(updated);
      onClose();
    } catch (error) {
      toast.error(m.orders.updateFailed, errorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={Boolean(order)}
      onClose={onClose}
      title={m.orders.updateDelivery}
      description={order ? m.orders.order(shortId(order.orderId)) : undefined}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{m.common.cancel}</Button>
          <Button onClick={save} loading={saving}>{m.common.saveChanges}</Button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="space-y-1.5">
          <p className="text-sm font-medium">{m.orders.status}</p>
          <Segmented
            label={m.orders.status}
            layoutId="delivery-status"
            value={status}
            onChange={setStatus}
            options={ORDER_STATUSES.map((s) => ({ value: s, label: m.status[s] }))}
          />
        </div>
        <Input
          label={m.orders.deliveryDate}
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          hint={m.orders.deliveryDateHint}
        />
        <DeliveryProgress status={status} />
      </div>
    </Modal>
  );
}

function OrderDetailsModal({ orderId, onClose, lookups }: {
  orderId: string | null;
  onClose: () => void;
  lookups: Lookups;
}) {
  // Fetched fresh from GET /api/order/[cuid] (admins only).
  const detail = useResource<ApiOrder>(orderId ? `/api/order/${orderId}` : null);
  const order = detail.data;
  const { m, formatDate, formatPrice } = useI18n();
  const f = m.orders.fields;
  return (
    <Modal open={Boolean(orderId)} onClose={onClose} title={m.orders.detailsTitle} size="lg">
      {detail.error ? (
        <ErrorState error={detail.error} onRetry={detail.reload} />
      ) : !order ? (
        <GridSkeleton count={2} className="h-24" />
      ) : (
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          {[
            [f.order, <span key="id" className="font-mono">{order.orderId}</span>],
            [f.status, <StatusBadge key="s" status={order.status} />],
            [f.shop, lookups.vendor(order.vendorId)?.name ?? order.vendorId],
            [f.customer, lookups.user(order.userId)?.email ?? order.userId],
            [f.created, formatDate(order.createdAt, true)],
            [f.updated, formatDate(order.updatedAt, true)],
            [f.deliveryDate, formatDate(order.deliveryDate)],
            [f.value, formatPrice(orderValue(order, lookups))],
          ].map(([label, value]) => (
            <div key={label as string} className="rounded-xl bg-surface-2 p-3">
              <dt className="text-xs text-muted">{label}</dt>
              <dd className="mt-1 font-medium break-all">{value}</dd>
            </div>
          ))}
          <div className="rounded-xl bg-surface-2 p-3 sm:col-span-2">
            <dt className="text-xs text-muted">{f.products}</dt>
            <dd className="mt-2 flex flex-wrap gap-2">
              {order.productsRefs.map((ref) => (
                <span key={ref} className="rounded-lg bg-surface px-2.5 py-1 text-xs">
                  {lookups.product(ref)?.title ?? ref}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      )}
    </Modal>
  );
}

function OrderCard({ order, session, lookups, onUpdate, onDetails, onDelete }: {
  order: ApiOrder;
  session: Session;
  lookups: Lookups;
  onUpdate?: () => void;
  onDetails?: () => void;
  onDelete?: () => void;
}) {
  const vendor = lookups.vendor(order.vendorId);
  const customer = lookups.user(order.userId);
  const isCustomer = session.role === "CUSTOMER";
  const step = statusStep(order.status);
  const { m, formatDate, formatPrice } = useI18n();

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 260, damping: 26 }}
      className="rounded-3xl border border-line bg-surface p-5 shadow-sm transition-shadow hover:shadow-lg"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {isCustomer || !customer ? (
            <span className="flex size-9 items-center justify-center rounded-full bg-accent/10 text-accent">
              <Store className="size-4" />
            </span>
          ) : (
            <Avatar email={customer.email} name={customer.name} />
          )}
          <div>
            <p className="font-semibold">
              {isCustomer ? vendor?.name ?? m.common.shop : customer?.email ?? m.orders.customerFallback(shortId(order.userId))}
            </p>
            <p className="text-xs text-muted">
              {shortId(order.orderId)} · {formatDate(order.createdAt, true)}
              {!isCustomer && vendor && <> · {vendor.name}</>}
            </p>
          </div>
        </div>
        <StatusBadge status={order.status} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {order.productsRefs.map((ref, i) => {
          const product = lookups.product(ref);
          return (
            <motion.span
              key={`${ref}-${i}`}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.05 * i }}
              className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs"
            >
              {product?.title ?? ref}
              {product && <span className="ml-1.5 text-muted tabular-nums">{formatPrice(product.price)}</span>}
            </motion.span>
          );
        })}
      </div>

      <div className="mt-5">
        <DeliveryProgress status={order.status} />
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span className="flex items-center gap-1.5">
            {order.status === "Delivered" ? <CircleCheck className="size-3.5 text-ok" /> : <Truck className="size-3.5" />}
            {order.status === "Cancelled"
              ? m.status.Cancelled
              : step >= 0
                ? m.orders.stepOf(step + 1, 4)
                : order.status}
          </span>
          <span className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5" />
            {order.deliveryDate ? m.orders.deliveryOn(formatDate(order.deliveryDate)) : m.orders.noDeliveryDate}
          </span>
        </div>
      </div>

      {(onUpdate || onDetails || onDelete) && (
        <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          {onDetails && (
            <Button size="sm" variant="ghost" onClick={onDetails}>
              <Eye className="size-4" /> {m.orders.details}
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" onClick={onDelete} className="hover:!text-danger">
              <Trash2 className="size-4" /> {m.common.delete}
            </Button>
          )}
          {onUpdate && (
            <Button size="sm" onClick={onUpdate}>
              <Truck className="size-4" /> {m.orders.updateDelivery}
            </Button>
          )}
        </div>
      )}
    </motion.article>
  );
}

function Orders({ session }: { session: Session }) {
  const { can, request, href } = useSession();
  const toast = useToast();
  const { m, formatPrice } = useI18n();
  const isAdmin = session.role === "ADMIN" || session.role === "SUPERADMIN";
  const orders = useResource<ApiOrder[]>("/api/order");
  const vendors = useResource<ApiVendor[]>("/api/vendor");
  const products = useResource<ApiProduct[]>("/api/product");
  const users = useResource<ApiUser[]>(isAdmin ? "/api/user" : null);
  const [filter, setFilter] = useState("All");
  const [list, setList] = useState<ApiOrder[] | null>(null);
  const [editing, setEditing] = useState<ApiOrder | null>(null);
  const [viewing, setViewing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<ApiOrder | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  // Local copy so updates and deletions animate in place without a refetch;
  // replaced whenever a fresh response arrives.
  useEffect(() => {
    if (orders.data) setList(orders.data);
  }, [orders.data]);
  const all = useMemo(() => list ?? [], [list]);

  const lookups = useMemo<Lookups>(() => {
    const v = new Map(vendors.data?.map((x) => [x.id, x]));
    const p = new Map(products.data?.map((x) => [x.reference, x]));
    const u = new Map(users.data?.map((x) => [x.id, x]));
    return { vendor: (id) => v.get(id), product: (ref) => p.get(ref), user: (id) => u.get(id) };
  }, [vendors.data, products.data, users.data]);

  const sorted = useMemo(
    () => [...all].sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    [all]
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = { All: all.length };
    for (const s of ORDER_STATUSES) c[s] = all.filter((o) => o.status === s).length;
    return c;
  }, [all]);
  const visible = filter === "All" ? sorted : sorted.filter((o) => o.status === filter);

  const totalValue = all.reduce((sum, o) => sum + orderValue(o, lookups), 0);
  const inProgress = all.filter((o) => ["Pending", "Processing", "Shipped"].includes(o.status)).length;

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      await request(`/api/order/${deleting.orderId}`, { method: "DELETE" });
      setList((l) => (l ?? []).filter((o) => o.orderId !== deleting.orderId));
      toast.success(m.orders.deleted, shortId(deleting.orderId));
      setDeleting(null);
    } catch (error) {
      toast.error(m.orders.deleteFailed, errorMessage(error));
    } finally {
      setDeletingBusy(false);
    }
  }

  const refresh = () => orders.reload();

  const titles = m.orders.titles;
  const [title, description] =
    session.role === "VENDOR" ? titles.VENDOR : isAdmin ? titles.ADMIN : titles.CUSTOMER;
  const statusLabel = (s: string) => (s === "All" ? m.common.all : (m.status[s as keyof typeof m.status] ?? s));

  return (
    <>
      <PageHeader
        eyebrow={m.orders.eyebrow}
        title={title}
        description={description}
        actions={
          <Button variant="secondary" onClick={refresh} loading={orders.loading && Boolean(orders.data)}>
            <RefreshCw className="size-4" /> {m.orders.refresh}
          </Button>
        }
      />

      <motion.div initial="hidden" animate="show" variants={staggerContainer} className="mb-8 grid gap-4 sm:grid-cols-3">
        <StatCard label={m.orders.statOrders} value={all.length} icon={<Package className="size-4" />} />
        <StatCard label={m.orders.statInProgress} value={inProgress} icon={<Truck className="size-4" />} />
        <StatCard label={m.orders.statTotalValue} value={totalValue} format={formatPrice} icon={<Wallet className="size-4" />} />
      </motion.div>

      <LayoutGroup id="order-tabs">
        <div className="mb-6 flex gap-1 overflow-x-auto border-b border-line" role="tablist" aria-label={m.orders.filterByStatus}>
          {["All", ...ORDER_STATUSES].map((s) => (
            <button
              key={s}
              role="tab"
              aria-selected={filter === s}
              onClick={() => setFilter(s)}
              className={`relative shrink-0 px-4 py-2.5 text-sm font-medium transition-colors ${
                filter === s ? "text-ink" : "text-muted hover:text-ink"
              }`}
            >
              {statusLabel(s)}
              <span className="ml-1.5 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] tabular-nums">{counts[s] ?? 0}</span>
              {filter === s && (
                <motion.span layoutId="order-tab-underline" className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
              )}
            </button>
          ))}
        </div>
      </LayoutGroup>

      {orders.error ? (
        <ErrorState error={orders.error} onRetry={refresh} />
      ) : orders.loading && !orders.data ? (
        <GridSkeleton count={4} className="h-56" />
      ) : visible.length === 0 ? (
        <EmptyState
          icon={<PackageOpen className="size-7" />}
          title={all.length ? m.orders.noneWithStatus(statusLabel(filter)) : m.orders.noOrders}
          description={
            session.role === "VENDOR"
              ? m.orders.vendorEmpty
              : all.length
                ? m.orders.tryAnotherStatus
                : m.orders.placedShowHere
          }
          action={
            !all.length && can("POST", "/api/order") ? (
              <Link href={href("/shop")} className={buttonClass("secondary")}>{m.orders.startShopping}</Link>
            ) : undefined
          }
        />
      ) : (
        <motion.div layout className="grid gap-4 lg:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {visible.map((order) => {
              const ownsVendor = lookups.vendor(order.vendorId)?.ownerId === session.id;
              return (
                <OrderCard
                  key={order.orderId}
                  order={order}
                  session={session}
                  lookups={lookups}
                  onUpdate={
                    ownsVendor && can("PUT", `/api/order/${order.orderId}/updateDelivery`)
                      ? () => setEditing(order)
                      : undefined
                  }
                  onDetails={can("GET", `/api/order/${order.orderId}`) ? () => setViewing(order.orderId) : undefined}
                  onDelete={can("DELETE", `/api/order/${order.orderId}`) ? () => setDeleting(order) : undefined}
                />
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}

      <UpdateDeliveryModal
        order={editing}
        onClose={() => setEditing(null)}
        onSaved={(updated) => setList((l) => (l ?? []).map((o) => (o.orderId === updated.orderId ? updated : o)))}
      />
      <OrderDetailsModal orderId={viewing} onClose={() => setViewing(null)} lookups={lookups} />
      <ConfirmDialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deletingBusy}
        title={m.orders.deleteTitle}
        description={m.orders.deleteDescription(deleting ? shortId(deleting.orderId) : "")}
      />
    </>
  );
}

export default function OrdersPage() {
  return (
    <RoleGate roles={["CUSTOMER", "VENDOR", "ADMIN", "SUPERADMIN"]}>
      {(session) => <Orders session={session} />}
    </RoleGate>
  );
}
