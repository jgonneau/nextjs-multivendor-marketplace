/**
 * Response DTOs: exactly what the API sends as JSON, decoupled from the
 * entities. Routes return `toXDto(entity)`, never an entity, so:
 * - credentials (password hash, stored token) can't leak by accident;
 * - a new database column stays private until it's added here;
 * - dates are ISO strings, as on the wire.
 *
 * frontend/lib/client/types.ts mirrors these types; __test__/frontend-contract.test.ts
 * fails to compile if the two drift.
 */
import type { Log, Order, Product, Role, User, Vendor } from "@/core/domain/entities";

const iso = (date: Date) => date.toISOString();

export type UserDto = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  activated: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    activated: user.activated,
    createdAt: iso(user.createdAt),
    updatedAt: iso(user.updatedAt),
  };
}

export type VendorDto = {
  id: string;
  name: string;
  description: string | null;
  phone: string | null;
  address: string | null;
  ownerId: string;
  activated: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toVendorDto(vendor: Vendor): VendorDto {
  return {
    id: vendor.id,
    name: vendor.name,
    description: vendor.description,
    phone: vendor.phone,
    address: vendor.address,
    ownerId: vendor.ownerId,
    activated: vendor.activated,
    createdAt: iso(vendor.createdAt),
    updatedAt: iso(vendor.updatedAt),
  };
}

export type ProductDto = {
  id: string;
  reference: string;
  title: string | null;
  description: string | null;
  price: number;
  inStock: boolean;
  vendorId: string;
  activated: boolean;
  createdAt: string;
  updatedAt: string;
};

export function toProductDto(product: Product): ProductDto {
  return {
    id: product.id,
    reference: product.reference,
    title: product.title,
    description: product.description,
    price: product.price,
    inStock: product.inStock,
    vendorId: product.vendorId,
    activated: product.activated,
    createdAt: iso(product.createdAt),
    updatedAt: iso(product.updatedAt),
  };
}

export type OrderDto = {
  orderId: string;
  userId: string;
  vendorId: string;
  productsRefs: string[];
  status: string;
  deliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export function toOrderDto(order: Order): OrderDto {
  return {
    orderId: order.orderId,
    userId: order.userId,
    vendorId: order.vendorId,
    productsRefs: [...order.productsRefs],
    status: order.status,
    deliveryDate: order.deliveryDate ? iso(order.deliveryDate) : null,
    createdAt: iso(order.createdAt),
    updatedAt: iso(order.updatedAt),
  };
}

export type LogDto = {
  id: string;
  level: string;
  message: string;
  timestamp: string;
  createdAt: string;
};

export function toLogDto(log: Log): LogDto {
  return {
    id: log.id,
    level: log.level,
    message: log.message,
    timestamp: log.timestamp,
    createdAt: iso(log.createdAt),
  };
}

export type { CreatedSubOrder as CreatedSubOrderDto } from "@/core/application/order.service";
