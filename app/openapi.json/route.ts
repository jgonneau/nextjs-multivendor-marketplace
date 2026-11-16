import { NextResponse } from "next/server";
import { buildOpenApiDocument } from "@/adapters/http/openapi";
import pkg from "@/package.json";

// Built once at build time; it only changes when the code does.
export const dynamic = "force-static";

/** The OpenAPI 3.1 description of the API (public; rendered at /). */
export function GET() {
  return NextResponse.json(buildOpenApiDocument(pkg.version));
}
