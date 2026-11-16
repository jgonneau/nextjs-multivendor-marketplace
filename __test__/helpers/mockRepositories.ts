/**
 * jest.fn() stand-ins for every repository interface, for service unit tests:
 * `new VendorService(repos.vendors)` with `repos = mockRepositories()`.
 * Every method resolves to undefined until a test sets a return value.
 */
import type {
  LogRepository,
  OrderRepository,
  ProductRepository,
  Repositories,
  UnitOfWork,
  UserRepository,
  VendorRepository,
} from "@/core/ports/repositories";

type Mocked<T> = { [K in keyof T]: T[K] extends (...args: infer A) => infer R ? jest.Mock<R, A> : never };

export type MockRepositories = {
  users: Mocked<UserRepository>;
  vendors: Mocked<VendorRepository>;
  products: Mocked<ProductRepository>;
  orders: Mocked<OrderRepository>;
  logs: Mocked<LogRepository>;
};

export function mockRepositories(): MockRepositories {
  return {
    users: { list: jest.fn(), findById: jest.fn(), findByEmail: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    vendors: { list: jest.fn(), findById: jest.fn(), create: jest.fn(), delete: jest.fn() },
    products: {
      list: jest.fn(),
      listByOwner: jest.fn(),
      findById: jest.fn(),
      findByIdOrReference: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    orders: {
      list: jest.fn(),
      listByCustomer: jest.fn(),
      listByVendorOwner: jest.fn(),
      findById: jest.fn(),
      findForVendorOwner: jest.fn(),
      create: jest.fn(),
      updateDelivery: jest.fn(),
      delete: jest.fn(),
    },
    logs: { create: jest.fn() },
  };
}

/**
 * A UnitOfWork that runs the work directly against `repos` (no real
 * transaction; rollback is the Prisma adapter's job and is tested there).
 * `run` is a jest.fn, so tests can check that writes went through it.
 */
export function fakeUnitOfWork(repos: Repositories | MockRepositories) {
  return { run: jest.fn((work) => work(repos as Repositories)) } as jest.Mocked<UnitOfWork>;
}
