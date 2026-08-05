'use strict';

const { escapeRaw } = require('../html');
const { config } = require('../config');

/**
 * Google Static Maps URL builder.
 *
 * The legacy code hardcoded the API key in source (see README - that key should
 * be treated as compromised and rotated) and read a `locations` variable that
 * was never defined anywhere in the file. Locations are now an explicit
 * argument and the key comes from the environment.
 */

const MAP_SIZE = '600x300';
const ZOOM_SINGLE_POINT = 4;
const ZOOM_SPREAD = 2;
const MARKER_COLOUR = '0x047dc9';

/**
 * @param {*} value
 * @returns {number|null} a finite number, or null.
 */
function toCoordinate(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Keep only entries with usable coordinates.
 * @param {Array<{latitude: *, longitude: *}>} locations
 * @returns {Array<{latitude: number, longitude: number}>}
 */
function normaliseLocations(locations) {
  if (!Array.isArray(locations)) return [];

  return locations.reduce((valid, location) => {
    const latitude = toCoordinate(location?.latitude);
    const longitude = toCoordinate(location?.longitude);
    if (latitude !== null && longitude !== null) valid.push({ latitude, longitude });
    return valid;
  }, []);
}

/**
 * Build the static map image URL.
 *
 * @param {Array} rawLocations
 * @returns {string|null} null when there is nothing to plot or no API key,
 *   so the caller can omit the map block rather than render a broken image.
 */
function buildStaticMapUrl(rawLocations) {
  if (!config.googleMapsApiKey) return null;

  const locations = normaliseLocations(rawLocations);
  if (locations.length === 0) return null;

  const first = locations[0];
  const allSamePoint = locations.every(
    (location) => location.latitude === first.latitude && location.longitude === first.longitude,
  );

  const parameters = new URLSearchParams({ size: MAP_SIZE, key: config.googleMapsApiKey });

  if (allSamePoint) {
    // A single point needs an explicit centre and zoom; bounds would be degenerate.
    parameters.set('zoom', String(ZOOM_SINGLE_POINT));
    parameters.set('center', `${first.latitude},${first.longitude}`);
  } else {
    parameters.set('zoom', String(ZOOM_SPREAD));
  }

  // Markers and path repeat their keys, so they are appended rather than set.
  locations.forEach((location, index) => {
    parameters.append(
      'markers',
      `color:${MARKER_COLOUR}|label:${index + 1}|${location.latitude},${location.longitude}`,
    );
  });

  parameters.append(
    'path',
    `color:${MARKER_COLOUR}|weight:4|${locations
      .map((location) => `${location.latitude},${location.longitude}`)
      .join('|')}`,
  );

  return `https://maps.googleapis.com/maps/api/staticmap?${parameters.toString()}`;
}

/**
 * The map block, or '' when there is nothing to show.
 * @param {Array} rawLocations
 */
function renderMap(rawLocations) {
  const url = buildStaticMapUrl(rawLocations);
  if (!url) return '';

  return (
    '<div style="text-align: center; margin: 20px 0;">' +
      `<img src="${escapeRaw(url)}" alt="Trip route map" style="max-width: 100%; border-radius: 10px;">` +
    '</div>'
  );
}

module.exports = { renderMap, buildStaticMapUrl, normaliseLocations };
