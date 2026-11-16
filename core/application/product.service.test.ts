/**
 * @jest-environment node
 */
import { ProductService } from "@/core/application/product.service";
import { NotFoundError, PermissionError } from "@/core/domain/errors";
import { mockRepositories, type MockRepositories } from "@/__test__/helpers/mockRepositories";

describe("ProductService", () => {
  let repos: MockRepositories;
  let service: ProductService;
  const input = { reference: "MUG-1", vendorId: "v1", title: "Mug", price: 12 };

  beforeEach(() => {
    repos = mockRepositories();
    service = new ProductService(repos.products, repos.vendors);
  });

  test("vendors list only their own shops' products", async () => {
    await service.listProductsForUser({ id: "u1", role: "VENDOR" } as any);
    expect(repos.products.listByOwner).toHaveBeenCalledWith("u1");
    expect(repos.products.list).not.toHaveBeenCalled();
  });

  test("everyone else lists all products", async () => {
    await service.listProductsForUser({ id: "u1", role: "CUSTOMER" } as any);
    await service.listProductsForUser(null);
    expect(repos.products.list).toHaveBeenCalledTimes(2);
  });

  test("adds a product to a shop the requester owns", async () => {
    repos.vendors.findById.mockResolvedValue({ id: "v1", ownerId: "u1" } as any);
    repos.products.create.mockResolvedValue({ id: "p1", ...input } as any);

    await service.createProduct(input, "u1");

    expect(repos.products.create).toHaveBeenCalledWith(input);
  });

  test("refuses a shop owned by someone else", async () => {
    repos.vendors.findById.mockResolvedValue({ id: "v1", ownerId: "someone-else" } as any);
    await expect(service.createProduct(input, "u1")).rejects.toBeInstanceOf(PermissionError);
    expect(repos.products.create).not.toHaveBeenCalled();
  });

  test("404 for an unknown shop", async () => {
    repos.vendors.findById.mockResolvedValue(null);
    await expect(service.createProduct(input, "u1")).rejects.toBeInstanceOf(NotFoundError);
  });

  test("checks existence before deleting", async () => {
    repos.products.findById.mockResolvedValue(null);
    await expect(service.deleteProductById("missing")).rejects.toBeInstanceOf(NotFoundError);
    expect(repos.products.delete).not.toHaveBeenCalled();
  });
});
