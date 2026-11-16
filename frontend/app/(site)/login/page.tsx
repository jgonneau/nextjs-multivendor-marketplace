"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { CircleAlert, Eye, EyeOff } from "lucide-react";
import { homeFor, useSession } from "@/components/providers/SessionProvider";
import { useToast } from "@/components/providers/ToastProvider";
import { useI18n } from "@/components/providers/I18nProvider";
import { AuthCard, Shake } from "@/components/AuthCard";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ApiError, errorMessage } from "@/lib/client/api";

function LoginForm() {
  const { login, session, ready } = useSession();
  const toast = useToast();
  const { m } = useI18n();
  const router = useRouter();
  const next = useSearchParams().get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [failures, setFailures] = useState(0);
  const [loading, setLoading] = useState(false);

  // Already signed in: go straight to the app.
  useEffect(() => {
    if (ready && session && !loading) router.replace(next || homeFor(session.role));
  }, [ready, session, loading, next, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const s = await login(email.trim(), password);
      toast.success(m.login.welcomeBack, s.email);
      router.push(next || homeFor(s.role));
    } catch (err) {
      setError(
        err instanceof ApiError && err.status === 403 ? m.login.wrongCredentials : errorMessage(err)
      );
      setFailures((n) => n + 1);
      setLoading(false);
    }
  }

  return (
    <AuthCard
      title={m.login.title}
      subtitle={m.login.subtitle}
      footer={
        <>
          {m.login.newHere}{" "}
          <Link href="/signup" className="font-medium text-accent hover:underline">
            {m.login.createAccount}
          </Link>
        </>
      }
    >
      <Shake trigger={failures}>
        <form onSubmit={onSubmit} className="space-y-4">
          <Input
            label={m.common.email}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <div className="relative">
            <Input
              label={m.common.password}
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-[34px] right-2.5 rounded-md p-1 text-muted hover:text-ink"
              aria-label={showPassword ? m.login.hidePassword : m.login.showPassword}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
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
            {m.common.signIn}
          </Button>
        </form>
      </Shake>
    </AuthCard>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
