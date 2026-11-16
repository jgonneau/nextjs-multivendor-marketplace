import { NextRequest, NextResponse } from "next/server";
import { logService } from "@/container";
import { toLogDto } from "@/adapters/http/dto";
import { getBearerToken, hasAuthorizationHeader } from "@/adapters/http/request";
import { handleApiError, forbidden, unauthorized } from "@/adapters/http/responses";
import { parseOrThrow } from "@/adapters/http/validate";
import { createLogSchema } from "@/adapters/http/schemas";

/** Protected by the shared LOG_TOKEN_SECRET instead of a user JWT. */
export async function POST(request: NextRequest) {
  try {
    if (!hasAuthorizationHeader(request)) return unauthorized();
    const secret = process.env.LOG_TOKEN_SECRET;
    if (!secret || getBearerToken(request) !== secret) return forbidden();

    const entry = parseOrThrow(createLogSchema, await request.json());
    return NextResponse.json(toLogDto(await logService.record(entry)));
  } catch (error) {
    return handleApiError(error);
  }
}
