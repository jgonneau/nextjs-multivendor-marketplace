/**
 * @jest-environment node
 */
import * as route from "./route";
import prisma from "@/adapters/persistence/prisma/client";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, makeOrder, makeUser, makeVendor } from "@/__test__/helpers/factories";

afterAll(cleanup);

async function setup() {
  const owner = await makeUser({ role: "VENDOR" });
  const vendor = await makeVendor(owner.id);
  const customer = await makeUser({ role: "CUSTOMER" });
  const order = await makeOrder(customer.id, vendor.id);
  return { owner, order };
}

const saved = (orderId: string) => prisma.order.findUniqueOrThrow({ where: { orderId } });

describe("PUT /api/order/[cuid]/updateDelivery", () => {
  test("the vendor's owner updates status and delivery date", async () => {
    const { owner, order } = await setup();

    const res = await callRoute(route, "PUT", {
      as: owner,
      params: { cuid: order.orderId },
      body: { status: "Shipped", deliveryDate: "2026-12-01" },
    });

    expect(res.status).toBe(200);
    const after = await saved(order.orderId);
    expect(after.status).toBe("Shipped");
    expect(after.deliveryDate?.toISOString().slice(0, 10)).toBe("2026-12-01");
  });

  test("the status alone can be updated", async () => {
    const { owner, order } = await setup();

    const res = await callRoute(route, "PUT", {
      as: owner,
      params: { cuid: order.orderId },
      body: { status: "Packed" },
    });

    expect(res.status).toBe(200);
    expect(await saved(order.orderId)).toMatchObject({ status: "Packed", deliveryDate: null });
  });

  test("another vendor's owner gets 404 and the order is unchanged", async () => {
    const { order } = await setup();
    const stranger = await makeUser({ role: "VENDOR" });
    await makeVendor(stranger.id);

    const res = await callRoute(route, "PUT", {
      as: stranger,
      params: { cuid: order.orderId },
      body: { status: "Hijacked" },
    });

    expect(res.status).toBe(404);
    expect((await saved(order.orderId)).status).toBe("Pending");
  });

  test("rejects a body without a status", async () => {
    const { owner, order } = await setup();

    const res = await callRoute(route, "PUT", {
      as: owner,
      params: { cuid: order.orderId },
      body: { deliveryDate: "2026-12-01" },
    });

    expect(res.status).toBe(400);
  });

  test("rejects a request without a token", async () => {
    const { order } = await setup();

    const res = await callRoute(route, "PUT", {
      params: { cuid: order.orderId },
      body: { status: "Shipped" },
    });

    expect(res.status).toBe(403);
  });
});
