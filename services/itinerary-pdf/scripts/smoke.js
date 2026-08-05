'use strict';

/**
 * Dependency-free smoke test for the parts that do not need Chromium or a DB.
 *
 * Covers the fixes that matter most: HTML escaping, filename sanitising, map
 * URL construction, and the validation guards. Run with:  node scripts/smoke.js
 */

const assert = require('node:assert/strict');
const path = require('node:path');

process.env.GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY || 'test-key';
process.env.UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(__dirname, '../.tmp-uploads');

const { esc, mediaUrl } = require('../src/html');
const { toSlug } = require('../src/storage');
const { buildStaticMapUrl, normaliseLocations } = require('../src/renderers/map.renderer');
const { renderItineraryDocument } = require('../src/renderers/document.renderer');
const { collectLocations } = require('../src/itinerary-pdf.service');

const checks = [];
const check = (name, fn) => checks.push([name, fn]);

// ---------------------------------------------------------------- escaping

check('esc neutralises script injection', () => {
  const payload = '<img src=x onerror="alert(1)">';
  const output = esc(payload);
  assert.ok(!output.includes('<img'), 'tag was not escaped');
  assert.ok(!output.includes('onerror="'), 'attribute was not escaped');
  assert.equal(output, '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

check('esc escapes quotes so it is attribute-safe', () => {
  assert.equal(esc(`" onload="evil()`), '&quot; onload=&quot;evil()');
});

check('esc falls back for empty, null, and the string "null"', () => {
  assert.equal(esc(null), 'NA');
  assert.equal(esc(undefined), 'NA');
  assert.equal(esc(''), 'NA');
  assert.equal(esc('   '), 'NA');
  assert.equal(esc('null'), 'NA');
  assert.equal(esc('', ''), '');
});

check('esc preserves ordinary text and ampersands', () => {
  assert.equal(esc('Food & Beverage'), 'Food &amp; Beverage');
});

// --------------------------------------------------------------- media URLs

check('mediaUrl rejects javascript: and falls back', () => {
  assert.equal(mediaUrl('https://cdn.example.com', 'javascript:alert(1)', 'FALLBACK'), 'FALLBACK');
});

check('mediaUrl builds a normal asset URL', () => {
  assert.equal(
    mediaUrl('https://cdn.example.com/media/', 'trips/day1.jpg', 'FALLBACK'),
    'https://cdn.example.com/media/trips/day1.jpg',
  );
});

check('mediaUrl falls back on a missing path', () => {
  assert.equal(mediaUrl('https://cdn.example.com', '', 'FALLBACK'), 'FALLBACK');
  assert.equal(mediaUrl('', 'a.jpg', 'FALLBACK'), 'FALLBACK');
});

// ---------------------------------------------------------------- filenames

check('toSlug blocks path traversal', () => {
  assert.equal(toSlug('../../config/.env'), 'config_env');
  assert.ok(!toSlug('../../etc/passwd').includes('/'));
  assert.ok(!toSlug('..\\..\\windows').includes('\\'));
});

check('toSlug never returns an empty name', () => {
  assert.equal(toSlug(''), 'template');
  assert.equal(toSlug(null), 'template');
  assert.equal(toSlug('///'), 'template');
});

check('toSlug caps length', () => {
  assert.ok(toSlug('x'.repeat(500)).length <= 60);
});

// --------------------------------------------------------------------- map

check('normaliseLocations drops unusable coordinates', () => {
  const input = [
    { latitude: 12.9, longitude: 77.5 },
    { latitude: 'abc', longitude: 77.5 },
    { latitude: null, longitude: null },
    {},
  ];
  assert.equal(normaliseLocations(input).length, 1);
  assert.deepEqual(normaliseLocations(undefined), []);
});

check('buildStaticMapUrl centres a single point and omits centre for a spread', () => {
  const single = buildStaticMapUrl([{ latitude: 12.9, longitude: 77.5 }]);
  assert.ok(single.includes('center=12.9%2C77.5'), single);
  assert.ok(single.includes('zoom=4'), single);

  const spread = buildStaticMapUrl([
    { latitude: 12.9, longitude: 77.5 },
    { latitude: 19.0, longitude: 72.8 },
  ]);
  assert.ok(!spread.includes('center='), spread);
  assert.ok(spread.includes('zoom=2'), spread);
});

check('buildStaticMapUrl returns null when there is nothing to plot', () => {
  assert.equal(buildStaticMapUrl([]), null);
  assert.equal(buildStaticMapUrl(null), null);
});

check('collectLocations prefers an explicit list, else derives from days', () => {
  assert.deepEqual(
    collectLocations({ locations: [{ latitude: 1, longitude: 2 }] }),
    [{ latitude: 1, longitude: 2 }],
  );
  assert.deepEqual(
    collectLocations({ days: [{ day: { latitude: 3, longitude: 4 } }, { day: {} }] }),
    [{ latitude: 3, longitude: 4 }],
  );
  assert.deepEqual(collectLocations({}), []);
});

// ---------------------------------------------------------------- document

check('renderItineraryDocument escapes hostile data end to end', () => {
  const hostile = '<script>alert("xss")</script>';

  const html = renderItineraryDocument({
    templateData: { title: hostile, description: hostile, entity_type: 1 },
    templateDays: [
      {
        day: { title: hostile, location: hostile, description: hostile, images: ['a.jpg'] },
        activities: [{ activity_title: hostile, activity_location: hostile }],
        fnbs: [],
        transports: [],
        accommodations: [],
        services: [],
        counts: { activities: 1 },
      },
    ],
    allData: { includes: [{ title: hostile }], selfpay: [], excludes: [] },
    additionalData: [],
    questionsAnswers: { 'Payment Conditions': hostile },
    locations: [],
    entity: { registered_office: hostile },
    mediaBaseUrl: 'https://cdn.example.com',
  });

  assert.ok(!html.includes('<script>alert'), 'raw script tag reached the document');
  assert.ok(html.includes('&lt;script&gt;'), 'expected escaped output');
  assert.ok(html.startsWith('<!doctype html>'), 'not a complete document');
  assert.ok(html.includes('Day 1'), 'day page missing');
});

check('renderItineraryDocument survives sparse data', () => {
  const html = renderItineraryDocument({
    templateData: {},
    templateDays: [{ day: {} }],
    allData: {},
    additionalData: [],
    questionsAnswers: {},
    locations: [],
    entity: {},
    mediaBaseUrl: '',
  });
  assert.ok(html.includes('<!doctype html>'));
  assert.ok(html.includes('NA'), 'expected fallbacks for missing values');
});

// -------------------------------------------------------------- validation

check('service validates before touching the database', async () => {
  const { generateItineraryPdf } = require('../src/itinerary-pdf.service');

  const db = {
    sequelize: {
      QueryTypes: { SELECT: 'SELECT' },
      query: () => {
        throw new Error('database must not be reached during validation');
      },
    },
  };

  const cases = [
    [undefined, 'templateFullRes is required'],
    [{ templateFullRes: {} }, 'days must be a non-empty array'],
    [{ templateFullRes: { data: { days: [] } } }, 'days must be a non-empty array'],
    [{ templateFullRes: { data: { days: [{}] } } }, 'template is required'],
    [{ templateFullRes: { data: { days: [{}], template: {} } } }, 'entity_type is required'],
  ];

  for (const [body, expected] of cases) {
    await assert.rejects(
      () => generateItineraryPdf(body, { db }),
      (error) => {
        assert.equal(error.status, 400, `expected 400 for ${JSON.stringify(body)}`);
        assert.ok(error.message.includes(expected), `got "${error.message}"`);
        return true;
      },
    );
  }
});

// ------------------------------------------------------------------- runner

(async () => {
  let failed = 0;

  for (const [name, fn] of checks) {
    try {
      await fn();
      console.log(`  PASS  ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`  FAIL  ${name}\n        ${error.message}`);
    }
  }

  console.log(`\n${checks.length - failed}/${checks.length} passed`);
  process.exit(failed === 0 ? 0 : 1);
})();
