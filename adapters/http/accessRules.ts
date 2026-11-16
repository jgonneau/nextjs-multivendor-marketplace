import type { Role } from "@/core/domain/entities";

type PermissionRule = {
  path: string | RegExp;
  methods: string[];
};

// HTTP access rules: which role may call which path and method. They're an
// HTTP adapter concern (they speak in URLs), enforced by middleware.ts before
// a request reaches the core; ownership rules ("only the shop's owner…") live
// in the core's use cases instead. Rules are plain, synchronous, easily-testable data + a single
// decision function — no NextRequest dependency required.
/** Paths that skip the token check in middleware.ts (they authenticate, or
 * carry their own secret). */
export const PUBLIC_PATHS: readonly string[] = ["/api/auth", "/api/auth/newaccount", "/api/logs"];

const CUSTOMER_RULES: PermissionRule[] = [
  { path: "/api/vendor", methods: ["GET"] },
  { path: "/api/product", methods: ["GET"] },
  { path: "/api/order", methods: ["GET", "POST"] },
];

const VENDOR_RULES: PermissionRule[] = [
  { path: "/api/product", methods: ["GET", "POST"] },
  { path: "/api/vendor/register", methods: ["POST"] },
  { path: "/api/vendor", methods: ["GET"] },
  { path: "/api/order", methods: ["GET"] },
  // e.g. /api/order/xxxOrderIdxxx/updateDelivery
  { path: /\/api\/order\/\w+\/updateDelivery/, methods: ["PUT"] },
];

function matchesAnyRule(
  rules: PermissionRule[],
  path: string,
  method: string
): boolean {
  return rules.some((rule) => {
    const pathMatches =
      typeof rule.path === "string" ? rule.path === path : rule.path.test(path);
    return pathMatches && rule.methods.includes(method);
  });
}

/**
 * Centralized authorization service. Decides whether a given role may
 * perform `method` on `path`, independent of any request/framework type so
 * it can be unit tested directly and reused from middleware or route code.
 */
export class AuthorizationService {
  canAccess(role: Role | null, path: string, method: string): boolean {
    if (!role) return false;

    if (role === "SUPERADMIN") return true;

    if (role === "ADMIN") {
      return ["GET", "POST"].includes(method);
    }

    if (role === "VENDOR") {
      return matchesAnyRule(VENDOR_RULES, path, method);
    }

    if (role === "CUSTOMER") {
      return matchesAnyRule(CUSTOMER_RULES, path, method);
    }

    return false;
  }
}

const authorizationService = new AuthorizationService();
export default authorizationService;
