import { isAdminRole, type Order, type Product, type User } from "@/core/domain/entities";
import type { OrderRepository, ProductRepository, UnitOfWork } from "@/core/ports/repositories";
import type { PlaceOrderCommand, UpdateDeliveryCommand } from "./commands";
import { NotFoundError, ValidationError } from "@/core/domain/errors";

/** One order per shop, created from a single basket. */
export type CreatedSubOrder = {
  orderId: string;
  userId: string;
  vendorId: string;
  vendorProducts: string[];
};

/** Orders: placing them (split per shop), listing them per role, and delivery. */
export class OrderService {
  constructor(
    private readonly orders: OrderRepository,
    private readonly products: ProductRepository,
    private readonly unitOfWork: UnitOfWork
  ) {}

  /** Customers see their own orders, vendors the orders placed with their
   * shops, everyone else (admins) sees all. */
  listOrdersForUser(user: User): Promise<Order[]> {
    if (user.role === "CUSTOMER") {
      return this.orders.listByCustomer(user.id);
    }
    if (user.role === "VENDOR") {
      return this.orders.listByVendorOwner(user.id);
    }
    return this.orders.list();
  }

  async getOrderById(id: string): Promise<Order> {
    const order = await this.orders.findById(id);
    if (!order) {
      throw new NotFoundError(`Order with id "${id}" not found.`);
    }
    return order;
  }

  async deleteOrderById(id: string): Promise<Order> {
    await this.getOrderById(id);
    return this.orders.delete(id);
  }

  /**
   * Creates one order per shop represented in the basket. Customers order for
   * themselves; admins order on behalf of `command.onBehalfOf`. Unknown
   * products are skipped, but at least one must exist. All the orders are
   * created together or not at all.
   */
  async createOrderForUser(requester: User, command: PlaceOrderCommand): Promise<CreatedSubOrder[]> {
    if (!command?.products?.length) {
      throw new ValidationError('Field "product_list" is required.');
    }
    const forOthers = isAdminRole(requester.role);
    if (forOthers && !command.onBehalfOf) {
      throw new ValidationError('Missing "userId" field.');
    }
    const userId = forOthers ? (command.onBehalfOf as string) : requester.id;

    const found = await Promise.all(command.products.map((ref) => this.products.findByIdOrReference(ref)));
    const resolved = found.filter((p): p is Product => p !== null);
    if (!resolved.length) {
      throw new ValidationError("None of the submitted products were found.");
    }

    const vendorIds = [...new Set(resolved.map((p) => p.vendorId))];
    return this.unitOfWork.run(async ({ orders }) => {
      const created: CreatedSubOrder[] = [];
      // One at a time: queries inside a transaction share one connection.
      for (const vendorId of vendorIds) {
        const vendorProducts = resolved.filter((p) => p.vendorId === vendorId).map((p) => p.reference);
        const order = await orders.create({ userId, vendorId, productsRefs: vendorProducts });
        created.push({ orderId: order.orderId, userId, vendorId, vendorProducts });
      }
      return created;
    });
  }

  /** Updates the delivery status, only for an order placed with one of the requester's shops. */
  async updateDelivery(requester: User, orderId: string, command: UpdateDeliveryCommand): Promise<Order> {
    const order = await this.orders.findForVendorOwner(requester.id, orderId);
    if (!order) {
      throw new NotFoundError(`Relative order not found "${orderId}".`);
    }
    return this.orders.updateDelivery(orderId, {
      status: command.status,
      ...(command.deliveryDate && { deliveryDate: command.deliveryDate }),
    });
  }
}
