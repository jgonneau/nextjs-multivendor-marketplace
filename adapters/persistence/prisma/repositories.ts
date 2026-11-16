/**
 * Prisma implementations of the repository interfaces in core/ports/repositories.ts.
 * Each method's return type is the domain entity, so the compiler checks
 * that Prisma's rows still match core/domain/entities.ts.
 */
import type { Prisma } from "@/prisma/generated/prisma";

/** The plain client or the client of an interactive transaction: repositories
 * only use the model delegates, which both have. */
type Db = Prisma.TransactionClient;
import type {
  LogRepository,
  OrderRepository,
  ProductRepository,
  Repositories,
  UserRepository,
  VendorRepository,
} from "@/core/ports/repositories";
import { query } from "./errors";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: Db) {}

  list() {
    return query("list users", () => this.db.user.findMany());
  }
  findById(id: string) {
    return query("find user by id", () => this.db.user.findUnique({ where: { id } }));
  }
  findByEmail(email: string) {
    return query("find user by email", () => this.db.user.findUnique({ where: { email } }));
  }
  create(data: Parameters<UserRepository["create"]>[0]) {
    return query("create user", () => this.db.user.create({ data }));
  }
  update(id: string, changes: Parameters<UserRepository["update"]>[1]) {
    return query("update user", () => this.db.user.update({ where: { id }, data: changes }));
  }
  delete(id: string) {
    return query("delete user", () => this.db.user.delete({ where: { id } }));
  }
}

export class PrismaVendorRepository implements VendorRepository {
  constructor(private readonly db: Db) {}

  list() {
    return query("list vendors", () => this.db.vendor.findMany());
  }
  findById(id: string) {
    return query("find vendor", () => this.db.vendor.findUnique({ where: { id } }));
  }
  create(data: Parameters<VendorRepository["create"]>[0]) {
    return query("create vendor", () => this.db.vendor.create({ data }));
  }
  delete(id: string) {
    return query("delete vendor", () => this.db.vendor.delete({ where: { id } }));
  }
}

export class PrismaProductRepository implements ProductRepository {
  constructor(private readonly db: Db) {}

  list() {
    return query("list products", () => this.db.product.findMany());
  }
  listByOwner(ownerId: string) {
    return query("list products by owner", () =>
      this.db.product.findMany({ where: { vendor: { ownerId } } })
    );
  }
  findById(id: string) {
    return query("find product", () => this.db.product.findUnique({ where: { id } }));
  }
  findByIdOrReference(idOrReference: string) {
    return query("find product by id or reference", () =>
      this.db.product.findFirst({ where: { OR: [{ id: idOrReference }, { reference: idOrReference }] } })
    );
  }
  create(data: Parameters<ProductRepository["create"]>[0]) {
    return query("create product", () => this.db.product.create({ data }));
  }
  delete(id: string) {
    return query("delete product", () => this.db.product.delete({ where: { id } }));
  }
}

export class PrismaOrderRepository implements OrderRepository {
  constructor(private readonly db: Db) {}

  list() {
    return query("list orders", () => this.db.order.findMany());
  }
  listByCustomer(userId: string) {
    return query("list orders by customer", () => this.db.order.findMany({ where: { userId } }));
  }
  listByVendorOwner(ownerId: string) {
    return query("list orders by vendor owner", () =>
      this.db.order.findMany({ where: { vendor: { ownerId } } })
    );
  }
  findById(orderId: string) {
    return query("find order", () => this.db.order.findUnique({ where: { orderId } }));
  }
  findForVendorOwner(ownerId: string, orderId: string) {
    return query("find order for vendor owner", () =>
      this.db.order.findFirst({ where: { orderId, vendor: { ownerId } } })
    );
  }
  create(data: Parameters<OrderRepository["create"]>[0]) {
    return query("create order", () => this.db.order.create({ data }));
  }
  updateDelivery(orderId: string, changes: Parameters<OrderRepository["updateDelivery"]>[1]) {
    return query("update order delivery", () => this.db.order.update({ where: { orderId }, data: changes }));
  }
  delete(orderId: string) {
    return query("delete order", () => this.db.order.delete({ where: { orderId } }));
  }
}

export class PrismaLogRepository implements LogRepository {
  constructor(private readonly db: Db) {}

  create(data: Parameters<LogRepository["create"]>[0]) {
    return query("create log", () => this.db.log.create({ data }));
  }
}

export function prismaRepositories(db: Db): Repositories {
  return {
    users: new PrismaUserRepository(db),
    vendors: new PrismaVendorRepository(db),
    products: new PrismaProductRepository(db),
    orders: new PrismaOrderRepository(db),
    logs: new PrismaLogRepository(db),
  };
}
