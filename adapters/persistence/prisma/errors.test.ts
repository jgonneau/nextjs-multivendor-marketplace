/**
 * @jest-environment node
 */
import { Prisma } from "@/prisma/generated/prisma";
import { NotFoundError, ValidationError } from "@/core/domain/errors";
import { mapPrismaError, query } from "./errors";

const known = (code: string, meta?: Record<string, unknown>) =>
  new Prisma.PrismaClientKnownRequestError("boom", { code, clientVersion: "test", meta });

describe("mapPrismaError", () => {
  test("missing record → NotFoundError", () => {
    expect(() => mapPrismaError(known("P2025"))).toThrow(NotFoundError);
  });

  test("unique constraint → ValidationError naming the field", () => {
    expect(() => mapPrismaError(known("P2002", { target: ["email"] }))).toThrow(
      new ValidationError("A record with this email already exists.")
    );
  });

  test("foreign key → ValidationError mentioning the reference", () => {
    expect(() => mapPrismaError(known("P2003", { field_name: "ownerId" }))).toThrow(/reference/);
  });

  test("schema mismatch → ValidationError", () => {
    const error = new Prisma.PrismaClientValidationError("bad", { clientVersion: "test" });
    expect(() => mapPrismaError(error)).toThrow(ValidationError);
  });

  test("anything else is rethrown unchanged (→ 500), not disguised as a 400", () => {
    const down = new Error("Can't reach database server");
    expect(() => mapPrismaError(down)).toThrow(down);
    expect(() => mapPrismaError(known("P1001"))).toThrow(Prisma.PrismaClientKnownRequestError);
  });
});

describe("query", () => {
  test("a failing list query rejects instead of resolving to []", async () => {
    await expect(query("list things", () => Promise.reject(new Error("timeout")))).rejects.toThrow("timeout");
  });

  test("passes results through", async () => {
    await expect(query("list things", async () => [1, 2])).resolves.toEqual([1, 2]);
  });
});
