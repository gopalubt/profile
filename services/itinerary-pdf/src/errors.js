'use strict';

/**
 * An error with an HTTP status the client is allowed to see.
 *
 * Anything that is NOT an AppError is treated as an internal fault: it is
 * logged in full and reported to the client as a generic 500 with a
 * correlation id. That keeps SQL text, stack traces, and driver internals off
 * the wire.
 */
class AppError extends Error {
  /**
   * @param {number} status - HTTP status code.
   * @param {string} message - safe to show the client.
   * @param {object} [details] - optional structured context, also client-safe.
   */
  constructor(status, message, details = undefined) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.details = details;
    this.expose = true;
    Error.captureStackTrace?.(this, AppError);
  }
}

const badRequest = (message, details) => new AppError(400, message, details);
const notFound = (message, details) => new AppError(404, message, details);

module.exports = { AppError, badRequest, notFound };
