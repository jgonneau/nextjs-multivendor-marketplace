/**
 * @jest-environment node
 */
import { OrderService } from "@/core/application/order.service";
import { NotFoundError, ValidationError } from "@/core/domain/errors";
import { fakeUnitOfWork, mockRepositories, type MockRepositories } from "@/__test__/helpers/mockRepositories";

function user(overrides: Partial<{ id: string; role: string }> = {}) {
  return { id: "u1", role: "CUSTOMER", ...overrides } as any;
}

describe("OrderService", () => {
  let repos: MockRepositories;
  let service: OrderService;

  beforeEach(() => {
    repos = mockRepositories();
    service = new OrderService(repos.orders, repos.products, fakeUnitOfWork(repos));
  });

  describe("listOrdersForUser", () => {
    test("CUSTOMER sees only their own orders", async () => {
      await service.listOrdersForUser(user({ role: "CUSTOMER" }));
      expect(repos.orders.listByCustomer).toHaveBeenCalledWith("u1");
      expect(repos.orders.list).not.toHaveBeenCalled();
    });

    test("VENDOR sees orders related to the vendors they own", async () => {
      await service.listOrdersForUser(user({ role: "VENDOR" }));
      expect(repos.orders.listByVendorOwner).toHaveBeenCalledWith("u1");
    });

    test("ADMIN sees everything", async () => {
      await service.listOrdersForUser(user({ role: "ADMIN" }));
      expect(repos.orders.list).toHaveBeenCalled();
    });
  });

  describe("createOrderForUser", () => {
    test("throws ValidationError when product_list is empty", async () => {
      await expect(service.createOrderForUser(user(), { products: [] })).rejects.toBeInstanceOf(ValidationError);
    });

    test("throws ValidationError when an admin omits userId", async () => {
      repos.products.findByIdOrReference.mockResolvedValue({ id: "p1", reference: "REF-1", vendorId: "v1" } as any);

      await expect(
        service.createOrderForUser(user({ role: "ADMIN" }), { products: ["REF-1"] })
      ).rejects.toBeInstanceOf(ValidationError);
    });

    test("an admin orders on behalf of userId", async () => {
      repos.products.findByIdOrReference.mockResolvedValue({ id: "p1", reference: "REF-1", vendorId: "v1" } as any);
      repos.orders.create.mockImplementation(async (data) => ({ orderId: "o1", ...data }) as any);

      const [created] = await service.createOrderForUser(user({ role: "SUPERADMIN" }), {
        products: ["REF-1"],
        onBehalfOf: "customer1",
      });

      expect(created.userId).toBe("customer1");
      expect(repos.orders.create).toHaveBeenCalledWith({ userId: "customer1", vendorId: "v1", productsRefs: ["REF-1"] });
    });

    test("groups products by vendor into one order per vendor", async () => {
      repos.products.findByIdOrReference.mockImplementation(async (ref: string) => {
        const byRef: Record<string, any> = {
          "ref-v1-a": { id: "p1", reference: "ref-v1-a", vendorId: "v1" },
          "ref-v1-b": { id: "p2", reference: "ref-v1-b", vendorId: "v1" },
          "ref-v2-a": { id: "p3", reference: "ref-v2-a", vendorId: "v2" },
        };
        return byRef[ref] ?? null;
      });
      repos.orders.create.mockImplementation(async (data) => ({ orderId: `order-${data.vendorId}`, ...data }) as any);

      const result = await service.createOrderForUser(user(), {
        products: ["ref-v1-a", "ref-v1-b", "ref-v2-a"],
      });

      expect(repos.orders.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ vendorId: "v1", vendorProducts: ["ref-v1-a", "ref-v1-b"] }),
          expect.objectContaining({ vendorId: "v2", vendorProducts: ["ref-v2-a"] }),
        ])
      );
    });

    test("creates the orders through the unit of work's repositories, in one run", async () => {
      const tx = mockRepositories();
      const unitOfWork = fakeUnitOfWork(tx);
      service = new OrderService(repos.orders, repos.products, unitOfWork);
      repos.products.findByIdOrReference.mockImplementation(
        async (ref: string) => ({ id: ref, reference: ref, vendorId: ref.split("-")[0] }) as any
      );
      tx.orders.create.mockImplementation(async (data) => ({ orderId: `order-${data.vendorId}`, ...data }) as any);

      await service.createOrderForUser(user(), { products: ["v1-a", "v2-a"] });

      expect(unitOfWork.run).toHaveBeenCalledTimes(1);
      expect(tx.orders.create).toHaveBeenCalledTimes(2);
      expect(repos.orders.create).not.toHaveBeenCalled();
    });

    test("a failed order fails the whole basket (so the transaction rolls back)", async () => {
      repos.products.findByIdOrReference.mockImplementation(
        async (ref: string) => ({ id: ref, reference: ref, vendorId: ref.split("-")[0] }) as any
      );
      repos.orders.create
        .mockResolvedValueOnce({ orderId: "o1" } as any)
        .mockRejectedValueOnce(new ValidationError("Invalid reference: vendorId"));

      await expect(service.createOrderForUser(user(), { products: ["v1-a", "v2-a"] })).rejects.toThrow(
        "Invalid reference"
      );
    });

    test("throws ValidationError when none of the submitted products resolve", async () => {
      repos.products.findByIdOrReference.mockResolvedValue(null);
      await expect(service.createOrderForUser(user(), { products: ["nope"] })).rejects.toBeInstanceOf(
        ValidationError
      );
    });
  });

  describe("updateDelivery", () => {
    test("throws NotFoundError when the order isn't related to the user's vendor", async () => {
      repos.orders.findForVendorOwner.mockResolvedValue(null);
      await expect(
        service.updateDelivery(user({ role: "VENDOR" }), "order1", { status: "shipped" })
      ).rejects.toBeInstanceOf(NotFoundError);
      expect(repos.orders.updateDelivery).not.toHaveBeenCalled();
    });

    test("updates status (and deliveryDate when provided)", async () => {
      repos.orders.findForVendorOwner.mockResolvedValue({ orderId: "order1", status: "Pending" } as any);
      repos.orders.updateDelivery.mockImplementation(async (orderId, changes) => ({ orderId, ...changes }) as any);

      const updated = await service.updateDelivery(user({ role: "VENDOR" }), "order1", {
        status: "shipped",
        deliveryDate: new Date("2025-01-01"),
      });

      expect(repos.orders.findForVendorOwner).toHaveBeenCalledWith("u1", "order1");
      expect(updated.status).toBe("shipped");
      expect(updated.deliveryDate).toBeInstanceOf(Date);
    });

    test("leaves the delivery date alone when none is given", async () => {
      repos.orders.findForVendorOwner.mockResolvedValue({ orderId: "order1" } as any);
      repos.orders.updateDelivery.mockResolvedValue({} as any);

      await service.updateDelivery(user({ role: "VENDOR" }), "order1", { status: "Shipped" });

      expect(repos.orders.updateDelivery).toHaveBeenCalledWith("order1", { status: "Shipped" });
    });
  });
});
