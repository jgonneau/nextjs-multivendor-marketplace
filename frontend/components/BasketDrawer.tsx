"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ShoppingBag, Store, Trash2 } from "lucide-react";
import { useBasket } from "@/components/providers/BasketProvider";
import { useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { Drawer } from "@/components/ui/Overlay";
import { Button, buttonClass } from "@/components/ui/Button";
import { Select } from "@/components/ui/Field";
import { AnimatedNumber, EmptyState } from "@/components/ui/Display";
import { useResource } from "@/lib/client/useResource";
import { errorMessage } from "@/lib/client/api";
import type { ApiUser, ApiVendor, CreatedSubOrder } from "@/lib/client/types";

function SuccessCheck() {
  return (
    <motion.svg viewBox="0 0 52 52" className="size-20 text-ok" initial="hidden" animate="show">
      <motion.circle
        cx="26"
        cy="26"
        r="24"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        variants={{ hidden: { pathLength: 0 }, show: { pathLength: 1, transition: { duration: 0.5 } } }}
      />
      <motion.path
        d="M15 27 l7 7 l15 -16"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        variants={{
          hidden: { pathLength: 0 },
          show: { pathLength: 1, transition: { duration: 0.35, delay: 0.45 } },
        }}
      />
    </motion.svg>
  );
}

export function BasketDrawer() {
  const { items, total, remove, clear, open, setOpen } = useBasket();
  const { session, request, href } = useSession();
  const toast = useToast();
  const { m, formatPrice } = useI18n();
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedSubOrder[] | null>(null);
  const [customerId, setCustomerId] = useState("");

  // Admins place orders on behalf of a user and must pick one.
  const ordersForOthers = session?.role === "ADMIN" || session?.role === "SUPERADMIN";
  const vendors = useResource<ApiVendor[]>(open ? "/api/vendor" : null);
  const users = useResource<ApiUser[]>(open && ordersForOthers ? "/api/user" : null);

  const groups = useMemo(() => {
    const byVendor = new Map<string, typeof items>();
    for (const item of items) byVendor.set(item.vendorId, [...(byVendor.get(item.vendorId) ?? []), item]);
    return [...byVendor.entries()];
  }, [items]);

  const vendorName = (id: string) => vendors.data?.find((v) => v.id === id)?.name ?? m.common.shop;

  async function checkout() {
    if (ordersForOthers && !customerId) {
      toast.error(m.basket.chooseUserError);
      return;
    }
    setSubmitting(true);
    try {
      const result = await request<CreatedSubOrder[]>("/api/order", {
        method: "POST",
        body: {
          product_list: items.map((i) => i.id),
          ...(ordersForOthers && { userId: customerId }),
        },
      });
      setCreated(result);
      clear();
    } catch (error) {
      toast.error(m.basket.checkoutFailed, errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function close() {
    setOpen(false);
    // Let the exit animation finish before resetting the success view.
    setTimeout(() => setCreated(null), 300);
  }

  return (
    <Drawer
      open={open}
      onClose={close}
      title={created ? m.basket.placed : m.basket.title}
      footer={
        !created &&
        items.length > 0 && (
          <div className="space-y-4">
            {ordersForOthers && (
              <Select label={m.basket.orderFor} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">{m.basket.chooseUser}</option>
                {users.data?.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.email} ({m.roles[u.role]})
                  </option>
                ))}
              </Select>
            )}
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted">{m.basket.total}</span>
              <span className="text-2xl font-semibold tabular-nums">
                <AnimatedNumber value={total} format={formatPrice} />
              </span>
            </div>
            {groups.length > 1 && (
              <p className="text-xs text-muted">
                {m.basket.splitNotice(groups.length)}
              </p>
            )}
            <Button size="lg" className="w-full" loading={submitting} onClick={checkout}>
              {m.basket.placeOrder}
            </Button>
          </div>
        )
      }
    >
      <AnimatePresence mode="wait">
        {created ? (
          <motion.div
            key="done"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center py-10 text-center"
          >
            <SuccessCheck />
            <h3 className="mt-5 text-xl font-semibold">{m.basket.thankYou}</h3>
            <p className="mt-1 text-sm text-muted">
              {m.basket.created(created.length)}
            </p>
            <Link href={href("/orders")} onClick={close} className={buttonClass("secondary", "md", "mt-6")}>
              {m.basket.trackOrders}
            </Link>
          </motion.div>
        ) : items.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <EmptyState
              icon={<ShoppingBag className="size-7" />}
              title={m.basket.empty}
              description={m.basket.emptyHint}
              action={
                <Link href={href("/shop")} onClick={close} className={buttonClass("secondary")}>
                  {m.basket.goToShop}
                </Link>
              }
            />
          </motion.div>
        ) : (
          <motion.div key="items" className="space-y-6">
            {groups.map(([vendorId, vendorItems]) => (
              <motion.section key={vendorId} layout>
                <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold tracking-wider text-muted uppercase">
                  <Store className="size-3.5" /> {vendorName(vendorId)}
                </h3>
                <ul className="space-y-2">
                  <AnimatePresence initial={false}>
                    {vendorItems.map((item) => (
                      <motion.li
                        key={item.id}
                        layout
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -30, height: 0, marginBottom: 0 }}
                        className="flex items-center gap-3 rounded-xl border border-line p-3"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title || item.reference}</p>
                          <p className="font-mono text-xs text-muted">{item.reference}</p>
                        </div>
                        <span className="text-sm font-semibold tabular-nums">{formatPrice(item.price)}</span>
                        <button
                          onClick={() => remove(item.id)}
                          className="rounded-lg p-1.5 text-muted transition hover:bg-danger/10 hover:text-danger"
                          aria-label={m.common.removeItem(item.title || item.reference)}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              </motion.section>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </Drawer>
  );
}
