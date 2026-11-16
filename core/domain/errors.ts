/**
 * Errors the core raises. They describe what went wrong in business terms;
 * they know nothing about HTTP. The HTTP adapter (adapters/http/responses.ts)
 * decides which status code each one becomes.
 */
export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DomainError";
  }
}

/** The thing asked for doesn't exist. */
export class NotFoundError extends DomainError {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

/** The caller isn't allowed to do this (wrong owner, bad credentials, …). */
export class PermissionError extends DomainError {
  constructor(message: string = "Permission denied") {
    super(message);
    this.name = "PermissionError";
  }
}

/** The request breaks a business rule or a data constraint. */
export class ValidationError extends DomainError {
  constructor(message: string = "Validation failed") {
    super(message);
    this.name = "ValidationError";
  }
}
