"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/components/providers/SessionProvider";
import { Forbidden, GridSkeleton, Skeleton } from "@/components/ui/Display";
import type { Role, Session } from "@/lib/client/types";

/** Renders children only for signed-in users with one of `roles`. */
export function RoleGate({
  roles,
  children,
}: {
  roles: Role[];
  children: (session: Session) => React.ReactNode;
}) {
  const { session, ready, exiting } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  // Signed-out visitors are sent to sign in, then brought back here. Skipped
  // while the provider is already navigating away after a sign-out.
  useEffect(() => {
    if (ready && !session && !exiting) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, session, exiting, router, pathname]);

  if (!ready || !session) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <GridSkeleton />
      </div>
    );
  }
  if (!roles.includes(session.role)) return <Forbidden role={session.role} />;
  return <>{children(session)}</>;
}
