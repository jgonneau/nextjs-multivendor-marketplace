"use client";

import { useEffect } from "react";
import { motion, useAnimate } from "motion/react";
import { Store } from "lucide-react";

export function AuthCard({ title, subtitle, children, footer }: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-[70vh] items-center justify-center py-6">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 22 }}
        className="relative w-full max-w-md"
      >
        <div aria-hidden className="absolute -inset-px rounded-[28px] bg-gradient-to-br from-accent/50 via-transparent to-accent-2/40 blur-sm" />
        <div className="relative rounded-[28px] border border-line bg-surface p-8 shadow-2xl shadow-accent/10">
          <motion.div
            initial={{ rotate: -20, scale: 0.6, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.1 }}
            className="mb-6 flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-accent-2 text-white shadow-lg shadow-accent/30"
          >
            <Store className="size-6" />
          </motion.div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-1 text-sm text-muted">{subtitle}</p>
          <div className="mt-6">{children}</div>
          <div className="mt-6 text-center text-sm text-muted">{footer}</div>
        </div>
      </motion.div>
    </div>
  );
}

/** Shakes its children whenever `trigger` increases (e.g. after a failed submit). */
export function Shake({ trigger, children }: { trigger: number; children: React.ReactNode }) {
  const [scope, animate] = useAnimate();
  useEffect(() => {
    if (trigger) animate(scope.current, { x: [0, -10, 10, -6, 6, 0] }, { duration: 0.4 });
  }, [trigger, animate, scope]);
  return <div ref={scope}>{children}</div>;
}
