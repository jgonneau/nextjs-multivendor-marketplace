import { NextRequest, NextResponse } from "next/server";
import { vendorService } from "@/container";
import { toVendorDto } from "@/adapters/http/dto";
import { handleApiError } from "@/adapters/http/responses";

type Context = { params: Promise<{ cuid: string }> };

export async function GET(_request: NextRequest, { params }: Context) {
  try {
    const { cuid } = await params;
    return NextResponse.json(toVendorDto(await vendorService.getVendorById(cuid)));
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: Context) {
  try {
    const { cuid } = await params;
    return NextResponse.json(toVendorDto(await vendorService.deleteVendorById(cuid)));
  } catch (error) {
    return handleApiError(error);
  }
}
