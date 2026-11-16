/**
 * @jest-environment node
 */
import * as route from "@/app/api/user/route";
import prisma from "@/adapters/persistence/prisma/client";
import { isPasswordHash } from "@/adapters/security/password";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, makeUser } from "@/__test__/helpers/factories";

const EMAIL_DOMAIN = "@user-route.test.local";

afterAll(async () => {
  await cleanup();
  await prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
});

describe("GET /api/user", () => {
  test("lists users without exposing passwords or tokens", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const other = await makeUser({ role: "CUSTOMER" });

    const res = await callRoute(route, "GET", { as: admin });

    expect(res.status).toBe(200);
    expect(res.body.map((u: { id: string }) => u.id)).toEqual(
      expect.arrayContaining([admin.id, other.id])
    );
    for (const user of res.body) {
      expect(user).not.toHaveProperty("password");
      expect(user).not.toHaveProperty("token");
    }
  });
});

describe("POST /api/user", () => {
  test("creates a user with a hashed password and returns no credentials", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const email = `created-${Date.now()}${EMAIL_DOMAIN}`;

    const res = await callRoute(route, "POST", {
      as: admin,
      body: { email, password: "s3cret", role: "VENDOR" },
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ email, role: "VENDOR" });
    expect(res.body).not.toHaveProperty("password");
    const saved = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(isPasswordHash(saved.password)).toBe(true);
  });

  test("rejects an email that is already taken", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const existing = await makeUser();

    const res = await callRoute(route, "POST", {
      as: admin,
      body: { email: existing.email, password: "x" },
    });

    expect(res.status).toBe(400);
  });

  test("rejects a body without a password", async () => {
    const admin = await makeUser({ role: "ADMIN" });

    const res = await callRoute(route, "POST", {
      as: admin,
      body: { email: `nopw${EMAIL_DOMAIN}` },
    });

    expect(res.status).toBe(400);
  });
});
