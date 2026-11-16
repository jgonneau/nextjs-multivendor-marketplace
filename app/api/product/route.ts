import { NextRequest, NextResponse } from "next/server";
import { productService, getCurrentUser } from "@/container";
import { toProductDto } from "@/adapters/http/dto";
import { handleApiError } from "@/adapters/http/responses";
import { parseOrThrow } from "@/adapters/http/validate";
import { createProductSchema } from "@/adapters/http/schemas";
import { PermissionError } from "@/core/domain/errors";

export async function GET(request: NextRequest) {
  try {
    const products = await productService.listProductsForUser(await getCurrentUser(request));
    return NextResponse.json(products.map(toProductDto));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = parseOrThrow(createProductSchema, await request.json());
    const user = await getCurrentUser(request);
    if (!user) {
      throw new PermissionError("Unable to resolve requesting user.");
    }
    return NextResponse.json(toProductDto(await productService.createProduct(input, user.id)));
  } catch (error) {
    return handleApiError(error);
  }
}
