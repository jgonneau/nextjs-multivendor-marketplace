import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/container";
import { toProductDto } from "@/adapters/http/dto";
import { handleApiError } from "@/adapters/http/responses";

type Context = { params: Promise<{ cuid: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { cuid } = await params;
    return NextResponse.json(toProductDto(await productService.getProductById(cuid)));
  } catch (error) {
    return handleApiError(error);
  }
}

/** Responds with the deleted product's id. */
export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { cuid } = await params;
    await productService.deleteProductById(cuid);
    return NextResponse.json(cuid);
  } catch (error) {
    return handleApiError(error);
  }
}
