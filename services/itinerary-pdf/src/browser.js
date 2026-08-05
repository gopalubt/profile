'use strict';

const { config } = require('./config');

/**
 * Puppeteer lifecycle.
 *
 * Three problems in the legacy code, all fixed here:
 *   1. A browser was launched per request (~500 ms and ~150 MB each).
 *      One warm browser is reused; only the page is per-request.
 *   2. `browser.close()` was not in a `finally`, so every thrown error leaked a
 *      Chromium process. `page.close()` is now unconditional.
 *   3. `timeout: 0` meant "wait forever". One unreachable image hung the
 *      request permanently. Every wait is now bounded.
 */

let browserPromise = null;
let activeRenders = 0;

async function getBrowser() {
  if (browserPromise) return browserPromise;

  // Required lazily so the renderers and validation stay importable (and
  // testable) on a machine without Chromium downloaded.
  // eslint-disable-next-line global-require
  const puppeteer = require('puppeteer');

  const args = config.puppeteerNoSandbox
    ? ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    : ['--disable-dev-shm-usage'];

  const pending = puppeteer.launch({ headless: true, args });
  browserPromise = pending;

  let browser;
  try {
    browser = await pending;
  } catch (error) {
    // A rejected promise must not stay cached: every later call would replay
    // the same failure and the service could never recover, even once the
    // underlying problem (missing Chromium, OOM) was fixed.
    if (browserPromise === pending) browserPromise = null;
    throw error;
  }

  // If Chromium crashes later, drop the cache so the next call relaunches.
  browser.on('disconnected', () => {
    if (browserPromise === pending) browserPromise = null;
  });

  return browser;
}

/**
 * Render HTML to a PDF buffer.
 *
 * @param {string} html - a complete document. Must already be escaped.
 * @param {object} [pdfOptions] - merged over the defaults.
 * @returns {Promise<Buffer>}
 * @throws {Error} if the render exceeds config.pdfTimeoutMs.
 */
async function renderPdf(html, pdfOptions = {}) {
  if (activeRenders >= config.maxConcurrentRenders) {
    const error = new Error('PDF renderer is at capacity, retry shortly');
    error.status = 503;
    error.expose = true;
    throw error;
  }

  // The slot is claimed here and released in the outer `finally`. Acquiring the
  // browser and the page must sit inside that block: if either throws, an
  // increment without a matching decrement permanently burns a slot, and the
  // service starts answering 503 forever.
  activeRenders += 1;
  let page;

  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    page.setDefaultTimeout(config.pdfTimeoutMs);
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: config.pdfTimeoutMs });

    return await page.pdf({
      format: 'A4',
      printBackground: true,
      timeout: config.pdfTimeoutMs,
      margin: { top: '10mm', bottom: '10mm', left: '10mm', right: '10mm' },
      ...pdfOptions,
    });
  } finally {
    // Close the page, keep the browser warm for the next request.
    await page?.close().catch(() => {});
    activeRenders -= 1;
  }
}

/** Call on SIGTERM/SIGINT so Chromium does not outlive the process. */
async function closeBrowser() {
  if (!browserPromise) return;
  const browser = await browserPromise.catch(() => null);
  browserPromise = null;
  await browser?.close().catch(() => {});
}

module.exports = { renderPdf, closeBrowser, getBrowser };
