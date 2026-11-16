/**
 * @jest-environment node
 */
import * as signup from "@/app/api/auth/newaccount/route";
import * as login from "@/app/api/auth/route";
import prisma from "@/adapters/persistence/prisma/client";
import { isPasswordHash } from "@/adapters/security/password";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, makeUser } from "@/__test__/helpers/factories";

const EMAIL_DOMAIN = "@signup.test.local";
let n = 0;
const freshEmail = () => `new-${Date.now()}-${n++}${EMAIL_DOMAIN}`;
const register = (body: unknown) => callRoute(signup, "POST", { body });

afterAll(async () => {
  await cleanup();
  await prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
});

describe("POST /api/auth/newaccount", () => {
  test("creates a CUSTOMER by default", async () => {
    const email = freshEmail();

    const res = await register({ email, password: "pw" });

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ email, role: "CUSTOMER" });
  });

  test.each(["VENDOR", "vendor", "CUSTOMER"])("accepts role %p", async (role) => {
    const res = await register({ email: freshEmail(), password: "pw", role });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe(role.toUpperCase());
  });

  test.each(["ADMIN", "SUPERADMIN", "USER"])(
    "refuses to self-register as %p",
    async (role) => {
      const email = freshEmail();

      const res = await register({ email, password: "pw", role });

      expect(res.status).toBe(400);
      await expect(prisma.user.findUnique({ where: { email } })).resolves.toBeNull();
    }
  );

  test("rejects an email that is already taken", async () => {
    const existing = await makeUser();

    const res = await register({ email: existing.email, password: "pw" });

    expect(res.status).toBe(400);
  });

  test("stores the password hashed, returns no credentials, and the account can log in", async () => {
    const email = freshEmail();

    const res = await register({ email, password: "s3cret-pw" });

    expect(res.status).toBe(200);
    expect(res.body.data).not.toHaveProperty("password");
    expect(res.body.data).not.toHaveProperty("token");
    const saved = await prisma.user.findUniqueOrThrow({ where: { email } });
    expect(isPasswordHash(saved.password)).toBe(true);

    const loggedIn = await callRoute(login, "POST", { body: { email, password: "s3cret-pw" } });
    expect(loggedIn.status).toBe(200);
  });
});
