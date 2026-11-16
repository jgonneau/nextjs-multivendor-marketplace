// Shapes of the API's JSON responses: copies of the response DTOs in the API's adapters/http/dto.ts.
// The frontend is a separate app with no access to the API's code, so they are kept in sync by hand;
// __test__/frontend-contract.test.ts in the API project fails if they drift.

export type Role = "USER" | "CUSTOMER" | "VENDOR" | "ADMIN" | "SUPERADMIN";

export type ApiUser = {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  activated: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ApiVendor = {
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

export type ApiProduct = {
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

export type ApiOrder = {
  orderId: string;
  userId: string;
  vendorId: string;
  productsRefs: string[];
  status: string;
  deliveryDate: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Session = {
  token: string;
  id: string;
  email: string;
  role: Role;
  /** Expiry, in seconds since the epoch. */
  exp: number;
};

export type CreatedSubOrder = {
  orderId: string;
  userId: string;
  vendorId: string;
  vendorProducts: string[];
};
