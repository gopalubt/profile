'use strict';

const { randomUUID } = require('node:crypto');
const { generateItineraryPdf } = require('./itinerary-pdf.service');

/**
 * HTTP layer. Owns req/res; contains no business logic.
 */

/**
 * Build the controller with its dependencies injected, so tests can pass a stub
 * db instead of reaching for a module-level global.
 *
 * @param {object} deps
 * @param {object} deps.db
 * @param {Function} [deps.processApiResponse]
 * @param {{error: Function}} [deps.logger]
 */
function createItineraryPdfController({ db, processApiResponse, logger = console }) {
  return async function generateTemplatePdf(req, res) {
    try {
      const result = await generateItineraryPdf(req.body, { db, processApiResponse });

      return res.status(201).json({
        code: 201,
        message: 'PDF generated successfully',
        data: result,
      });
    } catch (error) {
      // Client-caused failures carry a safe status and message.
      if (error?.expose && error?.status) {
        return res.status(error.status).json({
          code: error.status,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        });
      }

      // Anything else is ours. Log it in full; return only a correlation id.
      // The legacy handler serialised the raw error, exposing SQL text and
      // table names to the caller.
      const errorId = randomUUID();
      logger.error('Itinerary PDF generation failed', { errorId, error });

      return res.status(500).json({
        code: 500,
        message: 'Failed to generate the itinerary PDF',
        errorId,
      });
    }
  };
}

module.exports = { createItineraryPdfController };
