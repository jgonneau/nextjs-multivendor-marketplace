/**
 * @jest-environment node
 */
import * as route from "./route";
import prisma from "@/adapters/persistence/prisma/client";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, makeProduct, makeUser, makeVendor } from "@/__test__/helpers/factories";

afterAll(cleanup);

describe("GET /api/vendor/[cuid]", () => {
  test("returns the vendor", async () => {
    const owner = await makeUser({ role: "VENDOR" });
    const vendor = await makeVendor(owner.id);

    const res = await callRoute(route, "GET", { params: { cuid: vendor.id } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: vendor.id, name: vendor.name, ownerId: owner.id });
  });

  test("returns 404 for an unknown id", async () => {
    const res = await callRoute(route, "GET", { params: { cuid: "missing" } });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/vendor/[cuid]", () => {
  test("deletes a vendor that has nothing attached", async () => {
    const owner = await makeUser({ role: "VENDOR" });
    const vendor = await makeVendor(owner.id);

    const res = await callRoute(route, "DELETE", { params: { cuid: vendor.id } });

    expect(res.status).toBe(200);
    await expect(prisma.vendor.findUnique({ where: { id: vendor.id } })).resolves.toBeNull();
  });

  test("refuses to delete a vendor that still has products", async () => {
    const owner = await makeUser({ role: "VENDOR" });
    const vendor = await makeVendor(owner.id);
    await makeProduct(vendor.id);

    const res = await callRoute(route, "DELETE", { params: { cuid: vendor.id } });

    expect(res.status).toBe(400);
    await expect(prisma.vendor.findUnique({ where: { id: vendor.id } })).resolves.not.toBeNull();
  });

  test("returns 404 for an unknown id", async () => {
    const res = await callRoute(route, "DELETE", { params: { cuid: "missing" } });
    expect(res.status).toBe(404);
  });
});
