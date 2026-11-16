import { NextRequest, NextResponse } from "next/server";
import { vendorService, getCurrentUser } from "@/container";
import { toVendorDto } from "@/adapters/http/dto";
import { handleApiError } from "@/adapters/http/responses";
import { parseOrThrow } from "@/adapters/http/validate";
import { createVendorSchema } from "@/adapters/http/schemas";
import { PermissionError } from "@/core/domain/errors";

export async function POST(request: NextRequest) {
  try {
    const input = parseOrThrow(createVendorSchema, await request.json());
    const user = await getCurrentUser(request);
    if (!user) {
      throw new PermissionError("Unable to resolve requesting user.");
    }
    return NextResponse.json(toVendorDto(await vendorService.registerVendor(user.id, input)));
  } catch (error) {
    return handleApiError(error);
  }
}
