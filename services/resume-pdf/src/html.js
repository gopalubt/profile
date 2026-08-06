'use strict';

/**
 * HTML escaping helpers. Same contract as services/itinerary-pdf/src/html.js -
 * duplicated rather than shared, deliberately: two small PDF services each
 * owning a 5-line utility is simpler than introducing a shared package for
 * one function. Extract to packages/pdf-utils if a third service needs it.
 */

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const ESCAPE_PATTERN = /[&<>"']/g;

function escapeRaw(value) {
  return String(value).replace(ESCAPE_PATTERN, (character) => ESCAPE_MAP[character]);
}

/**
 * Escape a value for use in HTML text or an attribute.
 * @param {*} value
 * @param {string} [fallback] - used when the value is empty/null/undefined.
 */
function esc(value, fallback = '') {
  if (value === null || value === undefined) return escapeRaw(fallback);
  const text = String(value).trim();
  if (text === '' || text === 'null' || text === 'undefined') return escapeRaw(fallback);
  return escapeRaw(text);
}

/**
 * Render a list, or a placeholder when it is empty.
 * @param {Array} items
 * @param {(item: *, index: number) => string} render
 * @param {string} [emptyHtml]
 */
function mapHtml(items, render, emptyHtml = '') {
  if (!Array.isArray(items) || items.length === 0) return emptyHtml;
  return items.map(render).join('');
}

module.exports = { esc, escapeRaw, mapHtml };
