import { NextRequest, NextResponse } from "next/server";
import { orderService, getCurrentUser } from "@/container";
import { toOrderDto } from "@/adapters/http/dto";
import { handleApiError, forbidden } from "@/adapters/http/responses";
import { parseOrThrow } from "@/adapters/http/validate";
import { updateDeliverySchema } from "@/adapters/http/schemas";

type Context = { params: Promise<{ cuid: string }> };

export async function PUT(request: NextRequest, { params }: Context) {
  try {
    const { cuid } = await params;
    const { status, deliveryDate } = parseOrThrow(updateDeliverySchema, await request.json());
    const user = await getCurrentUser(request);
    if (!user) return forbidden();
    const updated = await orderService.updateDelivery(user, cuid, {
      status,
      ...(deliveryDate && { deliveryDate: new Date(deliveryDate) }),
    });
    return NextResponse.json(toOrderDto(updated));
  } catch (error) {
    return handleApiError(error);
  }
}
