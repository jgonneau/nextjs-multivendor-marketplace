/**
 * Test data factories.
 *
 * Every test creates exactly the records it needs, with unique values, so
 * tests don't depend on pre-existing rows or on each other, and suites can run
 * in parallel. Everything a factory creates is tracked; call `cleanup()` in
 * `afterAll` and it removes those records plus anything hanging off them
 * (e.g. orders the API created for a factory user).
 */
import { randomUUID } from "node:crypto";
import prisma from "@/adapters/persistence/prisma/client";
import { signJWT } from "@/adapters/security/jwt";
import { hashPassword } from "@/adapters/security/password";
import type { Order, Product, Role, User, Vendor } from "@/prisma/generated/prisma";

const createdUserIds: string[] = [];
const createdVendorIds: string[] = [];

const uid = () => randomUUID().slice(0, 8);

/** Plaintext password every factory user gets unless overridden (stored hashed). */
export const DEFAULT_PASSWORD = "password";

export async function makeUser(
  /** `password` is the plaintext; it is hashed before saving. */
  overrides: Partial<Pick<User, "email" | "name" | "password" | "activated">> & {
    role?: Role;
  } = {}
): Promise<User> {
  const { password = DEFAULT_PASSWORD, ...rest } = overrides;
  const user = await prisma.user.create({
    data: {
      email: `user-${uid()}@test.local`,
      role: "USER",
      ...rest,
      password: await hashPassword(password),
    },
  });
  createdUserIds.push(user.id);
  return user;
}

export async function makeVendor(
  ownerId: string,
  overrides: Partial<Pick<Vendor, "name" | "description" | "activated">> = {}
): Promise<Vendor> {
  const vendor = await prisma.vendor.create({
    data: { name: `Vendor ${uid()}`, ownerId, ...overrides },
  });
  createdVendorIds.push(vendor.id);
  return vendor;
}

export async function makeProduct(
  vendorId: string,
  overrides: Partial<Pick<Product, "reference" | "title" | "price" | "inStock" | "activated">> = {}
): Promise<Product> {
  return prisma.product.create({
    data: { reference: `REF-${uid()}`, title: "Test product", price: 9.99, vendorId, ...overrides },
  });
}

export async function makeOrder(
  userId: string,
  vendorId: string,
  productsRefs: string[] = []
): Promise<Order> {
  return prisma.order.create({ data: { userId, vendorId, productsRefs } });
}

/** A freshly signed token, built the same way the login route builds one. */
export function tokenFor(user: User): Promise<string> {
  return signJWT({ id: user.id, email: user.email, role: user.role });
}

/** The Authorization header format the API expects. */
export function authHeader(token: string): string {
  return `Bearer: TOKEN ${token}`;
}

/** Deletes everything created through these factories, children first. */
export async function cleanup(): Promise<void> {
  const userIds = createdUserIds.splice(0);
  const vendorIds = createdVendorIds.splice(0);

  const ordersWhere = {
    OR: [{ userId: { in: userIds } }, { vendorId: { in: vendorIds } }],
  };
  const vendorsWhere = {
    OR: [{ id: { in: vendorIds } }, { ownerId: { in: userIds } }],
  };

  await prisma.invoice.deleteMany({ where: { order: ordersWhere } });
  await prisma.order.deleteMany({ where: ordersWhere });
  await prisma.product.deleteMany({ where: { vendor: vendorsWhere } });
  await prisma.vendor.deleteMany({ where: vendorsWhere });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
}
