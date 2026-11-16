"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, ShoppingBag, Store } from "lucide-react";
import { homeFor, useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { AuthCard, Shake } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input, Segmented } from "@/components/ui/Field";
import { errorMessage } from "@/lib/client/api";

type AccountType = "CUSTOMER" | "VENDOR";
const MIN_PASSWORD = 8;

function PasswordMeter({ password }: { password: string }) {
  const score = [password.length >= MIN_PASSWORD, /[A-Z]/.test(password) && /[a-z]/.test(password), /\d/.test(password), /[^\w]/.test(password)].filter(Boolean).length;
  const colors = ["bg-danger", "bg-danger", "bg-warn", "bg-accent-2", "bg-ok"];
  return (
    <div className="flex gap-1" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <motion.span
          key={i}
          className={`h-1 flex-1 rounded-full ${i < score ? colors[score] : "bg-surface-2"}`}
          animate={{ scaleX: i < score ? 1 : 0.6, opacity: i < score ? 1 : 0.6 }}
          style={{ originX: 0 }}
        />
      ))}
    </div>
  );
}

export default function SignupPage() {
  const { signup, session, ready } = useSession();
  const toast = useToast();
  const { m } = useI18n();
  const router = useRouter();
  const [type, setType] = useState<AccountType>("CUSTOMER");
  const [form, setForm] = useState({ name: "", email: "", password: "", confirm: "" });
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (ready && session && !loading) router.replace(homeFor(session.role));
  }, [ready, session, loading, router]);

  const passwordError =
    touched && form.password.length < MIN_PASSWORD ? m.signup.passwordTooShort(MIN_PASSWORD) : undefined;
  const confirmError = touched && form.confirm !== form.password ? m.signup.passwordsDontMatch : undefined;
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    setError(null);
    if (form.password.length < MIN_PASSWORD || form.confirm !== form.password) {
      setFailures((n) => n + 1);
      return;
    }
    setLoading(true);
    try {
      const s = await signup({
        email: form.email.trim(),
        password: form.password,
        name: form.name.trim() || undefined,
        role: type,
      });
      toast.success(m.signup.accountReady, type === "VENDOR" ? m.signup.nextOpenShop : m.signup.happyShopping);
      router.push(homeFor(s.role));
    } catch (err) {
      setError(/already exists/i.test(errorMessage(err)) ? m.signup.emailTaken : errorMessage(err));
      setFailures((n) => n + 1);
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title={m.signup.title}
      subtitle={m.signup.subtitle}
      footer={
        <>
          {m.signup.haveAccount}{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            {m.common.signIn}
          </Link>
        </>
      }
    >
      <Shake trigger={failures}>
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <Segmented
            label={m.signup.accountType}
            layoutId="signup-type"
            value={type}
            onChange={setType}
            options={[
              { value: "CUSTOMER", label: <span className="flex items-center justify-center gap-2"><ShoppingBag className="size-4" /> {m.signup.wantToShop}</span> },
              { value: "VENDOR", label: <span className="flex items-center justify-center gap-2"><Store className="size-4" /> {m.signup.wantToSell}</span> },
            ]}
          />
          <Input label={m.common.name} hint={m.common.optional} autoComplete="name" value={form.name} onChange={set("name")} />
          <Input label={m.common.email} type="email" required autoComplete="email" value={form.email} onChange={set("email")} placeholder="you@example.com" />
          <div className="space-y-2">
            <Input
              label={m.common.password}
              type="password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              error={passwordError}
            />
            <PasswordMeter password={form.password} />
          </div>
          <Input
            label={m.signup.confirmPassword}
            type="password"
            required
            autoComplete="new-password"
            value={form.confirm}
            onChange={set("confirm")}
            error={confirmError}
          />
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 rounded-xl bg-danger/10 px-3 py-2 text-sm text-danger"
                role="alert"
              >
                <CircleAlert className="size-4 shrink-0" /> {error}
              </motion.p>
            )}
          </AnimatePresence>
          <Button type="submit" size="lg" className="w-full" loading={loading}>
            {m.signup.submit}
          </Button>
        </form>
      </Shake>
    </AuthCard>
  );
}
