import { NextResponse } from "next/server";
import { DomainError, NotFoundError, PermissionError, ValidationError } from "@/core/domain/errors";
import { logger } from "@/adapters/logging/logger";

export const createdStatusCode: number = 201;

export function created(data: unknown) {
  return NextResponse.json(data, { status: 201 });
}

export const noContentStatusCode: number = 204;

export function noContent() {
  return NextResponse.json({}, { status: 204 });
}
export const unauthorizedStatusCode: number = 401;

export function unauthorized(errorInfo: string = "") {
  return NextResponse.json(
    { error: errorInfo || "Unauthorized." },
    { status: 401 }
  );
}
export const forbiddenStatusCode: number = 403;

export function forbidden(errorInfo: string = "") {
  return NextResponse.json(
    { error: errorInfo || "Forbidden." },
    { status: 403 }
  );
}
export const notFoundStatusCode: number = 404;

export function notFound(errorInfo: string = "") {
  return NextResponse.json(
    { error: errorInfo || "Not found." },
    { status: 404 }
  );
}
export const unprocessableEntityStatusCode: number = 422;

export function unprocessableEntity(errorInfo: string = "") {
  return NextResponse.json(
    {
      error: errorInfo || "Unexpected value(s)",
    },
    { status: 422 }
  );
}

export const errorServerStatusCode: number = 500;

/** Logs the real error server-side; the client only gets a generic message,
 * so database or stack details never leak in a response. */
export function errorServer(error: unknown = "") {
  logger.error("Unhandled error in route handler", { error: String(error) });
  return NextResponse.json({ error: "Server error." }, { status: 500 });
}

/**
 * Centralized error-to-HTTP-response mapping for API route handlers.
 * Core errors (NotFoundError → 404, PermissionError → 403,
 * ValidationError → 400) are mapped by statusFor; anything else (e.g. the
 * database being down) falls back to a generic 500 response via errorServer.
 */
export function handleApiError(error: unknown) {
  if (error instanceof DomainError) {
    return NextResponse.json({ error: error.message }, { status: statusFor(error) });
  }
  return errorServer(error);
}

/** The HTTP meaning of each core error. The core itself knows nothing about status codes. */
function statusFor(error: DomainError): number {
  if (error instanceof NotFoundError) return notFoundStatusCode;
  if (error instanceof PermissionError) return forbiddenStatusCode;
  if (error instanceof ValidationError) return 400;
  return errorServerStatusCode;
}
