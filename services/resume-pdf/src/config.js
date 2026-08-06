'use strict';

/**
 * Configuration, resolved once at startup.
 * Fail at boot on a bad value, not mid-request - same rule as itinerary-pdf.
 */

function optional(name, fallback) {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

function integer(name, fallback) {
  const parsed = Number.parseInt(optional(name, String(fallback)), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const config = {
  port: integer('PORT', 4001),

  /** Origins allowed to call this API. Comma-separated, no wildcard in prod. */
  corsOrigins: optional('CORS_ORIGIN', 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  /** Hard ceiling on page load and PDF generation. Never use 0 (infinite). */
  pdfTimeoutMs: integer('PDF_TIMEOUT_MS', 60_000),

  /** Concurrent renders allowed. Each open page costs real memory. */
  maxConcurrentRenders: integer('PDF_MAX_CONCURRENT', 2),

  /** Required in containers running as root; drop it if you run unprivileged. */
  puppeteerNoSandbox: optional('PUPPETEER_NO_SANDBOX', 'true') === 'true',
};

module.exports = { config };
