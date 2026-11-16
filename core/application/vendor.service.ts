import type { Vendor } from "@/core/domain/entities";
import type { VendorRepository } from "@/core/ports/repositories";
import type { RegisterVendorCommand } from "./commands";
import { NotFoundError } from "@/core/domain/errors";

/** Shops. */
export class VendorService {
  constructor(private readonly vendors: VendorRepository) {}

  listVendors(): Promise<Vendor[]> {
    return this.vendors.list();
  }

  async getVendorById(id: string): Promise<Vendor> {
    const vendor = await this.vendors.findById(id);
    if (!vendor) {
      throw new NotFoundError(`Vendor with id "${id}" not found.`);
    }
    return vendor;
  }

  /** Opens a shop owned by `ownerId`. */
  registerVendor(ownerId: string, command: RegisterVendorCommand): Promise<Vendor> {
    return this.vendors.create({ ...command, ownerId });
  }

  async deleteVendorById(id: string): Promise<Vendor> {
    await this.getVendorById(id);
    return this.vendors.delete(id);
  }
}
