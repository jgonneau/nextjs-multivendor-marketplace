/**
 * @jest-environment node
 */
import * as route from "@/app/api/vendor/register/route";
import prisma from "@/adapters/persistence/prisma/client";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, makeUser, makeVendor } from "@/__test__/helpers/factories";

afterAll(cleanup);

describe("POST /api/vendor/register", () => {
  test("registers a vendor owned by the requester", async () => {
    const user = await makeUser({ role: "VENDOR" });
    const name = `Shop ${Date.now()}`;

    const res = await callRoute(route, "POST", {
      as: user,
      body: { name, description: "Lamps", phone: "555-0100" },
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name, description: "Lamps", ownerId: user.id });
    await expect(prisma.vendor.findUnique({ where: { name } })).resolves.toMatchObject({
      ownerId: user.id,
    });
  });

  test("rejects a name that is already taken", async () => {
    const user = await makeUser({ role: "VENDOR" });
    const existing = await makeVendor(user.id);

    const res = await callRoute(route, "POST", { as: user, body: { name: existing.name } });

    expect(res.status).toBe(400);
  });

  test("rejects a body without a name", async () => {
    const user = await makeUser({ role: "VENDOR" });

    const res = await callRoute(route, "POST", { as: user, body: { description: "x" } });

    expect(res.status).toBe(400);
  });

  test("returns 403 when the token's user no longer exists", async () => {
    const user = await makeUser({ role: "VENDOR" });
    await prisma.user.delete({ where: { id: user.id } });

    const res = await callRoute(route, "POST", { as: user, body: { name: `Ghost ${Date.now()}` } });

    expect(res.status).toBe(403);
  });
});
