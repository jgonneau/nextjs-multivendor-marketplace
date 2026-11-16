import { PrismaClient } from "@/prisma/generated/prisma";
import { withAccelerate } from "@prisma/extension-accelerate";

const globalForPrisma = global as unknown as {
  prisma: PrismaClient;
};

const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: [
      { level: "warn", emit: "event" },
      { level: "info", emit: "event" },
      { level: "error", emit: "event" },
    ],
  }).$extends(withAccelerate());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;
