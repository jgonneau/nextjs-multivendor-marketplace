/**
 * @jest-environment node
 */
import * as productRoute from "@/app/api/product/route";
import prisma from "@/adapters/persistence/prisma/client";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, makeProduct, makeUser, makeVendor } from "@/__test__/helpers/factories";

const call = (method: "GET" | "POST", opts?: Parameters<typeof callRoute>[2]) =>
  callRoute(productRoute, method, opts);
const ids = (rows: { id: string }[]) => rows.map((r) => r.id).sort();

afterAll(cleanup);

describe("GET /api/product", () => {
  test("a VENDOR sees only products of the vendors they own", async () => {
    const owner = await makeUser({ role: "VENDOR" });
    const other = await makeUser({ role: "VENDOR" });
    const mine = await makeProduct((await makeVendor(owner.id)).id);
    await makeProduct((await makeVendor(other.id)).id);

    const res = await call("GET", { as: owner });

    expect(res.status).toBe(200);
    expect(ids(res.body)).toEqual([mine.id]);
  });

  test("a CUSTOMER sees products from every vendor", async () => {
    const ownerA = await makeUser({ role: "VENDOR" });
    const ownerB = await makeUser({ role: "VENDOR" });
    const a = await makeProduct((await makeVendor(ownerA.id)).id);
    const b = await makeProduct((await makeVendor(ownerB.id)).id);
    const customer = await makeUser({ role: "CUSTOMER" });

    const res = await call("GET", { as: customer });

    expect(res.status).toBe(200);
    expect(ids(res.body)).toEqual(expect.arrayContaining([a.id, b.id]));
  });
});

describe("POST /api/product", () => {
  test("a VENDOR creates a product for a vendor they own", async () => {
    const owner = await makeUser({ role: "VENDOR" });
    const vendor = await makeVendor(owner.id);
    const reference = `REF-NEW-${Date.now()}`;

    const res = await call("POST", {
      as: owner,
      body: { reference, vendorId: vendor.id, title: "Lamp", price: 12.5 },
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ reference, vendorId: vendor.id, title: "Lamp", price: 12.5 });
    await expect(prisma.product.findUnique({ where: { reference } })).resolves.not.toBeNull();
  });

  test("refuses to create a product for someone else's vendor", async () => {
    const owner = await makeUser({ role: "VENDOR" });
    const intruder = await makeUser({ role: "VENDOR" });
    const vendor = await makeVendor(owner.id);
    const reference = `REF-NOPE-${Date.now()}`;

    const res = await call("POST", { as: intruder, body: { reference, vendorId: vendor.id } });

    expect(res.status).toBe(403);
    await expect(prisma.product.findUnique({ where: { reference } })).resolves.toBeNull();
  });

  test("returns 404 for an unknown vendor", async () => {
    const owner = await makeUser({ role: "VENDOR" });

    const res = await call("POST", { as: owner, body: { reference: "REF-X", vendorId: "missing" } });

    expect(res.status).toBe(404);
  });

  test("rejects a duplicate reference", async () => {
    const owner = await makeUser({ role: "VENDOR" });
    const vendor = await makeVendor(owner.id);
    const existing = await makeProduct(vendor.id);

    const res = await call("POST", {
      as: owner,
      body: { reference: existing.reference, vendorId: vendor.id },
    });

    expect(res.status).toBe(400);
  });

  test("rejects a body without a reference", async () => {
    const owner = await makeUser({ role: "VENDOR" });
    const vendor = await makeVendor(owner.id);

    const res = await call("POST", { as: owner, body: { vendorId: vendor.id } });

    expect(res.status).toBe(400);
  });
});
