/**
 * @jest-environment node
 *
 * Runs against the nextjs_multivendor_marketplace_test database: checks that PrismaUnitOfWork
 * really commits or rolls back as a unit.
 */
import { randomUUID } from "node:crypto";
import prisma from "./client";
import { PrismaUnitOfWork } from "./unitOfWork";
import { cleanup, makeUser, makeVendor } from "@/__test__/helpers/factories";

const unitOfWork = new PrismaUnitOfWork(prisma);

afterAll(cleanup);

describe("PrismaUnitOfWork", () => {
  test("keeps every write when the work succeeds", async () => {
    const customer = await makeUser({ role: "CUSTOMER" });
    const vendor = await makeVendor((await makeUser({ role: "VENDOR" })).id);

    const created = await unitOfWork.run(async ({ orders }) => [
      await orders.create({ userId: customer.id, vendorId: vendor.id, productsRefs: ["a"] }),
      await orders.create({ userId: customer.id, vendorId: vendor.id, productsRefs: ["b"] }),
    ]);

    expect(await prisma.order.count({ where: { orderId: { in: created.map((o) => o.orderId) } } })).toBe(2);
  });

  test("keeps none of the writes when the work throws", async () => {
    const customer = await makeUser({ role: "CUSTOMER" });
    const vendor = await makeVendor((await makeUser({ role: "VENDOR" })).id);
    const marker = `rollback-${randomUUID()}`;

    await expect(
      unitOfWork.run(async ({ orders }) => {
        await orders.create({ userId: customer.id, vendorId: vendor.id, productsRefs: [marker] });
        // The second sub-order points at a shop that doesn't exist.
        await orders.create({ userId: customer.id, vendorId: "no-such-vendor", productsRefs: [marker] });
      })
    ).rejects.toThrow(/reference/i);

    expect(await prisma.order.count({ where: { productsRefs: { has: marker } } })).toBe(0);
  });
});
