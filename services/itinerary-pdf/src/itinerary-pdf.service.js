'use strict';

const { badRequest, notFound } = require('./errors');
const { renderItineraryDocument } = require('./renderers/document.renderer');
const { renderPdf } = require('./browser');
const { savePdf } = require('./storage');

/**
 * Itinerary PDF generation.
 *
 * This module is pure with respect to HTTP: it takes a plain object, returns a
 * plain object, and throws AppError for anything the client caused. The
 * controller owns req/res. The legacy version mixed the two - its signature
 * took `(body)` while its body still called `req.body` and `res.status`, so it
 * threw ReferenceError on the first line of real work.
 */

const ENTITY_QUERY = `
  SELECT EM.entity_name, EM.tax_registration_number, EM.registered_office, EM.logo
  FROM ENTITY_MASTER EM
  WHERE EM.id = :id AND EM.isDeleted = false AND EM.status = 'ACTIVE'
`;

/**
 * Collect map points from the payload.
 *
 * The legacy code read a `locations` variable that was never declared anywhere
 * in the file. Points are taken from an explicit list when the payload provides
 * one, otherwise from any day carrying coordinates.
 *
 * @param {object} data - templateFullRes.data
 * @returns {Array<{latitude: *, longitude: *}>}
 */
function collectLocations(data) {
  if (Array.isArray(data?.locations) && data.locations.length > 0) return data.locations;

  return (data?.days ?? [])
    .map((entry) => entry?.day)
    .filter((day) => day?.latitude !== undefined && day?.longitude !== undefined)
    .map((day) => ({ latitude: day.latitude, longitude: day.longitude }));
}

/**
 * Look up the entity that owns the template.
 *
 * @param {object} db - Sequelize instance holder ({ sequelize }).
 * @param {*} entityId
 * @returns {Promise<object>}
 * @throws {AppError} 404 when the entity is missing.
 */
async function fetchEntity(db, entityId) {
  const rows = await db.sequelize.query(ENTITY_QUERY, {
    type: db.sequelize.QueryTypes.SELECT,
    replacements: { id: entityId },
  });

  const entity = rows?.[0];
  if (!entity) {
    // The legacy code read entityDetails[0] 900 lines later with no check and
    // silently rendered a blank address.
    throw notFound(`No active entity found for id ${entityId}`);
  }

  return entity;
}

/**
 * Generate the itinerary PDF and persist it.
 *
 * @param {object} body - request payload.
 * @param {object} body.templateFullRes
 * @param {string} [body.mediaEnvironment] - base URL for media assets.
 * @param {object} deps
 * @param {object} deps.db - Sequelize holder.
 * @param {(days: Array) => Promise<void>} [deps.processApiResponse] - optional
 *   pre-processing hook, preserved from the legacy flow.
 * @returns {Promise<{fileUrl: string, fileName: string}>}
 * @throws {AppError} for any client-caused failure.
 */
async function generateItineraryPdf(body, { db, processApiResponse } = {}) {
  // --- validate before touching data or the database -----------------------
  if (!db?.sequelize) throw new Error('generateItineraryPdf requires a db dependency');

  const { mediaEnvironment: mediaBaseUrl, templateFullRes } = body ?? {};
  if (!templateFullRes) throw badRequest('templateFullRes is required');

  const templateDays = templateFullRes.data?.days;
  const templateData = templateFullRes.data?.template;

  if (!Array.isArray(templateDays) || templateDays.length === 0) {
    throw badRequest('templateFullRes.data.days must be a non-empty array');
  }
  if (!templateData) {
    throw badRequest('templateFullRes.data.template is required');
  }
  if (templateData.entity_type === undefined || templateData.entity_type === null) {
    throw badRequest('templateFullRes.data.template.entity_type is required');
  }

  // --- only now is it safe to hit the database ----------------------------
  const entity = await fetchEntity(db, templateData.entity_type);

  if (typeof processApiResponse === 'function') {
    await processApiResponse(templateDays);
  }

  const html = renderItineraryDocument({
    templateData,
    templateDays,
    allData: templateFullRes.allData ?? {},
    additionalData: templateFullRes.additionalData ?? [],
    questionsAnswers: templateFullRes.data?.questions_answers ?? {},
    locations: collectLocations(templateFullRes.data),
    entity,
    mediaBaseUrl,
  });

  const pdfBuffer = await renderPdf(html);
  const { fileUrl, fileName } = await savePdf(pdfBuffer, templateData.title);

  return { fileUrl, fileName };
}

module.exports = { generateItineraryPdf, collectLocations, ENTITY_QUERY };
