import { NextRequest, NextResponse } from "next/server";
import { orderService } from "@/container";
import { toOrderDto } from "@/adapters/http/dto";
import { handleApiError } from "@/adapters/http/responses";

type Context = { params: Promise<{ cuid: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { cuid } = await params;
    return NextResponse.json(toOrderDto(await orderService.getOrderById(cuid)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { cuid } = await params;
    return NextResponse.json(toOrderDto(await orderService.deleteOrderById(cuid)));
  } catch (error) {
    return handleApiError(error);
  }
}
