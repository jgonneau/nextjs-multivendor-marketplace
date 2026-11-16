import { NextRequest, NextResponse } from "next/server";
import { userService } from "@/container";
import { toUserDto } from "@/adapters/http/dto";
import { handleApiError } from "@/adapters/http/responses";
import { parseOrThrow } from "@/adapters/http/validate";
import { updateUserSchema } from "@/adapters/http/schemas";

type Context = { params: Promise<{ cuid: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { cuid } = await params;
    return NextResponse.json(toUserDto(await userService.getUserById(cuid)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const { cuid } = await params;
    const patch = parseOrThrow(updateUserSchema, await request.json());
    return NextResponse.json(toUserDto(await userService.updateUser(cuid, patch)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { cuid } = await params;
    return NextResponse.json(toUserDto(await userService.deleteUserById(cuid)));
  } catch (error) {
    return handleApiError(error);
  }
}
