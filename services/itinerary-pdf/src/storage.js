'use strict';

const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { config } = require('./config');

/**
 * PDF file storage.
 *
 * The legacy filename was `${templateData?.title}_template.pdf`, unsanitised.
 * A title of `../../config/.env` wrote outside the upload directory, and two
 * concurrent requests with the same title overwrote each other mid-write.
 */

const MAX_SLUG_LENGTH = 60;

/**
 * Reduce arbitrary text to a filesystem-safe slug.
 * @param {*} value
 * @returns {string} never empty
 */
function toSlug(value) {
  const slug = String(value ?? '')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_SLUG_LENGTH);

  return slug === '' ? 'template' : slug;
}

/**
 * Write a PDF and return its public URL.
 *
 * @param {Buffer} pdfBuffer
 * @param {string} title - untrusted; slugged before use.
 * @returns {Promise<{fileName: string, filePath: string, fileUrl: string}>}
 * @throws {Error} if the resolved path escapes the upload directory.
 */
async function savePdf(pdfBuffer, title) {
  // The UUID also removes the collision between concurrent same-title requests.
  const fileName = `${toSlug(title)}_${randomUUID()}.pdf`;
  const filePath = path.resolve(config.uploadDir, fileName);

  // Defence in depth: the slug already strips separators, but verify anyway.
  if (!filePath.startsWith(config.uploadDir + path.sep)) {
    throw new Error(`Refusing to write outside the upload directory: ${filePath}`);
  }

  // recursive:true is idempotent, so no existsSync check is needed.
  await fs.mkdir(config.uploadDir, { recursive: true });
  await fs.writeFile(filePath, pdfBuffer);

  return {
    fileName,
    filePath,
    fileUrl: `${config.publicUploadPath.replace(/\/+$/, '')}/${fileName}`,
  };
}

module.exports = { savePdf, toSlug };
