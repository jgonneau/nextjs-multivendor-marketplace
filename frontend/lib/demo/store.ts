/**
 * In-memory stand-in for the API, used by the /demo pages. It answers the
 * same paths the real pages call, with the same role rules
 * (lib/client/permissions.ts), so the real UI runs unchanged on sample data.
 * State lives in this module: changes last until the page is reloaded.
 */
import authorizationService from "@/lib/client/permissions";
import { ApiError, type RequestOptions } from "@/lib/client/api";
import type { ApiOrder, ApiProduct, ApiUser, ApiVendor, CreatedSubOrder, Role } from "@/lib/client/types";

export const DEMO_VIEWS = ["customer", "vendor", "admin"] as const;
export type DemoView = (typeof DEMO_VIEWS)[number];

/** Who you are in each view. The admin view uses SUPERADMIN so every action is visible. */
export const DEMO_IDENTITY: Record<DemoView, { id: string; email: string; role: Role }> = {
  customer: { id: "democamille", email: "camille@demo.shop", role: "CUSTOMER" },
  vendor: { id: "demovictor", email: "victor@demo.shop", role: "VENDOR" },
  admin: { id: "demoada", email: "ada@demo.shop", role: "SUPERADMIN" },
};

// IDs avoid "-" so they match the API's /api/order/\w+/updateDelivery rule.
const day = 86_400_000;
const ago = (days: number) => new Date(Date.now() - days * day).toISOString();
const ahead = (days: number) => new Date(Date.now() + days * day).toISOString();

function seed() {
  const users: ApiUser[] = [
    ["demoada", "ada@demo.shop", "Ada Laurent", "SUPERADMIN", 120],
    ["demomaya", "maya@demo.shop", "Maya Chen", "ADMIN", 90],
    ["demovictor", "victor@demo.shop", "Victor Morel", "VENDOR", 80],
    ["demoines", "ines@demo.shop", "Inès Duarte", "VENDOR", 60],
    ["democamille", "camille@demo.shop", "Camille Petit", "CUSTOMER", 40],
    ["demosam", "sam@demo.shop", null, "CUSTOMER", 25],
    ["demolea", "lea@demo.shop", "Léa Martin", "CUSTOMER", 12],
    ["demonew", "newcomer@demo.shop", null, "USER", 2],
  ].map(([id, email, name, role, days]) => ({
    id: id as string,
    email: email as string,
    name: name as string | null,
    role: role as Role,
    activated: true,
    createdAt: ago(days as number),
    updatedAt: ago(days as number),
  }));

  const vendors: ApiVendor[] = [
    ["demoshopceramic", "Ceramic Studio", "Hand-thrown stoneware, fired in small batches.", "+33 1 23 45 67 89", "12 rue des Potiers, Lyon", "demovictor"],
    ["demoshoplin", "Atelier Lin", "Linen goods woven in Normandy.", "+33 2 98 76 54 32", "4 quai du Lin, Rouen", "demovictor"],
    ["demoshoproast", "Roast & Co", "Small-batch coffee, roasted every Monday.", null, "8 avenue du Café, Paris", "demoines"],
    ["demoshophive", "Hive Goods", "Beeswax candles and honey from our own hives.", "+33 4 11 22 33 44", null, "demoines"],
  ].map(([id, name, description, phone, address, ownerId], i) => ({
    id: id as string,
    name: name as string,
    description,
    phone,
    address,
    ownerId: ownerId as string,
    activated: true,
    createdAt: ago(70 - i * 10),
    updatedAt: ago(70 - i * 10),
  }));

  const products: ApiProduct[] = [
    ["MUG001", "Hand-thrown mug", "Speckled glaze, 350 ml.", 24, true, "demoshopceramic"],
    ["BOWL002", "Speckled bowl", "Ideal for ramen or salads.", 38, true, "demoshopceramic"],
    ["VASE003", "Bud vase", "Matte white, 14 cm.", 29, false, "demoshopceramic"],
    ["TOTE001", "Linen tote bag", "Natural linen, reinforced handles.", 32, true, "demoshoplin"],
    ["NAPK002", "Set of 4 napkins", "Stonewashed, 45 × 45 cm.", 26, true, "demoshoplin"],
    ["COF001", "Single-origin coffee", "Ethiopia Guji, 250 g, whole beans.", 14.5, true, "demoshoproast"],
    ["COF002", "House espresso blend", "Chocolate and hazelnut notes, 1 kg.", 39, true, "demoshoproast"],
    ["CNDL001", "Beeswax candle", "Pure beeswax, burns 40 hours.", 18, true, "demoshophive"],
    ["HNY002", "Wildflower honey", "Raw, unfiltered, 500 g.", 12, true, "demoshophive"],
  ].map(([reference, title, description, price, inStock, vendorId], i) => ({
    id: `demoproduct${i + 1}`,
    reference: reference as string,
    title: title as string,
    description: description as string,
    price: price as number,
    inStock: inStock as boolean,
    vendorId: vendorId as string,
    activated: true,
    createdAt: ago(50 - i),
    updatedAt: ago(50 - i),
  }));

  const orders: ApiOrder[] = [
    ["democamille", "demoshopceramic", ["MUG001", "BOWL002"], "Shipped", ahead(2), 3],
    ["democamille", "demoshoproast", ["COF001"], "Delivered", ago(5), 9],
    ["democamille", "demoshophive", ["CNDL001", "HNY002"], "Processing", ahead(5), 1],
    ["demosam", "demoshoplin", ["TOTE001"], "Pending", null, 0.2],
    ["demosam", "demoshopceramic", ["VASE003"], "Cancelled", null, 14],
    ["demolea", "demoshoplin", ["NAPK002", "TOTE001"], "Processing", ahead(4), 2],
    ["demolea", "demoshoproast", ["COF002"], "Pending", null, 0.5],
  ].map(([userId, vendorId, productsRefs, status, deliveryDate, days], i) => ({
    orderId: `demoorder${String(i + 1).padStart(2, "0")}a7f3`,
    userId: userId as string,
    vendorId: vendorId as string,
    productsRefs: productsRefs as string[],
    status: status as string,
    deliveryDate: deliveryDate as string | null,
    createdAt: ago(days as number),
    updatedAt: ago((days as number) / 2),
  }));

  return { users, vendors, products, orders };
}

let db = seed();
let counter = 0;
const newId = (prefix: string) => `demo${prefix}${Date.now().toString(36)}${counter++}`;
const now = () => new Date().toISOString();
const copy = <T>(value: T): T => structuredClone(value);
const notFound = () => new ApiError(404, "Not found");

/** Puts the sample data back to its initial state. */
export function resetDemo() {
  db = seed();
}

/** Mock API request as `userId` with `role`. Resolves after a short, realistic delay. */
export async function demoRequest<T>(
  userId: string,
  role: Role,
  path: string,
  { method = "GET", body }: RequestOptions = {}
): Promise<T> {
  await new Promise((r) => setTimeout(r, 200 + Math.random() * 250));
  if (!authorizationService.canAccess(role, path, method)) throw new ApiError(403, "Forbidden");
  return copy(handle(userId, role, path, method, (body ?? {}) as Record<string, unknown>)) as T;
}

function handle(userId: string, role: Role, path: string, method: string, body: Record<string, unknown>): unknown {
  const [, , resource, id, action] = path.split("/"); // "", "api", resource, id?, action?
  const isAdmin = role === "ADMIN" || role === "SUPERADMIN";

  // "/api/vendor/register" is a named route, not a shop id.
  const route = id === "register" ? `${resource}/register` : `${resource}${id ? "/:id" : ""}${action ? `/${action}` : ""}`;

  switch (`${method} ${route}`) {
    case "GET vendor":
      return db.vendors;
    case "GET product":
      return db.products;
    case "GET user":
      return db.users;
    case "GET order": {
      if (isAdmin) return db.orders;
      if (role === "VENDOR") {
        const mine = new Set(db.vendors.filter((v) => v.ownerId === userId).map((v) => v.id));
        return db.orders.filter((o) => mine.has(o.vendorId));
      }
      return db.orders.filter((o) => o.userId === userId);
    }
    case "GET vendor/:id":
      return db.vendors.find((v) => v.id === id) ?? throwIt(notFound());
    case "GET product/:id":
      return db.products.find((p) => p.id === id) ?? throwIt(notFound());
    case "GET order/:id":
      return db.orders.find((o) => o.orderId === id) ?? throwIt(notFound());

    case "POST order": {
      const ids = (body.product_list as string[]) ?? [];
      const buyer = isAdmin ? String(body.userId ?? "") : userId;
      if (!db.users.some((u) => u.id === buyer)) throw new ApiError(400, "Unknown user");
      const byVendor = new Map<string, string[]>();
      for (const pid of ids) {
        const p = db.products.find((x) => x.id === pid);
        if (!p) throw new ApiError(400, `Unknown product ${pid}`);
        byVendor.set(p.vendorId, [...(byVendor.get(p.vendorId) ?? []), p.reference]);
      }
      const created: CreatedSubOrder[] = [];
      for (const [vendorId, refs] of byVendor) {
        const order: ApiOrder = {
          orderId: newId("order"),
          userId: buyer,
          vendorId,
          productsRefs: refs,
          status: "Pending",
          deliveryDate: null,
          createdAt: now(),
          updatedAt: now(),
        };
        db.orders.push(order);
        created.push({ orderId: order.orderId, userId: buyer, vendorId, vendorProducts: refs });
      }
      return created;
    }
    case "PUT order/:id/updateDelivery": {
      const order = db.orders.find((o) => o.orderId === id) ?? throwIt(notFound());
      const vendor = db.vendors.find((v) => v.id === order.vendorId);
      if (role === "VENDOR" && vendor?.ownerId !== userId) throw new ApiError(403, "Forbidden");
      order.status = String(body.status ?? order.status);
      if (body.deliveryDate) order.deliveryDate = new Date(String(body.deliveryDate)).toISOString();
      order.updatedAt = now();
      return order;
    }
    case "DELETE order/:id":
      db.orders = db.orders.filter((o) => o.orderId !== id);
      return { ok: true };

    case "POST vendor/register": {
      const name = String(body.name ?? "").trim();
      if (!name) throw new ApiError(400, "Name is required");
      if (db.vendors.some((v) => v.name.toLowerCase() === name.toLowerCase()))
        throw new ApiError(409, "A shop with this name already exists");
      const vendor: ApiVendor = {
        id: newId("shop"),
        name,
        description: (body.description as string) ?? null,
        phone: (body.phone as string) ?? null,
        address: (body.address as string) ?? null,
        ownerId: userId,
        activated: true,
        createdAt: now(),
        updatedAt: now(),
      };
      db.vendors.push(vendor);
      return vendor;
    }
    case "DELETE vendor/:id":
      if (db.products.some((p) => p.vendorId === id) || db.orders.some((o) => o.vendorId === id))
        throw new ApiError(409, "Foreign key constraint: shop is still referenced");
      db.vendors = db.vendors.filter((v) => v.id !== id);
      return { ok: true };

    case "POST product": {
      const reference = String(body.reference ?? "").trim();
      if (!reference) throw new ApiError(400, "Reference is required");
      if (db.products.some((p) => p.reference === reference))
        throw new ApiError(409, "A product with this reference already exists");
      const product: ApiProduct = {
        id: newId("product"),
        reference,
        title: (body.title as string) ?? null,
        description: (body.description as string) ?? null,
        price: Number(body.price ?? 1),
        inStock: true,
        vendorId: String(body.vendorId),
        activated: true,
        createdAt: now(),
        updatedAt: now(),
      };
      db.products.push(product);
      return product;
    }
    case "DELETE product/:id":
      db.products = db.products.filter((p) => p.id !== id);
      return { ok: true };

    case "POST user": {
      const email = String(body.email ?? "").trim();
      if (db.users.some((u) => u.email === email)) throw new ApiError(409, "A user with this email already exists");
      const user: ApiUser = {
        id: newId("user"),
        email,
        name: (body.name as string) ?? null,
        role: (body.role as Role) ?? "CUSTOMER",
        activated: true,
        createdAt: now(),
        updatedAt: now(),
      };
      db.users.push(user);
      return user;
    }
    case "PUT user/:id": {
      const user = db.users.find((u) => u.id === id) ?? throwIt(notFound());
      if (typeof body.email === "string") user.email = body.email;
      if (typeof body.name === "string") user.name = body.name || null;
      if (typeof body.role === "string") user.role = body.role as Role;
      user.updatedAt = now();
      return user;
    }
    case "DELETE user/:id":
      if (db.vendors.some((v) => v.ownerId === id) || db.orders.some((o) => o.userId === id))
        throw new ApiError(409, "Foreign key constraint: user is still referenced");
      db.users = db.users.filter((u) => u.id !== id);
      return { ok: true };
  }
  throw notFound();
}

function throwIt(error: Error): never {
  throw error;
}

/** Landing page of each view (mirrors homeFor in SessionProvider). */
export const DEMO_HOME: Record<DemoView, string> = {
  customer: "/shop",
  vendor: "/my-shops",
  admin: "/orders",
};

export const isDemoView = (value: string): value is DemoView => (DEMO_VIEWS as readonly string[]).includes(value);
