import { ZodType } from "zod";
import { ValidationError } from "@/core/domain/errors";

/**
 * Parses `data` against `schema`, throwing a ValidationError (mapped to a
 * 400 response by handleApiError) on failure instead of letting malformed
 * input reach the service/repository layers.
 */
export function parseOrThrow<T>(schema: ZodType<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".") || "value"}: ${issue.message}`)
      .join("; ");
    throw new ValidationError(message);
  }
  return result.data;
}
