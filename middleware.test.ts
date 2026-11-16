/**
 * @jest-environment node
 *
 * Access control is enforced here, before any route handler runs, so it is
 * tested directly. No database needed: the role comes from the signed token.
 */
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";
import { signJWT } from "@/adapters/security/jwt";
import type { Role } from "@/prisma/generated/prisma";

const ROLES: Role[] = ["USER", "CUSTOMER", "VENDOR", "ADMIN", "SUPERADMIN"];

async function tokenWithRole(role: Role) {
  return signJWT({ id: `id-${role}`, email: `${role.toLowerCase()}@test.local`, role });
}

/** Status the middleware answers with, or "next" when it lets the request through. */
async function gate(method: string, path: string, authorization?: string) {
  const request = new NextRequest(`http://localhost${path}`, {
    method,
    headers: authorization ? { authorization } : {},
  });
  const res = await middleware(request);
  return res ? res.status : "next";
}

describe("public routes", () => {
  test.each([
    ["POST", "/api/auth"],
    ["POST", "/api/auth/newaccount"],
    ["POST", "/api/logs"],
  ])("%s %s needs no token", async (method, path) => {
    expect(await gate(method, path)).toBe("next");
  });
});

describe("authentication", () => {
  test("rejects a missing token with 401", async () => {
    expect(await gate("GET", "/api/product")).toBe(401);
  });

  test("rejects a token signed with another secret with 401", async () => {
    const forged = await signJWT({ id: "x", email: "x@x", role: "SUPERADMIN" }, "not-the-secret");
    expect(await gate("GET", "/api/product", `Bearer: TOKEN ${forged}`)).toBe(401);
  });

  test("rejects a malformed header with 401", async () => {
    expect(await gate("GET", "/api/product", "Bearer garbage")).toBe(401);
  });
});

describe("authorization by role", () => {
  // [method, path, roles that may pass]
  const matrix: [string, string, Role[]][] = [
    ["GET", "/api/product", ["CUSTOMER", "VENDOR", "ADMIN", "SUPERADMIN"]],
    ["POST", "/api/product", ["VENDOR", "ADMIN", "SUPERADMIN"]],
    ["DELETE", "/api/product/p1", ["SUPERADMIN"]],
    ["GET", "/api/vendor", ["CUSTOMER", "VENDOR", "ADMIN", "SUPERADMIN"]],
    ["POST", "/api/vendor/register", ["VENDOR", "ADMIN", "SUPERADMIN"]],
    ["DELETE", "/api/vendor/v1", ["SUPERADMIN"]],
    ["GET", "/api/order", ["CUSTOMER", "VENDOR", "ADMIN", "SUPERADMIN"]],
    ["POST", "/api/order", ["CUSTOMER", "ADMIN", "SUPERADMIN"]],
    ["GET", "/api/order/o1", ["ADMIN", "SUPERADMIN"]],
    ["DELETE", "/api/order/o1", ["SUPERADMIN"]],
    ["PUT", "/api/order/o1/updateDelivery", ["VENDOR", "SUPERADMIN"]],
    ["GET", "/api/user", ["ADMIN", "SUPERADMIN"]],
    ["POST", "/api/user", ["ADMIN", "SUPERADMIN"]],
    ["PUT", "/api/user/u1", ["SUPERADMIN"]],
    ["DELETE", "/api/user/u1", ["SUPERADMIN"]],
  ];

  const cases = matrix.flatMap(([method, path, allowed]) =>
    ROLES.map((role) => [method, path, role, allowed.includes(role)] as const)
  );

  test.each(cases)("%s %s as %s → allowed: %s", async (method, path, role, allowed) => {
    const header = `Bearer: TOKEN ${await tokenWithRole(role)}`;
    expect(await gate(method, path, header)).toBe(allowed ? "next" : 403);
  });
});
