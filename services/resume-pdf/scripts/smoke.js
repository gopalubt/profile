'use strict';

/**
 * Dependency-free smoke test for the parts that do not need Chromium.
 * Covers escaping, role filtering (including the unknown-role guard), and
 * the renderer producing escaped, complete output. Run with:
 *   node scripts/smoke.js
 */

const assert = require('node:assert/strict');

const { esc, mapHtml } = require('../src/html');
const { filterResumeByRole, VALID_ROLES } = require('../src/resume-filter');
const { renderResumeHtml } = require('../src/renderers/resume.renderer');

const checks = [];
const check = (name, fn) => checks.push([name, fn]);

const SAMPLE_RESUME = {
  name: 'Test Person',
  title: 'Engineer',
  contact: { email: 'a@b.com', phone: '000', location: 'Earth', links: [] },
  summary: { frontend: 'FE summary', backend: 'BE summary', fullstack: 'FS summary' },
  skills: [
    { name: 'Angular', roles: ['frontend'] },
    { name: 'Node.js', roles: ['backend'] },
    { name: 'Git', roles: ['frontend', 'backend'] },
  ],
  experience: [
    {
      company: 'Acme',
      role: 'Engineer',
      period: '2020-2024',
      bullets: [
        { text: 'Built UI', roles: ['frontend'] },
        { text: 'Built API', roles: ['backend'] },
      ],
    },
  ],
  projects: [{ name: 'Proj A', description: 'A thing', roles: ['frontend'] }],
  education: [{ school: 'U', degree: 'B.Sc', period: '2016-2020' }],
};

// ---------------------------------------------------------------- escaping

check('esc neutralises script injection', () => {
  const output = esc('<img src=x onerror="alert(1)">');
  assert.ok(!output.includes('<img'));
  assert.equal(output, '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

check('esc falls back on empty/null/"null"', () => {
  assert.equal(esc(null, 'NA'), 'NA');
  assert.equal(esc('', 'NA'), 'NA');
  assert.equal(esc('null', 'NA'), 'NA');
});

check('mapHtml returns the empty-case fallback for a non-array', () => {
  assert.equal(mapHtml(undefined, (x) => x, 'EMPTY'), 'EMPTY');
  assert.equal(mapHtml([], (x) => x, 'EMPTY'), 'EMPTY');
});

// -------------------------------------------------------------- role filter

check('filterResumeByRole rejects an unknown role', () => {
  assert.throws(
    () => filterResumeByRole(SAMPLE_RESUME, 'manager'),
    (error) => {
      assert.equal(error.status, 400);
      assert.ok(error.message.includes('manager'));
      return true;
    },
  );
});

check('filterResumeByRole("frontend") includes shared and frontend-only, excludes backend-only', () => {
  const result = filterResumeByRole(SAMPLE_RESUME, 'frontend');
  assert.deepEqual(result.skills, ['Angular', 'Git']);
  assert.deepEqual(result.experience[0].bullets, ['Built UI']);
  assert.equal(result.summary, 'FE summary');
});

check('filterResumeByRole("backend") includes shared and backend-only, excludes frontend-only', () => {
  const result = filterResumeByRole(SAMPLE_RESUME, 'backend');
  assert.deepEqual(result.skills, ['Node.js', 'Git']);
  assert.deepEqual(result.experience[0].bullets, ['Built API']);
});

check('filterResumeByRole("fullstack") includes everything tagged', () => {
  const result = filterResumeByRole(SAMPLE_RESUME, 'fullstack');
  assert.deepEqual(result.skills, ['Angular', 'Node.js', 'Git']);
  assert.deepEqual(result.experience[0].bullets, ['Built UI', 'Built API']);
});

check('VALID_ROLES matches the three supported dropdown values', () => {
  assert.deepEqual(VALID_ROLES, ['frontend', 'backend', 'fullstack']);
});

// ----------------------------------------------------------------- renderer

check('renderResumeHtml escapes hostile data end to end', () => {
  const hostile = '<script>alert("xss")</script>';
  const filtered = filterResumeByRole(
    { ...SAMPLE_RESUME, name: hostile, summary: { ...SAMPLE_RESUME.summary, fullstack: hostile } },
    'fullstack',
  );
  const html = renderResumeHtml(filtered);

  assert.ok(!html.includes('<script>alert'), 'raw script tag reached the document');
  assert.ok(html.includes('&lt;script&gt;'), 'expected escaped output');
  assert.ok(html.startsWith('<!DOCTYPE html>'), 'not a complete document');
});

check('renderResumeHtml survives an empty (but valid) resume', () => {
  const empty = filterResumeByRole(
    { name: 'X', title: 'Y', contact: {}, summary: { fullstack: '' }, skills: [], experience: [], projects: [], education: [] },
    'fullstack',
  );
  const html = renderResumeHtml(empty);
  assert.ok(html.includes('<!DOCTYPE html>'));
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
