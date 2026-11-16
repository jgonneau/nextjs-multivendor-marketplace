import type { NextRequest } from "next/server";
import type { User } from "@/core/domain/entities";
import type { UserService } from "@/core/application/user.service";
import { getTokenPayload } from "./request";

/**
 * Builds `getCurrentUser(request)`: the signed-in user behind a request,
 * loaded fresh through `users`, or null when the token is missing/invalid or
 * the user no longer exists. A database failure is thrown (→ 500), not
 * reported as "signed out". The service is passed in (container.ts wires it),
 * so this adapter doesn't reach into the composition root.
 * Route handlers only; middleware uses getRequestRole (no database access).
 */
export function currentUserResolver(users: Pick<UserService, "getUserByEmail">) {
  return async function getCurrentUser(request: NextRequest): Promise<User | null> {
    const payload = await getTokenPayload(request);
    const email = payload?.email;
    if (typeof email !== "string" || !email) return null;
    return users.getUserByEmail(email);
  };
}
