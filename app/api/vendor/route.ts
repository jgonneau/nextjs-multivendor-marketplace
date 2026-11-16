import { NextResponse } from "next/server";
import { vendorService } from "@/container";
import { toVendorDto } from "@/adapters/http/dto";
import { handleApiError } from "@/adapters/http/responses";

export async function GET() {
  try {
    const vendors = await vendorService.listVendors();
    return NextResponse.json(vendors.map(toVendorDto));
  } catch (error) {
    return handleApiError(error);
  }
}
