/**
 * Composition root: plugs the driven adapters (Prisma, scrypt, jose) into the
 * core's ports and builds the use cases. The only module that knows both
 * sides of the hexagon; driving adapters (route handlers) import services
 * from here. Adapters themselves never import this module.
 */
import prisma from "@/adapters/persistence/prisma/client";
import { prismaRepositories } from "@/adapters/persistence/prisma/repositories";
import { PrismaUnitOfWork } from "@/adapters/persistence/prisma/unitOfWork";
import { ScryptPasswordHasher } from "@/adapters/security/password";
import { JoseTokenIssuer } from "@/adapters/security/jwt";
import { currentUserResolver } from "@/adapters/http/currentUser";
import { AuthService } from "@/core/application/auth.service";
import { UserService } from "@/core/application/user.service";
import { VendorService } from "@/core/application/vendor.service";
import { ProductService } from "@/core/application/product.service";
import { OrderService } from "@/core/application/order.service";
import { LogService } from "@/core/application/log.service";

const repositories = prismaRepositories(prisma);
const passwordHasher = new ScryptPasswordHasher();
const tokenIssuer = new JoseTokenIssuer();
const unitOfWork = new PrismaUnitOfWork(prisma);

export const authService = new AuthService(repositories.users, passwordHasher, tokenIssuer);
export const userService = new UserService(repositories.users, passwordHasher);
export const vendorService = new VendorService(repositories.vendors);
export const productService = new ProductService(repositories.products, repositories.vendors);
export const orderService = new OrderService(repositories.orders, repositories.products, unitOfWork);
export const logService = new LogService(repositories.logs);

/** For route handlers: the signed-in user behind a request (see adapters/http/currentUser.ts). */
export const getCurrentUser = currentUserResolver(userService);
