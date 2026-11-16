/**
 * @jest-environment node
 */
import { decodeJwt } from "jose";
import * as loginRoute from "@/app/api/auth/route";
import { callRoute } from "@/__test__/helpers/api";
import { cleanup, DEFAULT_PASSWORD, makeUser } from "@/__test__/helpers/factories";

const login = (email: string, password: string) =>
  callRoute(loginRoute, "POST", { body: { email, password } });

afterAll(cleanup);

describe("POST /api/auth (login)", () => {
  test("returns a token for valid credentials", async () => {
    const user = await makeUser({ role: "CUSTOMER" });

    const res = await login(user.email, DEFAULT_PASSWORD);

    expect(res.status).toBe(200);
    expect(decodeJwt(res.body.token)).toMatchObject({
      id: user.id,
      email: user.email,
      role: "CUSTOMER",
    });
  });

  test("the token carries no password", async () => {
    const user = await makeUser();

    const res = await login(user.email, DEFAULT_PASSWORD);

    const payload = decodeJwt(res.body.token);
    expect(payload).not.toHaveProperty("password");
    expect(JSON.stringify(payload)).not.toContain(DEFAULT_PASSWORD);
  });

  test("rejects a wrong password", async () => {
    const user = await makeUser();

    const res = await login(user.email, "wrong");

    expect(res.status).toBe(403);
    expect(res.body).not.toHaveProperty("token");
  });

  test("rejects an unknown email the same way", async () => {
    const res = await login("nobody@test.local", "whatever");

    expect(res.status).toBe(403);
  });

  test("rejects a deactivated account", async () => {
    const user = await makeUser({ activated: false });

    const res = await login(user.email, DEFAULT_PASSWORD);

    expect(res.status).toBe(403);
  });
});
