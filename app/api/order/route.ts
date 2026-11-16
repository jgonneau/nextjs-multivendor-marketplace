import { NextRequest, NextResponse } from "next/server";
import { orderService, getCurrentUser } from "@/container";
import { toOrderDto } from "@/adapters/http/dto";
import { handleApiError, forbidden } from "@/adapters/http/responses";
import { parseOrThrow } from "@/adapters/http/validate";
import { createOrderSchema } from "@/adapters/http/schemas";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) return forbidden();
    const orders = await orderService.listOrdersForUser(user);
    return NextResponse.json(orders.map(toOrderDto));
  } catch (error) {
    return handleApiError(error);
  }
}

/** Responds with one CreatedSubOrder per shop in the basket. */
export async function POST(request: NextRequest) {
  try {
    const { product_list, userId } = parseOrThrow(createOrderSchema, await request.json());
    const user = await getCurrentUser(request);
    if (!user) return forbidden();
    const created = await orderService.createOrderForUser(user, { products: product_list, onBehalfOf: userId });
    return NextResponse.json(created);
  } catch (error) {
    return handleApiError(error);
  }
}
