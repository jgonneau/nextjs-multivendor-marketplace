import { Prisma } from "@/prisma/generated/prisma";
import { NotFoundError, ValidationError } from "@/core/domain/errors";
import { logger } from "@/adapters/logging/logger";

/**
 * Turns a Prisma error into the core's errors (core/domain/errors.ts):
 * known data problems become 400/404; anything else (database down, bad
 * query, timeout…) is rethrown unchanged and ends up as a 500, never as an
 * empty result or a misleading 400.
 */
export function mapPrismaError(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      // Record needed for the update/delete doesn't exist.
      case "P2025":
        throw new NotFoundError("Resource not found.");
      // Unique constraint.
      case "P2002": {
        const fields = error.meta?.target;
        const fieldList = Array.isArray(fields) ? fields.join(", ") : fields;
        throw new ValidationError(`A record with this ${fieldList || "value"} already exists.`);
      }
      // Foreign key: points to a missing record, or is still referenced on delete.
      // The frontend matches "reference" in this message.
      case "P2003":
        throw new ValidationError(
          `Invalid reference: related "${error.meta?.field_name || "record"}" does not exist.`
        );
    }
  }
  // Data that doesn't fit the schema (wrong type, missing required field).
  if (error instanceof Prisma.PrismaClientValidationError) {
    throw new ValidationError("Invalid data for this operation.");
  }
  throw error;
}

/** Runs one repository operation, logging and mapping any error it throws. */
export async function query<T>(operation: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (error) {
    logger.error(`repository: ${operation} failed`, { error: String(error) });
    return mapPrismaError(error);
  }
}
