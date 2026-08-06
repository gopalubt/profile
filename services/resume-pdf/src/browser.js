'use strict';

const { config } = require('./config');
const { AppError } = require('./errors');

/**
 * Puppeteer lifecycle - identical pattern to services/itinerary-pdf/src/browser.js:
 *   - One warm browser reused across requests (a launch costs ~500ms/~150MB).
 *   - page.close() is unconditional (finally), so a throw never leaks Chromium.
 *   - Every wait is bounded; nothing ever waits forever.
 *   - A rejected launch is not cached, so the service can recover once the
 *     underlying problem (missing Chromium, OOM) is fixed, instead of
 *     replaying the same failure on every subsequent call.
 */

let browserPromise = null;
let activeRenders = 0;

async function getBrowser() {
  if (browserPromise) return browserPromise;

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
    if (browserPromise === pending) browserPromise = null;
    throw error;
  }

  browser.on('disconnected', () => {
    if (browserPromise === pending) browserPromise = null;
  });

  return browser;
}

/**
 * Render HTML to a PDF buffer.
 * @param {string} html - a complete document. Must already be escaped.
 * @param {object} [pdfOptions] - merged over the defaults.
 * @returns {Promise<Buffer>}
 */
async function renderPdf(html, pdfOptions = {}) {
  if (activeRenders >= config.maxConcurrentRenders) {
    throw new AppError(503, 'Resume renderer is at capacity, retry shortly');
  }

  // Slot claimed here, released in the outer finally - acquiring the browser
  // and page must be inside this block, or a throw before the increment
  // leaves a slot permanently burned.
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
      margin: { top: '12mm', bottom: '12mm', left: '14mm', right: '14mm' },
      ...pdfOptions,
    });
  } finally {
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

module.exports = { renderPdf, closeBrowser };
