"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpen,
  LogOut,
  Menu,
  Package,
  ShoppingBag,
  Store,
  Timer,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { useSession } from "@/components/providers/SessionProvider";
import { useBasket } from "@/components/providers/BasketProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Avatar, RoleBadge } from "@/components/ui/Display";
import type { Role } from "@/lib/client/types";

type NavLink = { href: string; label: "shop" | "orders" | "myShops" | "users" | "catalog"; icon: typeof Store; roles: Role[] };

const LINKS: NavLink[] = [
  { href: "/shop", label: "shop", icon: ShoppingBag, roles: ["CUSTOMER", "ADMIN", "SUPERADMIN"] },
  { href: "/orders", label: "orders", icon: Package, roles: ["CUSTOMER", "VENDOR", "ADMIN", "SUPERADMIN"] },
  { href: "/my-shops", label: "myShops", icon: Store, roles: ["VENDOR", "ADMIN", "SUPERADMIN"] },
  { href: "/admin/users", label: "users", icon: Users, roles: ["ADMIN", "SUPERADMIN"] },
  { href: "/admin/catalog", label: "catalog", icon: Warehouse, roles: ["ADMIN", "SUPERADMIN"] },
];

function useCountdown(exp: number | undefined) {
  const { m } = useI18n();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  if (!exp) return null;
  const s = Math.max(0, Math.floor(exp - now / 1000));
  if (s > 86400) return m.nav.days(Math.floor(s / 86400));
  const mins = Math.floor(s / 60);
  return `${mins}:${String(s % 60).padStart(2, "0")}`;
}

function AccountMenu() {
  const { session, logout } = useSession();
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const remaining = useCountdown(session?.exp);

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

  if (!session) return null;
  return (
    <div ref={ref} className="relative">
      <motion.button
        whileTap={{ scale: 0.92 }}
        onClick={() => setOpen((o) => !o)}
        className="rounded-full ring-2 ring-transparent transition hover:ring-accent/40"
        aria-label={m.nav.accountMenu}
        aria-expanded={open}
      >
        <Avatar email={session.email} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96, transition: { duration: 0.12 } }}
            transition={{ type: "spring", stiffness: 500, damping: 32 }}
            style={{ transformOrigin: "top right" }}
            className="absolute right-0 mt-2 w-64 rounded-2xl border border-line bg-surface p-2 shadow-xl"
          >
            <div className="px-3 py-2">
              <p className="truncate text-sm font-medium">{session.email}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <RoleBadge role={session.role} />
                {remaining && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted tabular-nums" title={m.nav.sessionTimeLeft}>
                    <Timer className="size-3.5" /> {remaining}
                  </span>
                )}
              </div>
            </div>
            <div className="my-1 h-px bg-line" />
            <Link
              href="/docs"
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm text-muted transition hover:bg-surface-2 hover:text-ink"
            >
              <BookOpen className="size-4" /> {m.nav.apiDocs}
            </Link>
            <button
              onClick={() => logout(m.nav.signedOut)}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm text-danger transition hover:bg-danger/10"
            >
              <LogOut className="size-4" /> {m.nav.signOut}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function BasketButton() {
  const { count, setOpen } = useBasket();
  const { m } = useI18n();
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={() => setOpen(true)}
      className="relative rounded-xl p-2 text-muted transition hover:bg-surface-2 hover:text-ink"
      aria-label={m.nav.basket(count)}
    >
      <ShoppingBag className="size-5" />
      <AnimatePresence>
        {count > 0 && (
          <motion.span
            key={count}
            initial={{ scale: 0.3, y: -6 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 15 }}
            className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white"
          >
            {count}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

export function Nav() {
  const { session, ready, can, href } = useSession();
  const { m } = useI18n();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const links = session ? LINKS.filter((l) => l.roles.includes(session.role)) : [];

  useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-2 px-4 sm:gap-4 sm:px-6">
        <Link href="/" className="group flex items-center gap-2 font-semibold tracking-tight">
          <motion.span
            whileHover={{ rotate: 12, scale: 1.08 }}
            className="flex size-8 items-center justify-center rounded-xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-lg shadow-accent/30"
          >
            <Store className="size-4" />
          </motion.span>
          <span className="hidden sm:inline">Marketplace</span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 md:flex" aria-label={m.nav.main}>
          {links.map((link) => {
            const active = pathname.startsWith(href(link.href));
            return (
              <Link
                key={link.href}
                href={href(link.href)}
                className={`relative rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                  active ? "text-ink" : "text-muted hover:text-ink"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-pill"
                    className="absolute inset-0 rounded-xl bg-surface shadow-sm ring-1 ring-line"
                    transition={{ type: "spring", stiffness: 450, damping: 34 }}
                  />
                )}
                <span className="relative flex items-center gap-2">
                  <link.icon className="size-4" />
                  {m.nav[link.label]}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          {ready && session && can("POST", "/api/order") && <BasketButton />}
          {ready && session && <AccountMenu />}
          {ready && !session && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1 sm:gap-2">
              <Link href="/login" className="rounded-xl px-2 py-2 text-sm font-medium whitespace-nowrap text-muted transition hover:text-ink sm:px-3">
                {m.common.signIn}
              </Link>
              <Link
                href="/signup"
                className="rounded-xl bg-accent px-3 py-2 text-sm font-medium whitespace-nowrap text-white sm:px-4 shadow-lg shadow-accent/25 transition hover:brightness-110"
              >
                {m.common.getStarted}
              </Link>
            </motion.div>
          )}
          {links.length > 0 && (
            <button
              className="rounded-xl p-2 text-muted transition hover:bg-surface-2 hover:text-ink md:hidden"
              onClick={() => setMobileOpen((o) => !o)}
              aria-label={m.nav.menu}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-line md:hidden"
            aria-label={m.nav.main}
          >
            <motion.ul
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
              className="space-y-1 px-4 py-3"
            >
              {links.map((link) => (
                <motion.li key={link.href} variants={{ hidden: { opacity: 0, x: -12 }, show: { opacity: 1, x: 0 } }}>
                  <Link
                    href={href(link.href)}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${
                      pathname.startsWith(href(link.href)) ? "bg-surface text-ink ring-1 ring-line" : "text-muted"
                    }`}
                  >
                    <link.icon className="size-4" /> {m.nav[link.label]}
                  </Link>
                </motion.li>
              ))}
            </motion.ul>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
