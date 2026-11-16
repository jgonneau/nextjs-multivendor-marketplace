/**
 * @jest-environment node
 */
import * as orderRoute from "@/app/api/order/route";
import prisma from "@/adapters/persistence/prisma/client";
import type { User } from "@/prisma/generated/prisma";
import { callRoute } from "@/__test__/helpers/api";
import {
  cleanup,
  makeOrder,
  makeProduct,
  makeUser,
  makeVendor,
} from "@/__test__/helpers/factories";

const callOrders = (method: "GET" | "POST", user: User | null, body?: unknown) =>
  callRoute(orderRoute, method, { as: user, body });

const ids = (orders: { orderId: string }[]) => orders.map((o) => o.orderId).sort();

afterAll(cleanup);

describe("GET /api/order", () => {
  test("rejects a request without a token", async () => {
    const res = await callOrders("GET", null);
    expect(res.status).toBe(403);
  });

  test("a CUSTOMER sees only their own orders", async () => {
    const owner = await makeUser({ role: "VENDOR" });
    const vendor = await makeVendor(owner.id);
    const alice = await makeUser({ role: "CUSTOMER" });
    const bob = await makeUser({ role: "CUSTOMER" });
    const aliceOrder = await makeOrder(alice.id, vendor.id);
    await makeOrder(bob.id, vendor.id);

    const res = await callOrders("GET", alice);

    expect(res.status).toBe(200);
    expect(ids(res.body)).toEqual([aliceOrder.orderId]);
  });

  test("a VENDOR sees only orders placed with the vendors they own", async () => {
    const ownerA = await makeUser({ role: "VENDOR" });
    const ownerB = await makeUser({ role: "VENDOR" });
    const vendorA = await makeVendor(ownerA.id);
    const vendorB = await makeVendor(ownerB.id);
    const customer = await makeUser({ role: "CUSTOMER" });
    const orderA = await makeOrder(customer.id, vendorA.id);
    await makeOrder(customer.id, vendorB.id);

    const res = await callOrders("GET", ownerA);

    expect(res.status).toBe(200);
    expect(ids(res.body)).toEqual([orderA.orderId]);
  });

  test("an ADMIN sees orders from every customer and vendor", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const owner = await makeUser({ role: "VENDOR" });
    const vendor = await makeVendor(owner.id);
    const customerA = await makeUser({ role: "CUSTOMER" });
    const customerB = await makeUser({ role: "CUSTOMER" });
    const orderA = await makeOrder(customerA.id, vendor.id);
    const orderB = await makeOrder(customerB.id, vendor.id);

    const res = await callOrders("GET", admin);

    expect(res.status).toBe(200);
    // Other suites may create orders concurrently, so only require ours.
    expect(ids(res.body)).toEqual(
      expect.arrayContaining([orderA.orderId, orderB.orderId])
    );
  });
});

describe("POST /api/order", () => {
  test("a CUSTOMER gets one order per vendor in the product list", async () => {
    const owner = await makeUser({ role: "VENDOR" });
    const vendorA = await makeVendor(owner.id);
    const vendorB = await makeVendor(owner.id);
    const a1 = await makeProduct(vendorA.id);
    const a2 = await makeProduct(vendorA.id);
    const b1 = await makeProduct(vendorB.id);
    const customer = await makeUser({ role: "CUSTOMER" });

    const res = await callOrders("POST", customer, {
      product_list: [a1.id, b1.reference, a2.id], // ids and references both resolve
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);

    const saved = await prisma.order.findMany({ where: { userId: customer.id } });
    const byVendor = Object.fromEntries(
      saved.map((o) => [o.vendorId, [...o.productsRefs].sort()])
    );
    expect(byVendor).toEqual({
      [vendorA.id]: [a1.reference, a2.reference].sort(),
      [vendorB.id]: [b1.reference],
    });
  });

  test("rejects an empty product list", async () => {
    const customer = await makeUser({ role: "CUSTOMER" });

    const res = await callOrders("POST", customer, { product_list: [] });

    expect(res.status).toBe(400);
  });

  test("rejects a product list where nothing resolves", async () => {
    const customer = await makeUser({ role: "CUSTOMER" });

    const res = await callOrders("POST", customer, { product_list: ["does-not-exist"] });

    expect(res.status).toBe(400);
    expect(await prisma.order.count({ where: { userId: customer.id } })).toBe(0);
  });

  test("an ADMIN must say which user the order is for", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const owner = await makeUser({ role: "VENDOR" });
    const product = await makeProduct((await makeVendor(owner.id)).id);

    const res = await callOrders("POST", admin, { product_list: [product.id] });

    expect(res.status).toBe(400);
  });

  test("an ADMIN can place an order on behalf of a customer", async () => {
    const admin = await makeUser({ role: "ADMIN" });
    const owner = await makeUser({ role: "VENDOR" });
    const vendor = await makeVendor(owner.id);
    const product = await makeProduct(vendor.id);
    const customer = await makeUser({ role: "CUSTOMER" });

    const res = await callOrders("POST", admin, {
      product_list: [product.id],
      userId: customer.id,
    });

    expect(res.status).toBe(200);
    const saved = await prisma.order.findMany({ where: { userId: customer.id } });
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ vendorId: vendor.id, productsRefs: [product.reference] });
  });
});
