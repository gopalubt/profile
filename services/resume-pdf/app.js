'use strict';

const express = require('express');
const cors = require('cors');
const { config } = require('./src/config');
const { router, errorHandler } = require('./src/routes');
const { closeBrowser } = require('./src/browser');

const app = express();

app.use(
  cors({
    origin: config.corsOrigins.length ? config.corsOrigins : false,
  }),
);

app.use('/', router);
app.use(errorHandler);

const server = app.listen(config.port, () => {
  console.log(`[resume-pdf] listening on :${config.port}`);
});

/** Don't let Chromium (or the HTTP server) outlive the process. */
async function shutdown(signal) {
  console.log(`[resume-pdf] ${signal} received, shutting down`);
  server.close();
  await closeBrowser();
  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

module.exports = app;
