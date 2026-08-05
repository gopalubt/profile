'use strict';

const express = require('express');
const { createItineraryPdfController } = require('./itinerary-pdf.controller');

/**
 * Wire the controller onto a router.
 *
 * @param {object} deps - passed through to the controller.
 * @returns {import('express').Router}
 */
function createItineraryPdfRouter(deps) {
  const router = express.Router();
  router.post('/templates/pdf', createItineraryPdfController(deps));
  return router;
}

module.exports = { createItineraryPdfRouter };
