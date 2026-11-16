/**
 * @jest-environment node
 */
import * as route from "@/app/api/vendor/route";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, makeUser, makeVendor } from "@/__test__/helpers/factories";

afterAll(cleanup);

test("GET /api/vendor lists vendors", async () => {
  const owner = await makeUser({ role: "VENDOR" });
  const a = await makeVendor(owner.id);
  const b = await makeVendor(owner.id);

  const res = await callRoute(route, "GET");

  expect(res.status).toBe(200);
  expect(res.body.map((v: { id: string }) => v.id)).toEqual(expect.arrayContaining([a.id, b.id]));
});
