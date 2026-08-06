/**
 * An error with an HTTP status the client is allowed to see.
 * Same contract as services/*/src/errors.js: anything that isn't an
 * AppError is an internal fault - log it in full server-side, tell the
 * client nothing but a generic message and a correlation id.
 */
export class AppError extends Error {
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
  }
}

export const badRequest = (message, details) => new AppError(400, message, details);
