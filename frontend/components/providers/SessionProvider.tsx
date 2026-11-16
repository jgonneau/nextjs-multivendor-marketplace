"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import authorizationService from "@/lib/client/permissions";
import { apiFetch, AUTH_EXPIRED_EVENT, decodeToken, type RequestOptions } from "@/lib/client/api";
import type { Role, Session } from "@/lib/client/types";
import { useToast } from "./ToastProvider";
import { useI18n } from "./I18nProvider";

const STORAGE_KEY = "nextjs-multivendor-marketplace.token";

type SignupInput = { email: string; password: string; name?: string; role: "CUSTOMER" | "VENDOR" };

type ExitReason = "signout" | "expired";

export type SessionApi = {
  session: Session | null;
  /** False until the stored token has been read (avoids flashing the logged-out UI). */
  ready: boolean;
  login: (email: string, password: string) => Promise<Session>;
  signup: (input: SignupInput) => Promise<Session>;
  /** "signout" goes to a plain /login; "expired" comes back to the current page after sign-in. */
  logout: (message?: string, reason?: ExitReason) => void;
  /** Set while the provider itself is navigating away after a sign-out. */
  exiting: boolean;
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
  /** Same rules the API middleware enforces (see lib/client/permissions.ts). */
  can: (method: string, path: string) => boolean;
  /** Maps an app path ("/orders") to a link; the demo prefixes its own base path. */
  href: (path: string) => string;
};

const identityHref = (path: string) => path;

export const SessionContext = createContext<SessionApi | null>(null);

export function homeFor(role: Role) {
  switch (role) {
    case "CUSTOMER":
      return "/shop";
    case "VENDOR":
      return "/my-shops";
    case "ADMIN":
    case "SUPERADMIN":
      return "/orders";
    default:
      return "/";
  }
}

function readStoredSession(): Session | null {
  try {
    const token = localStorage.getItem(STORAGE_KEY);
    const session = token ? decodeToken(token) : null;
    if (session && session.exp * 1000 > Date.now()) return session;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // storage unavailable (private mode, blocked): start logged out
  }
  return null;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(false);
  const [exiting, setExiting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const toast = useToast();
  const { m } = useI18n();

  useEffect(() => {
    setSession(readStoredSession());
    setReady(true);
  }, []);

  const logout = useCallback(
    (message?: string, reason: ExitReason = "signout") => {
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {}
      // Tell RoleGate not to add its own ?next= redirect: a deliberate sign-out
      // must not send the next person who signs in to this user's page.
      setExiting(true);
      setSession(null);
      if (message) toast.info(message);
      router.push(
        reason === "expired" && pathname !== "/login"
          ? `/login?next=${encodeURIComponent(pathname)}`
          : "/login"
      );
    },
    [router, toast, pathname]
  );

  useEffect(() => {
    if (exiting && pathname === "/login") setExiting(false);
  }, [exiting, pathname]);

  // Sign out when the API rejects the token, or when it reaches its expiry.
  useEffect(() => {
    const onExpired = () => logout(m.errors.sessionExpired, "expired");
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, [logout, m]);

  useEffect(() => {
    if (!session) return;
    const ms = session.exp * 1000 - Date.now();
    // setTimeout overflows past ~24.8 days (admin tokens last a year).
    if (ms > 2 ** 31 - 1) return;
    const timer = setTimeout(
      () => logout(m.errors.sessionExpired, "expired"),
      Math.max(ms, 0)
    );
    return () => clearTimeout(timer);
  }, [session, logout, m]);

  const login = useCallback(async (email: string, password: string) => {
    const { token } = await apiFetch<{ token: string }>("/api/auth", {
      method: "POST",
      body: { email, password },
    });
    const next = decodeToken(token);
    if (!next) throw new Error(m.errors.unreadableToken);
    try {
      localStorage.setItem(STORAGE_KEY, token);
    } catch {}
    setSession(next);
    return next;
  }, [m]);

  const signup = useCallback(
    async (input: SignupInput) => {
      await apiFetch("/api/auth/newaccount", { method: "POST", body: input });
      return login(input.email, input.password);
    },
    [login]
  );

  const token = session?.token ?? null;
  const request = useCallback(
    <T,>(path: string, options?: RequestOptions) => apiFetch<T>(path, options, token),
    [token]
  );

  const role = session?.role ?? null;
  const can = useCallback(
    (method: string, path: string) => authorizationService.canAccess(role, path, method),
    [role]
  );

  const value = useMemo(
    () => ({ session, ready, exiting, login, signup, logout, request, can, href: identityHref }),
    [session, ready, exiting, login, signup, logout, request, can]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used inside <SessionProvider>");
  return ctx;
}
