/**
 * What the services need from storage. Services receive these through their
 * constructors (see container.ts), so they never import Prisma, and tests
 * can hand them in-memory fakes.
 *
 * Contract for every implementation:
 * - `find*` returns null when nothing matches; `list*` returns [] when empty.
 * - Storage failures are thrown as errors, never turned into null or [].
 *   Known data problems (duplicate, missing or still-referenced record) are
 *   thrown as the core errors in core/domain/errors.ts; anything else is rethrown as-is
 *   and becomes a 500.
 */
import type { Log, Order, Product, Role, User, Vendor } from "@/core/domain/entities";

export type NewUser = { email: string; password: string; name?: string | null; role: Role };
export type UserChanges = Partial<Pick<User, "email" | "password" | "name" | "role" | "token">>;

export interface UserRepository {
  list(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  create(data: NewUser): Promise<User>;
  update(id: string, changes: UserChanges): Promise<User>;
  delete(id: string): Promise<User>;
}

export type NewVendor = {
  name: string;
  ownerId: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
};

export interface VendorRepository {
  list(): Promise<Vendor[]>;
  findById(id: string): Promise<Vendor | null>;
  create(data: NewVendor): Promise<Vendor>;
  delete(id: string): Promise<Vendor>;
}

export type NewProduct = {
  reference: string;
  vendorId: string;
  title?: string | null;
  description?: string | null;
  price?: number;
};

export interface ProductRepository {
  list(): Promise<Product[]>;
  /** Products of every shop owned by `ownerId`. */
  listByOwner(ownerId: string): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  /** Matches either the id or the (unique) reference. */
  findByIdOrReference(idOrReference: string): Promise<Product | null>;
  create(data: NewProduct): Promise<Product>;
  delete(id: string): Promise<Product>;
}

export type NewOrder = { userId: string; vendorId: string; productsRefs: string[] };
export type DeliveryChanges = { status: string; deliveryDate?: Date };

export interface OrderRepository {
  list(): Promise<Order[]>;
  /** Orders placed by customer `userId`. */
  listByCustomer(userId: string): Promise<Order[]>;
  /** Orders placed with any shop owned by `ownerId`. */
  listByVendorOwner(ownerId: string): Promise<Order[]>;
  findById(orderId: string): Promise<Order | null>;
  /** The order, only if it was placed with a shop owned by `ownerId`. */
  findForVendorOwner(ownerId: string, orderId: string): Promise<Order | null>;
  create(data: NewOrder): Promise<Order>;
  updateDelivery(orderId: string, changes: DeliveryChanges): Promise<Order>;
  delete(orderId: string): Promise<Order>;
}

export type NewLog = { message: string; level?: string; timestamp?: string };

export interface LogRepository {
  create(data: NewLog): Promise<Log>;
}

export type Repositories = {
  users: UserRepository;
  vendors: VendorRepository;
  products: ProductRepository;
  orders: OrderRepository;
  logs: LogRepository;
};

/**
 * Runs several repository calls as one atomic unit: if `work` throws, none of
 * the writes it made through `repos` are kept. Use the repositories handed to
 * `work`, not the ones the service was built with, or the writes escape the
 * transaction.
 */
export interface UnitOfWork {
  run<T>(work: (repos: Repositories) => Promise<T>): Promise<T>;
}
