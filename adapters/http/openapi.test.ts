/**
 * @jest-environment node
 *
 * Keeps the docs honest: every route handler is documented (and nothing
 * else), the response schemas match what the DTO mappers really produce,
 * the examples pass the real request validation, and the listed roles are
 * the ones middleware enforces.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { matchers } from "jest-json-schema";
import { buildOpenApiDocument, documentedOperations, requestSchemas } from "./openapi";
import { toLogDto, toOrderDto, toProductDto, toUserDto, toVendorDto } from "./dto";
import { GET as getDocsPage } from "@/app/route";
import { GET as getSpec } from "@/app/openapi.json/route";

expect.extend(matchers);

const doc = buildOpenApiDocument("test");
const now = new Date("2026-11-16T10:00:00.000Z");

/** A component schema, with the components alongside so its $refs resolve. */
const component = (name: string) => ({
  ...(doc.components.schemas[name] as object),
  components: doc.components,
});

function routeHandlers(): string[] {
  const apiDir = join(process.cwd(), "app", "api");
  const found: string[] = [];
  for (const entry of readdirSync(apiDir, { recursive: true, withFileTypes: true })) {
    if (entry.name !== "route.ts") continue;
    const file = join(entry.parentPath, entry.name);
    const path =
      "/" +
      relative(join(process.cwd(), "app"), entry.parentPath)
        .split(sep)
        .join("/")
        .replace(/\[(\w+)\]/g, "{$1}");
    for (const [, method] of readFileSync(file, "utf8").matchAll(/export (?:async )?function (GET|POST|PUT|PATCH|DELETE)\b/g)) {
      found.push(`${method} ${path}`);
    }
  }
  return found.sort();
}

describe("OpenAPI document", () => {
  test("documents exactly the route handlers in app/api", () => {
    expect(documentedOperations().sort()).toEqual(routeHandlers());
  });

  test("every $ref points at an existing component", () => {
    const refs = [...JSON.stringify(doc).matchAll(/"\$ref":"#\/components\/schemas\/(\w+)"/g)].map(([, name]) => name);
    expect(refs.length).toBeGreaterThan(0);
    for (const name of refs) expect(doc.components.schemas).toHaveProperty(name);
  });

  test("operation ids are unique", () => {
    const ids = Object.values(doc.paths).flatMap((ops) => Object.values(ops).map((op) => (op as { operationId: string }).operationId));
    expect(new Set(ids).size).toBe(ids.length);
  });

  describe("response schemas match the DTO mappers", () => {
    const base = { id: "c1", createdAt: now, updatedAt: now, activated: true };

    test("User (and never the password or token)", () => {
      const dto = toUserDto({ ...base, email: "a@b.c", name: null, role: "VENDOR", password: "scrypt$…", token: "t" } as any);
      expect(dto).toMatchSchema(component("User"));
      expect({ ...dto, password: "x" }).not.toMatchSchema(component("User"));
    });

    test("Vendor", () => {
      const dto = toVendorDto({ ...base, name: "Shop", description: null, phone: "1", address: null, ownerId: "u1" } as any);
      expect(dto).toMatchSchema(component("Vendor"));
    });

    test("Product", () => {
      const dto = toProductDto({
        ...base,
        reference: "R",
        title: null,
        description: "d",
        price: 3.5,
        inStock: true,
        vendorId: "v1",
      } as any);
      expect(dto).toMatchSchema(component("Product"));
    });

    test("Order, with and without a delivery date", () => {
      const order = { orderId: "o1", userId: "u1", vendorId: "v1", productsRefs: ["R"], status: "Pending", createdAt: now, updatedAt: now };
      expect(toOrderDto({ ...order, deliveryDate: null } as any)).toMatchSchema(component("Order"));
      expect(toOrderDto({ ...order, deliveryDate: now } as any)).toMatchSchema(component("Order"));
    });

    test("Log", () => {
      const dto = toLogDto({ id: "l1", level: "info", message: "m", timestamp: "t", createdAt: now } as any);
      expect(dto).toMatchSchema(component("Log"));
    });
  });

  test("every request example passes the route's real validation", () => {
    let checked = 0;
    for (const ops of Object.values(doc.paths)) {
      for (const op of Object.values(ops) as any[]) {
        const content = op.requestBody?.content["application/json"];
        if (!content) continue;
        const name = content.schema.$ref.split("/").pop() as keyof typeof requestSchemas;
        expect(requestSchemas[name].safeParse(content.example).success).toBe(true);
        checked++;
      }
    }
    expect(checked).toBe(9);
  });

  test("lists the roles middleware actually lets through", () => {
    const roles = (path: string, method: string) => (doc.paths as any)[path][method]["x-roles"];
    expect(roles("/api/order", "post")).toEqual(["CUSTOMER", "ADMIN", "SUPERADMIN"]);
    expect(roles("/api/order/{cuid}/updateDelivery", "put")).toEqual(["VENDOR", "SUPERADMIN"]);
    expect(roles("/api/user/{cuid}", "delete")).toEqual(["SUPERADMIN"]);
    // Public endpoints need no token and list no roles.
    expect((doc.paths as any)["/api/auth"].post.security).toEqual([]);
    expect((doc.paths as any)["/api/auth"].post["x-roles"]).toBeUndefined();
  });
});

describe("docs routes", () => {
  test("GET /openapi.json serves the document", async () => {
    const response = getSpec();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.openapi).toBe("3.1.0");
    expect(Object.keys(body.paths)).toContain("/api/order");
  });

  test("GET / serves the docs page, with the script pinned and integrity-checked", async () => {
    const response = getDocsPage();
    expect(response.headers.get("content-type")).toContain("text/html");
    const html = await response.text();
    expect(html).toContain('"url":"/openapi.json"');
    // One exact version from two CDNs (fallback), integrity-checked.
    const sources = html.match(/https:\/\/[^"]+@scalar\/api-reference@\d+\.\d+\.\d+\/[^"]+/g);
    expect(sources?.map((url) => new URL(url).host)).toEqual(["cdn.jsdelivr.net", "unpkg.com"]);
    expect(html).toMatch(/script\.integrity = "sha384-[A-Za-z0-9+/=]+"/);
    expect(html).toContain('"showDeveloperTools":"never"');
    // Every icon the page links to is served from public/.
    const icons = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon)" href="\/([^"]+)"/g)].map(([, file]) => file);
    expect(icons).toEqual(["favicon.ico", "favicon.svg", "apple-touch-icon.png"]);
    for (const file of icons) expect(existsSync(join(process.cwd(), "public", file))).toBe(true);
  });
});
