/**
 * @jest-environment node
 */
import * as route from "@/app/api/logs/route";
import prisma from "@/adapters/persistence/prisma/client";
import { callRoute } from "@/__test__/helpers/api";

const MARKER = `log-route-test-${Date.now()}`;
const entry = (suffix: string) => ({
  level: "debug",
  message: `${MARKER} ${suffix}`,
  timestamp: new Date().toISOString(),
});
const countMine = () => prisma.log.count({ where: { message: { startsWith: MARKER } } });

afterAll(() => prisma.log.deleteMany({ where: { message: { startsWith: MARKER } } }));

describe("POST /api/logs", () => {
  test("stores a log entry with the log secret", async () => {
    const log = entry("ok");

    const res = await callRoute(route, "POST", {
      authorization: `Bearer: TOKEN ${process.env.LOG_TOKEN_SECRET}`,
      body: log,
    });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject(log);
  });

  test("rejects a wrong secret with 403 and stores nothing", async () => {
    const before = await countMine();

    const res = await callRoute(route, "POST", {
      authorization: "Bearer: TOKEN wrong-secret",
      body: entry("wrong"),
    });

    expect(res.status).toBe(403);
    expect(await countMine()).toBe(before);
  });

  test("rejects a missing header with 401", async () => {
    const res = await callRoute(route, "POST", { body: entry("none") });
    expect(res.status).toBe(401);
  });
});
