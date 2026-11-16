/**
 * @jest-environment node
 */
import * as route from "./route";
import prisma from "@/adapters/persistence/prisma/client";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, makeProduct, makeUser, makeVendor } from "@/__test__/helpers/factories";

afterAll(cleanup);

async function aProduct() {
  const owner = await makeUser({ role: "VENDOR" });
  return makeProduct((await makeVendor(owner.id)).id);
}

describe("GET /api/product/[cuid]", () => {
  test("returns the product", async () => {
    const product = await aProduct();

    const res = await callRoute(route, "GET", { params: { cuid: product.id } });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: product.id, reference: product.reference });
  });

  test("returns 404 for an unknown id", async () => {
    const res = await callRoute(route, "GET", { params: { cuid: "missing" } });
    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/product/[cuid]", () => {
  test("deletes the product and returns its id", async () => {
    const product = await aProduct();

    const res = await callRoute(route, "DELETE", { params: { cuid: product.id } });

    expect(res.status).toBe(200);
    expect(res.body).toBe(product.id);
    await expect(prisma.product.findUnique({ where: { id: product.id } })).resolves.toBeNull();
  });

  test("returns 404 for an unknown id", async () => {
    const res = await callRoute(route, "DELETE", { params: { cuid: "missing" } });
    expect(res.status).toBe(404);
  });
});
