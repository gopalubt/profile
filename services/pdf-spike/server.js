'use strict';

const puppeteer = require('puppeteer');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

/**
 * Spike: render the local itinerary page to a PDF.
 *
 * Fixes over the first draft:
 *   - `page.waitFor(1000)` was removed in Puppeteer v10 and this package pins
 *     v24, so it threw "page.waitFor is not a function" every run. The page now
 *     signals readiness (`window.__renderComplete`) and we wait on that.
 *     An arbitrary sleep is also flaky: too short on a slow machine, wasted
 *     time on a fast one.
 *   - `headless: "new"` is no longer a valid value; `true` is the new default.
 *   - The browser is closed in `finally`, so a render failure cannot leak a
 *     Chromium process.
 *   - Every wait is bounded. An unbounded wait on a missing asset hangs forever.
 */

const TIMEOUT_MS = 30_000;
const OUTPUT_PATH = path.join(__dirname, 'output.pdf');

async function generatePdf() {
  let browser;

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    page.setDefaultTimeout(TIMEOUT_MS);

    // pathToFileURL handles Windows drive letters and spaces; `file://${path}` does not.
    const pageUrl = pathToFileURL(path.join(__dirname, 'index.html')).href;
    await page.goto(pageUrl, { waitUntil: 'networkidle0', timeout: TIMEOUT_MS });

    // index.html sets this once every component has been injected.
    await page.waitForFunction(() => window.__renderComplete === true, { timeout: TIMEOUT_MS });

    // The page reports its own failures rather than rendering a blank PDF.
    const renderError = await page.evaluate(() => window.__renderError ?? null);
    if (renderError) {
      throw new Error(`Page failed to build: ${renderError}`);
    }

    await page.pdf({
      path: OUTPUT_PATH,
      format: 'A4',
      printBackground: true,
      timeout: TIMEOUT_MS,
      margin: { top: '20mm', right: '15mm', bottom: '20mm', left: '15mm' },
    });

    console.info(`PDF generated: ${OUTPUT_PATH}`);
  } finally {
    await browser?.close().catch((error) => {
      console.warn('Failed to close the browser cleanly:', error.message);
    });
  }
}

generatePdf().catch((error) => {
  console.error('PDF generation failed:', error);
  process.exitCode = 1;
});
