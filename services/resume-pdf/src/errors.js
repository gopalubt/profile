'use strict';

/**
 * An error with an HTTP status the client is allowed to see.
 * Anything that is NOT an AppError is treated as an internal fault: logged in
 * full, reported to the client as a generic 500 with a correlation id.
 * (Same contract as services/itinerary-pdf/src/errors.js.)
 */
class AppError extends Error {
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
