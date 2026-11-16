import { NextRequest, NextResponse } from "next/server";
import { authService } from "@/container";
import { handleApiError } from "@/adapters/http/responses";
import { parseOrThrow } from "@/adapters/http/validate";
import { loginSchema } from "@/adapters/http/schemas";

export async function GET() {
  return NextResponse.json({ data: "OK!" });
}

export async function POST(request: NextRequest) {
  try {
    const { email, password } = parseOrThrow(loginSchema, await request.json());
    // Throws PermissionError (403) on invalid credentials.
    const { token } = await authService.login({ email, password });
    const info = `Please use token as-is "Bearer: TOKEN xxxxxxxxx"`;
    return NextResponse.json({ info, token });
  } catch (error) {
    return handleApiError(error);
  }
}
