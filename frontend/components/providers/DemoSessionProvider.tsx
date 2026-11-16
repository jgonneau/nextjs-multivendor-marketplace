"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import authorizationService from "@/lib/client/permissions";
import { DEMO_IDENTITY, demoRequest, type DemoView } from "@/lib/demo/store";
import type { RequestOptions } from "@/lib/client/api";
import type { Session } from "@/lib/client/types";
import { SessionContext, type SessionApi } from "./SessionProvider";

/** App paths that exist under /demo/[view]; anything else (e.g. "/") is left as is. */
const DEMO_PATHS = ["/shop", "/orders", "/my-shops", "/admin"];

/**
 * Replaces the real session for the pages below it: a fixed demo identity,
 * requests answered by the in-memory store, and links kept inside /demo/[view].
 */
export function DemoSessionProvider({ view, children }: { view: DemoView; children: React.ReactNode }) {
  const router = useRouter();
  const identity = DEMO_IDENTITY[view];

  const session = useMemo<Session>(
    () => ({ token: "demo", ...identity, exp: Math.floor(Date.now() / 1000) + 8 * 3600 }),
    [identity]
  );

  const request = useCallback(
    <T,>(path: string, options?: RequestOptions) => demoRequest<T>(identity.id, identity.role, path, options),
    [identity]
  );
  const can = useCallback(
    (method: string, path: string) => authorizationService.canAccess(identity.role, path, method),
    [identity]
  );
  const href = useCallback(
    (path: string) => (DEMO_PATHS.some((p) => path === p || path.startsWith(`${p}/`)) ? `/demo/${view}${path}` : path),
    [view]
  );
  // "Sign out" leaves the demo.
  const logout = useCallback(() => router.push("/demo"), [router]);
  const notInDemo = useCallback(async (): Promise<Session> => {
    throw new Error("Not available in the demo");
  }, []);

  const value = useMemo<SessionApi>(
    () => ({ session, ready: true, exiting: false, login: notInDemo, signup: notInDemo, logout, request, can, href }),
    [session, notInDemo, logout, request, can, href]
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
