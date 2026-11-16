/**
 * The marketplace's entities, as the business rules (services/) see them.
 *
 * This layer depends on nothing: no Prisma, no Next.js. The Prisma
 * repositories (adapters/persistence/prisma/) return their rows as these types, so the
 * compiler fails there if prisma/schema.prisma and these definitions drift.
 */

export const ROLES = ["USER", "CUSTOMER", "VENDOR", "ADMIN", "SUPERADMIN"] as const;
export type Role = (typeof ROLES)[number];

export const isAdminRole = (role: Role | null | undefined): boolean =>
  role === "ADMIN" || role === "SUPERADMIN";

export interface User {
  id: string;
  email: string;
  name: string | null;
  /** scrypt hash (adapters/security/password.ts), never plain text. */
  password: string;
  /** Last JWT issued to this user. */
  token: string | null;
  role: Role;
  activated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  ownerId: string;
  activated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Product {
  id: string;
  reference: string;
  title: string | null;
  description: string | null;
  price: number;
  inStock: boolean;
  vendorId: string;
  activated: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  orderId: string;
  userId: string;
  vendorId: string;
  /** Product references (not ids), so an order outlives a deleted product. */
  productsRefs: string[];
  status: string;
  deliveryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Log {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  createdAt: Date;
}
