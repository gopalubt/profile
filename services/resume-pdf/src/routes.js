'use strict';

const express = require('express');
const { generateResumePdf } = require('./resume.service');
const { AppError } = require('./errors');

const router = express.Router();

/**
 * GET /resume?role=frontend|backend|fullstack
 * Streams a role-tailored resume PDF as a download.
 */
router.get('/resume', async (req, res, next) => {
  try {
    const role = String(req.query.role || 'fullstack').toLowerCase();
    const { buffer, fileName } = await generateResumePdf(role); // throws AppError on bad role / capacity

    res.status(200);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
    res.setHeader('Content-Length', String(buffer.length));
    res.send(buffer);
  } catch (error) {
    next(error);
  }
});

router.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

/**
 * Central error handler. Anything that isn't an AppError is an internal
 * fault: log it in full server-side, tell the client nothing but a
 * correlation id. Same contract as itinerary-pdf.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.status).json({ code: err.status, message: err.message, details: err.details });
  }

  const errorId = require('node:crypto').randomUUID();
  console.error(`[resume-pdf] ${errorId}:`, err);
  return res.status(500).json({ code: 500, message: 'Failed to generate resume', errorId });
}

module.exports = { router, errorHandler };
