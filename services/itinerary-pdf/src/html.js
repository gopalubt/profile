'use strict';

/**
 * HTML escaping helpers.
 *
 * Every value that reaches the PDF template comes from the database or the
 * request body, so it is untrusted. Interpolating it raw lets a trip title
 * containing markup break the layout or execute script inside the rendering
 * browser. Escape at the boundary, always.
 */

const ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const ESCAPE_PATTERN = /[&<>"']/g;

/**
 * Escape a value for use in HTML text or an attribute.
 * Replaces the legacy `handleNull` helper, which did not escape.
 *
 * @param {*} value
 * @param {string} [fallback] - used when the value is empty or the string "null".
 * @returns {string}
 */
function esc(value, fallback = 'NA') {
  if (value === null || value === undefined) return escapeRaw(fallback);
  const text = String(value).trim();
  if (text === '' || text === 'null' || text === 'undefined') return escapeRaw(fallback);
  return escapeRaw(text);
}

/** Escape without the empty-value fallback. */
function escapeRaw(value) {
  return String(value).replace(ESCAPE_PATTERN, (character) => ESCAPE_MAP[character]);
}

/**
 * Build a URL for a media asset.
 * Escaped, and restricted to http/https so `javascript:` can never land in src.
 *
 * @param {string} baseUrl - media environment root.
 * @param {string} assetPath
 * @param {string} fallbackUrl - used when the asset path is missing or unsafe.
 * @returns {string}
 */
function mediaUrl(baseUrl, assetPath, fallbackUrl) {
  if (!assetPath || !baseUrl) return escapeRaw(fallbackUrl);

  try {
    const url = new URL(String(assetPath), `${String(baseUrl).replace(/\/+$/, '')}/`);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return escapeRaw(fallbackUrl);
    return escapeRaw(url.href);
  } catch {
    return escapeRaw(fallbackUrl);
  }
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

module.exports = { esc, escapeRaw, mediaUrl, mapHtml };
