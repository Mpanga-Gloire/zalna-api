/**
 * Base application error with an associated HTTP status code.
 * All domain/service errors should extend this class so that
 * our controllers can map them to proper HTTP responses.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode = 500, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace?.(this, this.constructor);
  }
}

/**
 * Thrown when a requested resource (e.g. Hall) cannot be found.
 */
export class NotFoundError extends AppError {
  constructor(message = "Resource not found") {
    super(message, 404, true);
  }
}

/**
 * Thrown when a client sends invalid data (validation issues).
 */
export class ValidationError extends AppError {
  constructor(message = "Validation error") {
    super(message, 400, true);
  }
}

/**
 * Thrown when a resource with the same unique field already exists,
 * e.g. duplicate slug/email, etc.
 */
export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message, 409, true);
  }
}
