'use strict';

const path = require('node:path');
const resumeData = require('./data/resume.json');
const { filterResumeByRole } = require('./resume-filter');
const { renderResumeHtml } = require('./renderers/resume.renderer');
const { renderPdf } = require('./browser');

/**
 * Generate a role-tailored resume PDF.
 * No disk storage here, deliberately: this is a direct download, not a
 * shareable link like itinerary-pdf's output - stream the buffer straight
 * back to the caller.
 *
 * @param {'frontend'|'backend'|'fullstack'} role
 * @returns {Promise<{ buffer: Buffer, fileName: string }>}
 * @throws {AppError} 400 for an unknown role, 503 at capacity.
 */
async function generateResumePdf(role) {
  const filtered = filterResumeByRole(resumeData, role); // throws AppError(400) on an unknown role
  const html = renderResumeHtml(filtered);
  const buffer = await renderPdf(html);

  const safeName = String(resumeData.name || 'resume').replace(/[^a-zA-Z0-9-_]+/g, '_');
  const fileName = `${safeName}_${role}_resume.pdf`;

  return { buffer, fileName };
}

module.exports = { generateResumePdf, resumeDataPath: path.join(__dirname, 'data', 'resume.json') };
