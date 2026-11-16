/**
 * Inputs of the use cases, owned by the core. Driving adapters (the HTTP
 * routes) validate their own request format, then build these commands;
 * the core never sees request bodies, Zod or wire-format quirks
 * (e.g. `product_list`, or dates sent as strings).
 */
import type { Role } from "@/core/domain/entities";

export type LoginCommand = { email: string; password: string };

export type CreateUserCommand = {
  email: string;
  password: string;
  name?: string | null;
  /** Defaults to USER. */
  role?: Role;
};

export type UpdateUserCommand = Partial<{
  email: string;
  password: string;
  name: string | null;
  role: Role;
}>;

export type RegisterVendorCommand = {
  name: string;
  description?: string | null;
  phone?: string | null;
  address?: string | null;
};

export type CreateProductCommand = {
  reference: string;
  vendorId: string;
  title?: string | null;
  description?: string | null;
  price?: number;
};

export type PlaceOrderCommand = {
  /** Product ids or references. */
  products: string[];
  /** Customer to order for; required for admins, ignored for everyone else. */
  onBehalfOf?: string;
};

export type UpdateDeliveryCommand = { status: string; deliveryDate?: Date };

export type RecordLogCommand = { message: string; level?: string; timestamp?: string };
