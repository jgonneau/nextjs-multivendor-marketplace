// Client-side copy of adapters/http/accessRules.ts in the API project,
// used only to decide which buttons to show; the API's middleware is what
// actually enforces access. __test__/frontend-contract.test.ts in the API
// project checks that both give the same answer for every role and endpoint.
import type { Role } from "./types";

type PermissionRule = {
  path: string | RegExp;
  methods: string[];
};

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
