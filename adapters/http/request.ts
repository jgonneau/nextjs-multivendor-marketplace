/**
 * Reading the caller's identity from a request. Safe in middleware (edge
 * runtime): depends only on the JWT helper, never on the database.
 *
 * The API's header format is `authorization: Bearer: TOKEN <jwt>`.
 */
import type { NextRequest } from "next/server";
import { verifyJWT } from "@/adapters/security/jwt";
import type { Role } from "@/core/domain/entities";

/** The raw value after "TOKEN ", or "" when absent. */
export function getBearerToken(request: NextRequest): string {
  const header = request.headers?.get("authorization") || "";
  return header.split("TOKEN ").at(1) || "";
}

/** Whether an authorization header was sent at all. */
export function hasAuthorizationHeader(request: NextRequest): boolean {
  return Boolean(request.headers?.get("authorization"));
}

/** The verified token payload, or null when missing, invalid or expired. */
export async function getTokenPayload(request: NextRequest) {
  const token = getBearerToken(request);
  if (!token) return null;
  const verified = await verifyJWT(token);
  return verified ? verified.payload : null;
}

/** The caller's role from a verified token, or null. */
export async function getRequestRole(request: NextRequest): Promise<Role | null> {
  const payload = await getTokenPayload(request);
  return (payload?.role as Role | undefined) ?? null;
}
