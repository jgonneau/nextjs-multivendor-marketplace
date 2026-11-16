import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/container";
import { toUserDto } from "@/adapters/http/dto";
import { handleApiError } from "@/adapters/http/responses";
import { parseOrThrow } from "@/adapters/http/validate";
import { createUserSchema } from "@/adapters/http/schemas";

export async function GET() {
  try {
    const users = await userService.listUsers();
    return NextResponse.json(users.map(toUserDto));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = parseOrThrow(createUserSchema, await request.json());
    return NextResponse.json(toUserDto(await userService.createUser(input)));
  } catch (error) {
    return handleApiError(error);
  }
}
