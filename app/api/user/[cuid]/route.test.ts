/**
 * @jest-environment node
 */
import * as route from "./route";
import prisma from "@/adapters/persistence/prisma/client";
import { verifyPassword } from "@/adapters/security/password";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, makeUser } from "@/__test__/helpers/factories";

afterAll(cleanup);

describe("GET /api/user/[cuid]", () => {
  test("returns the user without password or token", async () => {
    const user = await makeUser({ name: "Ada" });

    const res = await callRoute(route, "GET", { params: { cuid: user.id } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, email: user.email, name: "Ada" });
    expect(res.body).not.toHaveProperty("password");
    expect(res.body).not.toHaveProperty("token");
  });

  test("returns 404 for an unknown id", async () => {
    const res = await callRoute(route, "GET", { params: { cuid: "missing" } });
    expect(res.status).toBe(404);
  });
});

describe("PUT /api/user/[cuid]", () => {
  test("updates allowed fields", async () => {
    const user = await makeUser({ name: "Old" });

    const res = await callRoute(route, "PUT", {
      params: { cuid: user.id },
      body: { name: "New", role: "VENDOR" },
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id, name: "New", role: "VENDOR" });
    expect(res.body).not.toHaveProperty("password");
  });

  test("stores a new password hashed", async () => {
    const user = await makeUser();

    const res = await callRoute(route, "PUT", {
      params: { cuid: user.id },
      body: { password: "brand-new" },
    });

    expect(res.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved.password).not.toBe("brand-new");
    await expect(verifyPassword("brand-new", saved.password)).resolves.toBe(true);
  });

  test("ignores fields that are not part of the update schema", async () => {
    const user = await makeUser();

    const res = await callRoute(route, "PUT", {
      params: { cuid: user.id },
      body: { name: "Ok", activated: false, token: "forged" },
    });

    expect(res.status).toBe(200);
    const saved = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(saved).toMatchObject({ name: "Ok", activated: true, token: null });
  });

  test("rejects an invalid role", async () => {
    const user = await makeUser();

    const res = await callRoute(route, "PUT", {
      params: { cuid: user.id },
      body: { role: "GOD" },
    });

    expect(res.status).toBe(400);
  });

  test("returns 404 for an unknown id", async () => {
    const res = await callRoute(route, "PUT", { params: { cuid: "missing" }, body: { name: "x" } });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/user/[cuid]", () => {
  test("deletes the user and returns it without credentials", async () => {
    const user = await makeUser();

    const res = await callRoute(route, "DELETE", { params: { cuid: user.id } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: user.id });
    expect(res.body).not.toHaveProperty("password");
    await expect(prisma.user.findUnique({ where: { id: user.id } })).resolves.toBeNull();
  });

  test("returns 404 for an unknown id", async () => {
    const res = await callRoute(route, "DELETE", { params: { cuid: "missing" } });
    expect(res.status).toBe(404);
  });
});
