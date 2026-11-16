/**
 * Calls an App Router handler in-process and returns status + parsed body.
 *
 * Note: this exercises the route handler only. Role-based access control
 * lives in middleware.ts and is tested separately in middleware.test.ts.
 */
import { testApiHandler } from "next-test-api-route-handler";
import type { NextRequest } from "next/server";
import type { User } from "@/prisma/generated/prisma";
import { authHeader, tokenFor } from "./factories";

type Method = "GET" | "POST" | "PUT" | "DELETE";
type Handler = (request: NextRequest, context: any) => Promise<Response>;

export type ApiResponse = { status: number; body: any };

export type CallOptions = {
  /** Sends a freshly signed token for this user. */
  as?: User | null;
  /** Raw Authorization header value; overrides `as`. */
  authorization?: string;
  body?: unknown;
  /** Dynamic route params, e.g. `{ cuid: "..." }`. */
  params?: Record<string, string>;
};

export async function callRoute(
  handlers: Partial<Record<Method, Handler>>,
  method: Method,
  { as, authorization, body, params }: CallOptions = {}
): Promise<ApiResponse> {
  const header = authorization ?? (as ? authHeader(await tokenFor(as)) : undefined);
  let response!: ApiResponse;

  await testApiHandler({
    appHandler: handlers,
    params,
    requestPatcher(request) {
      if (header) request.headers.set("authorization", header);
    },
    async test({ fetch }) {
      const res = await fetch({
        method,
        ...(body !== undefined && { body: JSON.stringify(body) }),
      });
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        // non-JSON body: keep the raw text
      }
      response = { status: res.status, body: parsed };
    },
  });
  return response;
}
