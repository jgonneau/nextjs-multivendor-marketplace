import type { NextRequest } from "next/server";

// The browser only ever talks to this app. Every /api/* request is forwarded
// to the API server, so the two apps stay same-origin for the browser (no
// CORS) and the API's address is a server-side setting, not baked into the
// client bundle. API_URL is read per request, so one image works anywhere.
export const dynamic = "force-dynamic";

// Hop-by-hop headers describe this connection, not the request, and must not
// be forwarded. fetch() also decompresses responses, so the upstream
// content-encoding/length no longer match the body we pass on.
const DROP_REQUEST = ["host", "connection", "keep-alive", "transfer-encoding", "upgrade", "content-length"];
const DROP_RESPONSE = ["connection", "keep-alive", "transfer-encoding", "content-encoding", "content-length"];

async function proxy(request: NextRequest) {
  const apiUrl = process.env.API_URL ?? "http://localhost:3001";
  const target = new URL(request.nextUrl.pathname + request.nextUrl.search, apiUrl);

  const headers = new Headers(request.headers);
  DROP_REQUEST.forEach((h) => headers.delete(h));
  headers.set("x-forwarded-host", request.headers.get("host") ?? "");
  headers.set("x-forwarded-proto", request.nextUrl.protocol.replace(":", ""));

  const hasBody = !["GET", "HEAD"].includes(request.method);

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method: request.method,
      headers,
      body: hasBody ? await request.arrayBuffer() : undefined,
      redirect: "manual",
      cache: "no-store",
    });
  } catch (error) {
    console.error(`API proxy: ${request.method} ${target.href} failed`, error);
    return Response.json({ error: "The API is unreachable. Please try again shortly." }, { status: 502 });
  }

  const responseHeaders = new Headers(upstream.headers);
  DROP_RESPONSE.forEach((h) => responseHeaders.delete(h));
  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

export { proxy as GET, proxy as POST, proxy as PUT, proxy as PATCH, proxy as DELETE, proxy as HEAD, proxy as OPTIONS };
