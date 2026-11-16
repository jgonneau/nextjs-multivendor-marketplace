/**
 * @jest-environment node
 */
import * as route from "./route";
import prisma from "@/adapters/persistence/prisma/client";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, makeOrder, makeUser, makeVendor } from "@/__test__/helpers/factories";

afterAll(cleanup);

async function anOrder() {
  const owner = await makeUser({ role: "VENDOR" });
  const vendor = await makeVendor(owner.id);
  const customer = await makeUser({ role: "CUSTOMER" });
  return makeOrder(customer.id, vendor.id, ["REF-1"]);
}

describe("GET /api/order/[cuid]", () => {
  test("returns the order", async () => {
    const order = await anOrder();

    const res = await callRoute(route, "GET", { params: { cuid: order.orderId } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      orderId: order.orderId,
      userId: order.userId,
      vendorId: order.vendorId,
      productsRefs: ["REF-1"],
      status: "Pending",
    });
  });

  test("returns 404 for an unknown id", async () => {
    const res = await callRoute(route, "GET", { params: { cuid: "missing" } });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/order/[cuid]", () => {
  test("deletes the order", async () => {
    const order = await anOrder();

    const res = await callRoute(route, "DELETE", { params: { cuid: order.orderId } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ orderId: order.orderId });
    await expect(prisma.order.findUnique({ where: { orderId: order.orderId } })).resolves.toBeNull();
  });

  test("returns 404 for an unknown id", async () => {
    const res = await callRoute(route, "DELETE", { params: { cuid: "missing" } });
    expect(res.status).toBe(404);
  });
});
