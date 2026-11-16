/**
 * The frontend (frontend/) is a separate app that can't import from the API,
 * so it keeps its own copies of two things. This test fails when they drift:
 *
 * - lib/client/permissions.ts must give the same answers as
 *   adapters/http/accessRules.ts, or the UI shows buttons the API
 *   rejects (or hides ones it allows).
 * - lib/client/types.ts must describe the JSON the API actually sends, i.e.
 *   the response DTOs in adapters/http/dto.ts. Checked at compile time
 *   (`pnpm exec tsc --noEmit`, or your editor).
 */
import authorizationService from "@/adapters/http/accessRules";
import frontendPermissions from "../frontend/lib/client/permissions";
import type * as Client from "../frontend/lib/client/types";
import type { Role } from "@/core/domain/entities";
import type { CreatedSubOrderDto, OrderDto, ProductDto, UserDto, VendorDto } from "@/adapters/http/dto";
import type { Role as PrismaRole } from "@/prisma/generated/prisma";

const ROLES: (Role | null)[] = [null, "USER", "CUSTOMER", "VENDOR", "ADMIN", "SUPERADMIN"];
const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];
const PATHS = [
  "/api/auth",
  "/api/auth/newaccount",
  "/api/logs",
  "/api/user",
  "/api/user/cm0000000000000000000000",
  "/api/vendor",
  "/api/vendor/register",
  "/api/vendor/cm0000000000000000000000",
  "/api/product",
  "/api/product/cm0000000000000000000000",
  "/api/order",
  "/api/order/cm0000000000000000000000",
  "/api/order/cm0000000000000000000000/updateDelivery",
];

describe("frontend permissions copy", () => {
  const cases = ROLES.flatMap((role) =>
    PATHS.flatMap((path) => METHODS.map((method) => [role, method, path] as const))
  );

  it.each(cases)("%s %s %s matches the API", (role, method, path) => {
    expect(frontendPermissions.canAccess(role, path, method)).toBe(
      authorizationService.canAccess(role, path, method)
    );
  });
});

// ---- compile-time checks for lib/client/types.ts ---------------------------

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
// Compiles only when T is `true`; returning T keeps the type parameter "used".
function assertType<T extends true>(): T | undefined {
  return undefined;
}

assertType<Equal<Client.Role, Role>>();
assertType<Equal<Client.ApiUser, UserDto>>();
assertType<Equal<Client.ApiVendor, VendorDto>>();
assertType<Equal<Client.ApiProduct, ProductDto>>();
assertType<Equal<Client.ApiOrder, OrderDto>>();
assertType<Equal<Client.CreatedSubOrder, CreatedSubOrderDto>>();
// The domain's roles must match the database enum.
assertType<Equal<Role, PrismaRole>>();
