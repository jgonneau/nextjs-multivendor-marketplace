/**
 * The API's OpenAPI 3.1 description, served at /openapi.json and rendered
 * at / (app/route.ts).
 *
 * Built from the code rather than written by hand, wherever possible:
 * - request bodies come from the Zod schemas the routes validate with;
 * - "who may call this" comes from the same access rules middleware.ts enforces;
 * - response schemas mirror dto.ts (openapi.test.ts checks them against real
 *   DTO output, and checks that every route handler is documented).
 */
import { z } from "zod";
import { ROLES, type Role } from "@/core/domain/entities";
import authorizationService, { PUBLIC_PATHS } from "./accessRules";
import {
  createLogSchema,
  createOrderSchema,
  createProductSchema,
  createUserSchema,
  createVendorSchema,
  loginSchema,
  newAccountSchema,
  updateDeliverySchema,
  updateUserSchema,
} from "./schemas";

type JsonSchema = Record<string, unknown>;
type Method = "get" | "post" | "put" | "delete";

// ---- Schemas -----------------------------------------------------------------

function requestSchema(schema: z.ZodType): JsonSchema {
  // "input": the shape clients send (before defaults and preprocessing).
  const json: JsonSchema = { ...z.toJSONSchema(schema, { io: "input", unrepresentable: "any" }) };
  delete json.$schema; // OpenAPI 3.1 documents declare the dialect once, not per schema
  return json;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });
const str = { type: "string" };
const id = { type: "string", description: "cuid", examples: ["cm3x8k2p40000abcd1234efgh"] };
const dateTime = { type: "string", format: "date-time" };
const nullable = (schema: JsonSchema) => ({ ...schema, type: [schema.type, "null"] });

/** Every field always present, nothing extra: the DTOs in dto.ts are exact. */
function exact(properties: Record<string, JsonSchema>, description?: string): JsonSchema {
  return {
    type: "object",
    ...(description && { description }),
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  };
}

/** The Zod schema behind each request body, by component name. */
export const requestSchemas = {
  LoginRequest: loginSchema,
  NewAccountRequest: newAccountSchema,
  CreateUserRequest: createUserSchema,
  UpdateUserRequest: updateUserSchema,
  RegisterVendorRequest: createVendorSchema,
  CreateProductRequest: createProductSchema,
  PlaceOrderRequest: createOrderSchema,
  UpdateDeliveryRequest: updateDeliverySchema,
  CreateLogRequest: createLogSchema,
} satisfies Record<string, z.ZodType>;

const schemas: Record<string, JsonSchema> = {
  User: exact(
    {
      id,
      email: { type: "string", examples: ["jane@example.com"] },
      name: nullable(str),
      role: ref("Role"),
      activated: { type: "boolean" },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
    "An account. The password hash and stored token are never sent."
  ),
  Role: {
    type: "string",
    enum: [...ROLES],
    description: "USER is the default for accounts created by an admin; sign-up offers CUSTOMER and VENDOR.",
  },
  Vendor: exact(
    {
      id,
      name: { type: "string", examples: ["Roast & Co"] },
      description: nullable(str),
      phone: nullable(str),
      address: nullable(str),
      ownerId: { ...id, description: "The VENDOR user who owns the shop." },
      activated: { type: "boolean" },
      createdAt: dateTime,
      updatedAt: dateTime,
    },
    "A shop, owned by one VENDOR user."
  ),
  Product: exact({
    id,
    reference: { type: "string", description: "Unique across all shops.", examples: ["COF-ETH-250"] },
    title: nullable(str),
    description: nullable(str),
    price: { type: "number", examples: [12.5] },
    inStock: { type: "boolean" },
    vendorId: id,
    activated: { type: "boolean" },
    createdAt: dateTime,
    updatedAt: dateTime,
  }),
  Order: exact(
    {
      orderId: id,
      userId: { ...id, description: "The customer." },
      vendorId: id,
      productsRefs: { type: "array", items: str, description: "Product references." },
      status: { type: "string", examples: ["Pending", "Shipped"] },
      deliveryDate: nullable(dateTime),
      createdAt: dateTime,
      updatedAt: dateTime,
    },
    "An order with a single shop. A basket spanning several shops becomes several orders."
  ),
  CreatedSubOrder: exact(
    { orderId: id, userId: id, vendorId: id, vendorProducts: { type: "array", items: str } },
    "One of the orders created from a basket: the products it holds from one shop."
  ),
  Log: exact({ id, level: str, message: str, timestamp: str, createdAt: dateTime }),
  Error: {
    type: "object",
    properties: { error: { type: "string", examples: ["Order with id \"abc\" not found."] } },
    required: ["error"],
  },
  ...Object.fromEntries(Object.entries(requestSchemas).map(([name, schema]) => [name, requestSchema(schema)])),
};

// ---- Operations --------------------------------------------------------------

type Operation = {
  tag: string;
  summary: string;
  description?: string;
  body?: { schema: keyof typeof requestSchemas; example: unknown };
  response: { description: string; schema: JsonSchema; example?: unknown };
  /** Errors the handler itself can return (auth errors are added automatically). */
  errors?: number[];
  /** Overrides the default security (user token) for this operation. */
  security?: Record<string, string[]>[];
};

const list = (name: string) => ({ type: "array", items: ref(name) });

const operations: Record<string, Partial<Record<Method, Operation>>> = {
  "/api/auth": {
    get: {
      tag: "Auth",
      summary: "Health check",
      response: { description: "The API is up.", schema: exact({ data: { const: "OK!" } }) },
    },
    post: {
      tag: "Auth",
      summary: "Log in",
      description:
        "Exchanges email and password for an access token. Send it on every other call as " +
        "`Authorization: Bearer: TOKEN <token>`. Tokens last 20 minutes (1 year for ADMIN and SUPERADMIN). " +
        "A wrong email, a wrong password and a deactivated account all get the same 403.",
      body: { schema: "LoginRequest", example: { email: "jane@example.com", password: "password" } },
      response: {
        description: "The access token.",
        schema: exact({ info: str, token: { type: "string", description: "A JWT." } }),
      },
      errors: [400, 403],
    },
  },
  "/api/auth/newaccount": {
    post: {
      tag: "Auth",
      summary: "Sign up",
      description: "Creates a CUSTOMER (default) or VENDOR account. Log in afterwards to get a token.",
      body: {
        schema: "NewAccountRequest",
        example: { email: "jane@example.com", password: "password", name: "Jane", role: "CUSTOMER" },
      },
      response: {
        description: "The new account.",
        schema: exact({ status: str, info: str, data: ref("User") }),
      },
      errors: [400],
    },
  },
  "/api/user": {
    get: { tag: "Users", summary: "List users", response: { description: "Every account.", schema: list("User") } },
    post: {
      tag: "Users",
      summary: "Create a user",
      description: "Any role can be given; without one the account is a USER.",
      body: { schema: "CreateUserRequest", example: { email: "sam@example.com", password: "password", role: "VENDOR" } },
      response: { description: "The new account.", schema: ref("User") },
      errors: [400],
    },
  },
  "/api/user/{cuid}": {
    get: { tag: "Users", summary: "Get a user", response: { description: "The account.", schema: ref("User") }, errors: [404] },
    put: {
      tag: "Users",
      summary: "Update a user",
      description: "Only email, name, role and password can change; other fields are ignored. A new password is hashed.",
      body: { schema: "UpdateUserRequest", example: { name: "Jane Doe" } },
      response: { description: "The updated account.", schema: ref("User") },
      errors: [400, 404],
    },
    delete: {
      tag: "Users",
      summary: "Delete a user",
      response: { description: "The deleted account.", schema: ref("User") },
      errors: [400, 404],
    },
  },
  "/api/vendor": {
    get: { tag: "Vendors", summary: "List shops", response: { description: "Every shop.", schema: list("Vendor") } },
  },
  "/api/vendor/register": {
    post: {
      tag: "Vendors",
      summary: "Open a shop",
      description: "Creates a shop owned by the caller.",
      body: { schema: "RegisterVendorRequest", example: { name: "Roast & Co", phone: "+33 1 23 45 67 89" } },
      response: { description: "The new shop.", schema: ref("Vendor") },
      errors: [400],
    },
  },
  "/api/vendor/{cuid}": {
    get: { tag: "Vendors", summary: "Get a shop", response: { description: "The shop.", schema: ref("Vendor") }, errors: [404] },
    delete: {
      tag: "Vendors",
      summary: "Delete a shop",
      description: "Fails with 400 while the shop still has products or orders.",
      response: { description: "The deleted shop.", schema: ref("Vendor") },
      errors: [400, 404],
    },
  },
  "/api/product": {
    get: {
      tag: "Products",
      summary: "List products",
      description: "Vendors only see the products of their own shops; everyone else sees all products.",
      response: { description: "The products.", schema: list("Product") },
    },
    post: {
      tag: "Products",
      summary: "Add a product",
      description: "Only to a shop the caller owns (403 otherwise).",
      body: {
        schema: "CreateProductRequest",
        example: { reference: "COF-ETH-250", vendorId: "cm3x8k2p40000abcd1234efgh", title: "Ethiopia 250 g", price: 12.5 },
      },
      response: { description: "The new product.", schema: ref("Product") },
      errors: [400, 404],
    },
  },
  "/api/product/{cuid}": {
    get: { tag: "Products", summary: "Get a product", response: { description: "The product.", schema: ref("Product") }, errors: [404] },
    delete: {
      tag: "Products",
      summary: "Delete a product",
      response: { description: "The deleted product's id.", schema: { type: "string" } },
      errors: [400, 404],
    },
  },
  "/api/order": {
    get: {
      tag: "Orders",
      summary: "List orders",
      description: "Customers see their own orders, vendors the orders placed with their shops, admins every order.",
      response: { description: "The orders.", schema: list("Order") },
    },
    post: {
      tag: "Orders",
      summary: "Place an order",
      description:
        "`product_list` holds product ids or references. The basket is split into one order per shop, " +
        "all created in one transaction: either every order is placed or none is. Unknown products are " +
        "skipped, but at least one must exist. Admins order on behalf of a customer and must send `userId`; " +
        "for customers it's ignored.",
      body: { schema: "PlaceOrderRequest", example: { product_list: ["COF-ETH-250", "TEA-SEN-100"] } },
      response: { description: "One entry per shop in the basket.", schema: list("CreatedSubOrder") },
      errors: [400],
    },
  },
  "/api/order/{cuid}": {
    get: { tag: "Orders", summary: "Get an order", response: { description: "The order.", schema: ref("Order") }, errors: [404] },
    delete: {
      tag: "Orders",
      summary: "Delete an order",
      response: { description: "The deleted order.", schema: ref("Order") },
      errors: [400, 404],
    },
  },
  "/api/order/{cuid}/updateDelivery": {
    put: {
      tag: "Orders",
      summary: "Update a delivery",
      description: "Only for an order placed with one of the caller's shops (404 otherwise).",
      body: { schema: "UpdateDeliveryRequest", example: { status: "Shipped", deliveryDate: "2026-12-01" } },
      response: { description: "The updated order.", schema: ref("Order") },
      errors: [400, 404],
    },
  },
  "/api/logs": {
    post: {
      tag: "Logs",
      summary: "Record a log entry",
      description: "For the server's own logger: authenticated with the shared `LOG_TOKEN_SECRET`, not a user token.",
      body: { schema: "CreateLogRequest", example: { message: "Something happened", level: "info" } },
      response: { description: "The stored entry.", schema: ref("Log") },
      errors: [400, 401, 403],
      security: [{ logSecret: [] }],
    },
  },
};

const ERROR_DESCRIPTIONS: Record<number, string> = {
  400: "Invalid body, or a business rule or data constraint was broken.",
  401: "No token, or the token is invalid or expired.",
  403: "This role may not call this endpoint, or the caller doesn't own the resource.",
  404: "Not found.",
  500: "Unexpected server error (details are only logged server-side).",
};

/** The roles middleware.ts lets through, worked out from the real rules. */
export function allowedRoles(path: string, method: Method): Role[] {
  const concrete = path.replace(/\{\w+\}/g, "c0000000000000000000000000");
  return ROLES.filter((role) => authorizationService.canAccess(role, concrete, method.toUpperCase()));
}

function buildOperation(path: string, method: Method, op: Operation) {
  const isPublic = PUBLIC_PATHS.includes(path);
  const roles = isPublic ? [] : allowedRoles(path, method);
  const access = isPublic
    ? op.security
      ? "**Access:** shared log secret."
      : "**Access:** public, no token needed."
    : `**Access:** ${roles.map((r) => `\`${r}\``).join(", ")}.`;

  const errors = new Set(op.errors ?? []);
  if (!isPublic) {
    errors.add(401);
    errors.add(403);
  }
  errors.add(500);

  return {
    tags: [op.tag],
    summary: op.summary,
    operationId: `${method}${path.replace(/[{}]/g, "").replace(/\/(\w)/g, (_, c: string) => c.toUpperCase())}`,
    description: [op.description, access].filter(Boolean).join("\n\n"),
    ...(!isPublic && { "x-roles": roles }),
    security: op.security ?? (isPublic ? [] : [{ bearer: [] }]),
    ...(path.includes("{cuid}") && {
      parameters: [{ name: "cuid", in: "path", required: true, schema: id }],
    }),
    ...(op.body && {
      requestBody: {
        required: true,
        content: { "application/json": { schema: ref(op.body.schema), example: op.body.example } },
      },
    }),
    responses: {
      200: { description: op.response.description, content: { "application/json": { schema: op.response.schema } } },
      ...Object.fromEntries(
        [...errors]
          .sort()
          .map((code) => [code, { description: ERROR_DESCRIPTIONS[code], content: { "application/json": { schema: ref("Error") } } }])
      ),
    },
  };
}

/** The operations documented, as "METHOD /path" — used by openapi.test.ts. */
export function documentedOperations(): string[] {
  return Object.entries(operations).flatMap(([path, ops]) =>
    Object.keys(ops).map((method) => `${method.toUpperCase()} ${path}`)
  );
}

const DESCRIPTION = `
A small marketplace API: customers order from shops, vendors run shops and handle deliveries, admins manage everything.

## Getting a token

1. Sign up with \`POST /api/auth/newaccount\` (or use an account from the seed data).
2. Log in with \`POST /api/auth\`. The response holds a \`token\`.
3. Send it on every other call, **in this exact format**:

\`\`\`
Authorization: Bearer: TOKEN <token>
\`\`\`

To try calls from this page, paste \`Bearer: TOKEN <token>\` into **Authentication → Value** (top right; it's remembered in this browser), then use **Test Request** on any endpoint.

## Roles

| Role | Can do |
|---|---|
| \`CUSTOMER\` | Browse shops and products, place and list their own orders |
| \`VENDOR\` | Open shops, add products to them, see and update the orders placed with them |
| \`ADMIN\` | Every \`GET\` and \`POST\` (including ordering for a customer) |
| \`SUPERADMIN\` | Everything, including updates and deletes |
| \`USER\` | Nothing yet: the default for accounts created by an admin without a role |

Each endpoint lists the roles allowed to call it; that list is generated from the rules the API enforces.

## Errors

Every error is JSON: \`{ "error": "<message>" }\`, with status 400 (invalid input or broken rule), 401 (missing or expired token), 403 (role or ownership), 404 (not found) or 500 (unexpected; details are only logged server-side).
`.trim();

export function buildOpenApiDocument(version: string) {
  const paths = Object.fromEntries(
    Object.entries(operations).map(([path, ops]) => [
      path,
      Object.fromEntries(Object.entries(ops).map(([method, op]) => [method, buildOperation(path, method as Method, op!)])),
    ])
  );

  return {
    openapi: "3.1.0",
    info: { title: "Next.js Multivendor Marketplace API", version, description: DESCRIPTION },
    servers: [{ url: "/", description: "This server" }],
    tags: [
      { name: "Auth", description: "Sign up, log in, health check" },
      { name: "Users", description: "Accounts (admins)" },
      { name: "Vendors", description: "Shops" },
      { name: "Products", description: "Products of the shops" },
      { name: "Orders", description: "Orders, split per shop, and deliveries" },
      { name: "Logs", description: "Server log ingestion" },
    ],
    paths,
    components: {
      schemas,
      securitySchemes: {
        bearer: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "`Bearer: TOKEN <token>`, with the token from `POST /api/auth`.",
        },
        logSecret: {
          type: "apiKey",
          in: "header",
          name: "Authorization",
          description: "`Bearer: TOKEN <LOG_TOKEN_SECRET>`.",
        },
      },
    },
  };
}
