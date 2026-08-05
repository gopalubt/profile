# @gsr/itinerary-pdf

Generates a travel itinerary PDF from template data using Puppeteer.

This is a rewrite of `bb-index.js`, a 1007-line single function that could not
run. The original is kept at `legacy-bb-index.js.bak` so the rendered output can
be diffed against it.

---

## ⚠️ Rotate the Google Maps API key

The legacy file contained a live Google Static Maps key in source:

```js
const googleMapsApiKey = "AIzaSyBUyLfX9G0r7zOBN1xAKd2RgKUTU8v_0-g";
```

**In this repo you got lucky:** `bb-index.js` was never committed, so the key is
not in git history here. `legacy-bb-index.js.bak` still holds it on disk, and
`.gitignore` now excludes `*.bak` so it stays out.

That is not the whole story. The file was copied from the Blueberry ERP project,
where the key almost certainly *is* committed, and it has been sitting in
plaintext on at least two machines. **Check that repo's history, and rotate the
key regardless.**

When issuing the replacement, restrict it: Static Maps API only, with an HTTP
referrer or IP allow-list.

---

## Setup

```bash
cp .env.example .env      # then fill in GOOGLE_MAPS_API_KEY
npm install
npm run smoke             # 17 checks, no Chromium or DB needed
```

## Wiring it into an Express app

The controller takes its dependencies as arguments, so nothing reaches for a
module-level global and tests can pass a stub.

```js
const express = require('express');
const db = require('./models');
const { createItineraryPdfRouter } = require('@gsr/itinerary-pdf/src/routes');
const { closeBrowser } = require('@gsr/itinerary-pdf/src/browser');

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use('/api', createItineraryPdfRouter({ db, processApiResponse }));

// Chromium must not outlive the process.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, async () => {
    await closeBrowser();
    process.exit(0);
  });
}
```

`POST /api/templates/pdf` responds `201` with:

```json
{ "code": 201, "message": "PDF generated successfully",
  "data": { "fileUrl": "/uploaded_files/paris_trip_<uuid>.pdf", "fileName": "..." } }
```

## Layout

| File | Responsibility |
|---|---|
| `src/routes.js` | Router wiring |
| `src/itinerary-pdf.controller.js` | HTTP only — owns `req`/`res`, maps errors to status codes |
| `src/itinerary-pdf.service.js` | Validation, entity lookup, orchestration. No `req`/`res`. |
| `src/renderers/document.renderer.js` | Assembles the full HTML document |
| `src/renderers/day.renderer.js` | Day pages and the day index |
| `src/renderers/map.renderer.js` | Google Static Maps URL |
| `src/renderers/styles.js` | Shared inline styles |
| `src/html.js` | `esc()` — escaping at the boundary |
| `src/browser.js` | Puppeteer lifecycle, concurrency limit |
| `src/storage.js` | Filename sanitising and async writes |
| `src/config.js` | Environment config, validated at boot |
| `src/errors.js` | `AppError` — what the client is allowed to see |

## What changed and why

| Legacy | Problem | Now |
|---|---|---|
| `async (body) => { ... req.body ... res.status() }` | `req`/`res` undefined — `ReferenceError` on line 5 | Controller owns `req`/`res`; service takes a plain object |
| `locations` read at line 549 | Never declared anywhere in the file | `collectLocations()` derives them from the payload |
| ~40 raw `${}` interpolations | HTML/script injection into an unsandboxed Chromium | Every value through `esc()` |
| `handleNull()` | Substituted `"NA"` but did not escape | Replaced by `esc()`, which does both |
| `templateData.entity_type` before the null check | `TypeError` on malformed payloads | Guards run first, then derefs, then the DB |
| SQL query before validation | Wasted round trip, `id` could be `undefined` | Validation precedes the query |
| `entityDetails[0]` used 900 lines later, unchecked | Silently rendered a blank address | `404` when the entity is missing |
| `templateDays.forEach(async ...)` with `+=` | Promise ignored; any `await` would append too late | `.map().join('')` |
| `browser.close()` outside `finally` | Leaked ~150 MB Chromium per failure | One warm browser; `page.close()` in `finally` |
| `timeout: 0` | One unreachable image hung the request forever | Bounded by `PDF_TIMEOUT_MS` |
| `puppeteer.launch()` per request | ~500 ms and ~150 MB each; unbounded concurrency | Singleton browser + `PDF_MAX_CONCURRENT` |
| `${title}_template.pdf` | Path traversal; concurrent same-title overwrite | `toSlug()` + UUID + containment check |
| `path.join(__dirname, "../../../../uploaded_files/")` | Broke whenever the file moved | `UPLOAD_DIR` |
| `fs.existsSync` / `mkdirSync` / `writeFileSync` | Blocked the event loop | `fs/promises` |
| `res.status(500).send({ error })` | Leaked SQL text and table names | Generic message + `errorId`; full detail logged |
| Hardcoded Maps API key | Secret in source control | `GOOGLE_MAPS_API_KEY` |
| `uploadFile`, `templateEnv` | Dead variables | Removed |

## Known follow-ups

- **Visual diff against the legacy output.** The five day sections (activities,
  F&B, transport, stays, services) were near-identical markup repeated five
  times; they are now one data-driven renderer. Same fields, same styles, but
  generate a PDF from both and compare before shipping to clients.
- **`additional_details` is rendered unescaped** — it is CMS rich text. This is
  the single deliberate exception, marked in `document.renderer.js`. If that
  field ever becomes customer-editable, put `sanitize-html` in front of it.
- **Synchronous generation.** A 60 s request will be cut off by most load
  balancers. If p99 approaches ~10 s, move to a job queue and poll for status.
- **`processApiResponse`** is passed through untouched — it lives in the parent
  project and was never defined in the legacy file either.
