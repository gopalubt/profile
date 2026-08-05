'use strict';

const path = require('node:path');

/**
 * Configuration, resolved once at startup.
 *
 * The legacy code hardcoded a Google Maps API key in source and derived the
 * upload directory with `path.join(__dirname, "../../../../uploaded_files/")`.
 * Both are now environment-driven: the key is a secret, and the path broke the
 * moment the file moved.
 */

/** @throws {Error} if a required variable is missing - fail at boot, not mid-request. */
function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value.trim();
}

function optional(name, fallback) {
  const value = process.env[name];
  return value && value.trim() !== '' ? value.trim() : fallback;
}

function integer(name, fallback) {
  const parsed = Number.parseInt(optional(name, String(fallback)), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

const config = {
  /** Directory PDFs are written to. Resolved to an absolute path once. */
  uploadDir: path.resolve(optional('UPLOAD_DIR', path.join(process.cwd(), 'uploaded_files'))),

  /** Public URL prefix that maps to uploadDir. */
  publicUploadPath: optional('PUBLIC_UPLOAD_PATH', '/uploaded_files'),

  /** Google Static Maps key. Secret - never commit a real value. */
  googleMapsApiKey: optional('GOOGLE_MAPS_API_KEY', ''),

  /** Hard ceiling on page load and PDF generation. Never use 0 (infinite). */
  pdfTimeoutMs: integer('PDF_TIMEOUT_MS', 60_000),

  /** Concurrent renders allowed. Each open page costs real memory. */
  maxConcurrentRenders: integer('PDF_MAX_CONCURRENT', 3),

  /** Required in containers running as root; drop it if you run unprivileged. */
  puppeteerNoSandbox: optional('PUPPETEER_NO_SANDBOX', 'true') === 'true',

  placeholderImageUrl: optional(
    'PLACEHOLDER_IMAGE_URL',
    'https://upload.wikimedia.org/wikipedia/commons/6/65/No-Image-Placeholder.svg',
  ),
};

module.exports = { config, required, optional };
