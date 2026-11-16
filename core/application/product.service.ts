import type { Product, User } from "@/core/domain/entities";
import type { ProductRepository, VendorRepository } from "@/core/ports/repositories";
import type { CreateProductCommand } from "./commands";
import { NotFoundError, PermissionError } from "@/core/domain/errors";

/** Products, and who may list or add them. */
export class ProductService {
  constructor(
    private readonly products: ProductRepository,
    private readonly vendors: VendorRepository
  ) {}

  /** Vendors only ever see the products of the shops they own. */
  listProductsForUser(user: User | null): Promise<Product[]> {
    if (user?.role === "VENDOR") {
      return this.products.listByOwner(user.id);
    }
    return this.products.list();
  }

  async getProductById(id: string): Promise<Product> {
    const product = await this.products.findById(id);
    if (!product) {
      throw new NotFoundError(`Product with id "${id}" not found.`);
    }
    return product;
  }

  /** Adds a product, only to a shop the requester owns. */
  async createProduct(data: CreateProductCommand, requesterId: string): Promise<Product> {
    const vendor = await this.vendors.findById(data.vendorId);
    if (!vendor) {
      throw new NotFoundError(`Vendor with id "${data.vendorId}" not found.`);
    }
    if (vendor.ownerId !== requesterId) {
      throw new PermissionError("This vendor does not belong to you.");
    }
    return this.products.create(data);
  }

  async deleteProductById(id: string): Promise<Product> {
    await this.getProductById(id);
    return this.products.delete(id);
  }
}
