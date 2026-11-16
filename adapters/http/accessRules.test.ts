/**
 * @jest-environment node
 */
import authorizationService from "@/adapters/http/accessRules";

describe("AuthorizationService", () => {
  test("denies access when role is null", () => {
    expect(authorizationService.canAccess(null, "/api/product", "GET")).toBe(
      false
    );
  });

  test("SUPERADMIN can access anything", () => {
    expect(
      authorizationService.canAccess("SUPERADMIN", "/api/user", "DELETE")
    ).toBe(true);
  });

  test("ADMIN can GET and POST but not DELETE", () => {
    expect(authorizationService.canAccess("ADMIN", "/api/user", "GET")).toBe(
      true
    );
    expect(authorizationService.canAccess("ADMIN", "/api/user", "POST")).toBe(
      true
    );
    expect(
      authorizationService.canAccess("ADMIN", "/api/user", "DELETE")
    ).toBe(false);
  });

  test("CUSTOMER can GET product/vendor and GET/POST order, nothing else", () => {
    expect(
      authorizationService.canAccess("CUSTOMER", "/api/product", "GET")
    ).toBe(true);
    expect(
      authorizationService.canAccess("CUSTOMER", "/api/order", "POST")
    ).toBe(true);
    expect(
      authorizationService.canAccess("CUSTOMER", "/api/product", "POST")
    ).toBe(false);
    expect(
      authorizationService.canAccess("CUSTOMER", "/api/vendor/register", "POST")
    ).toBe(false);
  });

  test("VENDOR can register, manage products, and update delivery", () => {
    expect(
      authorizationService.canAccess("VENDOR", "/api/vendor/register", "POST")
    ).toBe(true);
    expect(
      authorizationService.canAccess("VENDOR", "/api/product", "POST")
    ).toBe(true);
    expect(
      authorizationService.canAccess(
        "VENDOR",
        "/api/order/abc123/updateDelivery",
        "PUT"
      )
    ).toBe(true);
    expect(
      authorizationService.canAccess("VENDOR", "/api/order", "POST")
    ).toBe(false);
  });
});
