"use client";

import { useEffect } from "react";
import { motion, useSpring, useTransform, type Variants } from "motion/react";
import { CircleAlert, Inbox, RotateCw, ShieldOff } from "lucide-react";
import type { Role } from "@/lib/client/types";
import { initials, statusStep } from "@/lib/client/format";
import { useI18n } from "@/components/providers/I18nProvider";

/* ---------- Stagger helpers ---------- */

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 16, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 26 } },
};

/* ---------- Page header ---------- */

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <motion.header
      initial="hidden"
      animate="show"
      variants={staggerContainer}
      className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        {eyebrow && (
          <motion.p variants={staggerItem} className="mb-2 text-xs font-semibold tracking-[0.2em] text-accent uppercase">
            {eyebrow}
          </motion.p>
        )}
        <motion.h1 variants={staggerItem} className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {title}
        </motion.h1>
        {description && (
          <motion.p variants={staggerItem} className="mt-2 max-w-2xl text-muted">
            {description}
          </motion.p>
        )}
      </div>
      {actions && (
        <motion.div variants={staggerItem} className="flex flex-wrap gap-2">
          {actions}
        </motion.div>
      )}
    </motion.header>
  );
}

/* ---------- Cards & badges ---------- */

export function Card({ className = "", children, ...rest }: React.ComponentProps<typeof motion.div>) {
  return (
    <motion.div
      className={`rounded-2xl border border-line bg-surface shadow-sm shadow-black/[0.03] ${className}`}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

const ROLE_TONES: Record<Role, string> = {
  USER: "bg-surface-2 text-muted",
  CUSTOMER: "bg-accent-2/15 text-accent-2",
  VENDOR: "bg-warn/15 text-warn",
  ADMIN: "bg-accent/15 text-accent",
  SUPERADMIN: "bg-danger/15 text-danger",
};

export function RoleBadge({ role }: { role: Role }) {
  const { m } = useI18n();
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${ROLE_TONES[role]}`}>
      {m.roles[role]}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const { m } = useI18n();
  const tone =
    status === "Cancelled"
      ? "bg-danger/15 text-danger"
      : status === "Delivered"
        ? "bg-ok/15 text-ok"
        : status === "Shipped"
          ? "bg-accent/15 text-accent"
          : status === "Processing"
            ? "bg-warn/15 text-warn"
            : "bg-surface-2 text-muted";
  return (
    <motion.span
      key={status}
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${tone}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {m.status[status as keyof typeof m.status] ?? status}
    </motion.span>
  );
}

/** Animated progress through Pending → Processing → Shipped → Delivered. */
export function DeliveryProgress({ status }: { status: string }) {
  const step = statusStep(status);
  const cancelled = status === "Cancelled";
  const pct = cancelled ? 100 : step < 0 ? 0 : (step / 3) * 100;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
      <motion.div
        className={`h-full rounded-full ${cancelled ? "bg-danger/60" : "bg-gradient-to-r from-accent to-accent-2"}`}
        initial={{ width: 0 }}
        animate={{ width: `${Math.max(pct, 6)}%` }}
        transition={{ type: "spring", stiffness: 80, damping: 18, delay: 0.15 }}
      />
    </div>
  );
}

export function Avatar({ email, name, size = "md" }: { email: string; name?: string | null; size?: "sm" | "md" }) {
  // Stable hue per email, so each person keeps their colour.
  const hue = [...email].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
        size === "sm" ? "size-7 text-[10px]" : "size-9 text-xs"
      }`}
      style={{ background: `linear-gradient(135deg, hsl(${hue} 70% 55%), hsl(${(hue + 40) % 360} 70% 45%))` }}
      aria-hidden
    >
      {initials(email, name)}
    </span>
  );
}

/* ---------- Numbers ---------- */

type AnimatedNumberProps = { value: number; format?: (n: number) => string };

/** Remounts on language change: the motion transform keeps the formatter it was created with. */
export function AnimatedNumber(props: AnimatedNumberProps) {
  const { locale } = useI18n();
  return <AnimatedNumberInner key={locale} {...props} />;
}

function AnimatedNumberInner({ value, format = (n: number) => Math.round(n).toString() }: AnimatedNumberProps) {
  const spring = useSpring(0, { stiffness: 90, damping: 20 });
  const display = useTransform(spring, (v) => format(v));
  useEffect(() => {
    spring.set(value);
  }, [spring, value]);
  return <motion.span>{display}</motion.span>;
}

export function StatCard({ label, value, icon, format }: {
  label: string;
  value: number;
  icon: React.ReactNode;
  format?: (n: number) => string;
}) {
  return (
    <Card variants={staggerItem} whileHover={{ y: -3 }} className="p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">{label}</p>
        <span className="rounded-lg bg-accent/10 p-2 text-accent">{icon}</span>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight tabular-nums">
        <AnimatedNumber value={value} format={format} />
      </p>
    </Card>
  );
}

/* ---------- Loading / empty / error states ---------- */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function GridSkeleton({ count = 6, className = "h-44" }: { count?: number; className?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className={className} />
      ))}
    </div>
  );
}

export function EmptyState({ title, description, action, icon }: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center rounded-3xl border border-dashed border-line px-6 py-16 text-center"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mb-4 rounded-2xl bg-surface-2 p-4 text-muted"
      >
        {icon ?? <Inbox className="size-7" />}
      </motion.div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  const { m } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center rounded-3xl border border-danger/30 bg-danger/5 px-6 py-12 text-center"
    >
      <CircleAlert className="mb-3 size-8 text-danger" />
      <h3 className="font-semibold">{m.errors.loadFailed}</h3>
      <p className="mt-1 text-sm text-muted">{error.message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2 text-sm font-medium transition hover:border-accent/50"
        >
          <RotateCw className="size-4" /> {m.errors.tryAgain}
        </button>
      )}
    </motion.div>
  );
}

export function Forbidden({ role }: { role: Role }) {
  const { m } = useI18n();
  return (
    <EmptyState
      icon={<ShieldOff className="size-7" />}
      title={m.errors.forbiddenTitle}
      description={role === "USER" ? m.errors.noRole : m.errors.roleNoAccess(m.roles[role])}
    />
  );
}
