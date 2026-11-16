import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/container";
import { toUserDto } from "@/adapters/http/dto";
import { handleApiError } from "@/adapters/http/responses";
import { parseOrThrow } from "@/adapters/http/validate";
import { newAccountSchema } from "@/adapters/http/schemas";

export async function POST(request: NextRequest) {
  try {
    const input = parseOrThrow(newAccountSchema, await request.json());
    const created = await userService.createUser(input);

    const info = "Please authenticate on /api/auth with 'email' and 'password'";
    return NextResponse.json({ status: `Created successfully !`, info, data: toUserDto(created) });
  } catch (error) {
    return handleApiError(error);
  }
}
