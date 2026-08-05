# Code Review — `profile` repo

**Reviewer perspective:** Senior engineer / production-readiness
**Date:** 2026-08-03
**Scope:** everything except `puppet-pdf/node_modules`

---

## 1. What's actually in this repo

The repo is presented as a portfolio site, but it contains **three unrelated projects** in one flat folder:

| Area | Files | What it is |
|---|---|---|
| **A. Portfolio site** | `index.html`, `app.html`, `app.js`, `gpapp/gpapp.js`, `assets/js/main.js`, `components/`, `public/`, `assets/` | A hand-rolled mini frontend framework (`GpApp`) + a static resume site |
| **B. Blueberry PDF controller** | `bb-index.js` (1007 LOC), `bb-index.html`, `styles.css` | An Express + Sequelize + Puppeteer PDF endpoint copy-pasted out of a backend project |
| **C. Puppeteer spike** | `puppet-pdf/` | A second, separate PDF experiment with `node_modules` sitting on disk |

**This is the single biggest issue.** A backend controller with live SQL and a Puppeteer spike do not belong in a public GitHub Pages portfolio repo. It hurts deployability, reviewability, and (see §3) potentially leaks internal schema.

**Fix:** split into three repos, or at minimum a monorepo with `apps/portfolio`, `packages/gpapp`, `services/pdf`, each with its own `package.json`.

---

## 2. Blocking bugs (code will throw at runtime)

### 2.1 `bb-index.js:1,5,11` — `req` and `res` are undefined

```js
const generateTemplatePdf2 = async (body) => {   // signature takes `body`
  const templateEnv = req.body.environment;      // ❌ ReferenceError: req is not defined
  ...
  return res.status(400).json({ ... });          // ❌ ReferenceError: res is not defined
```

Someone refactored a controller `(req, res)` into a helper `(body)` and only converted the signature. `req` appears on lines 5 and 505; `res` appears 4×. **This function cannot run.**

**Fix — pick one shape and commit to it.** Recommended: keep the controller thin, put the work in a service that returns a value and throws typed errors.

```js
// controllers/template.controller.js
async function generateTemplatePdf(req, res, next) {
  try {
    const result = await templateService.generateTemplatePdf(req.body);
    return res.status(201).json({ code: 201, message: 'PDF generated successfully', data: result });
  } catch (err) {
    return next(err); // central error middleware maps AppError -> status
  }
}

// services/template.service.js
async function generateTemplatePdf(body) {          // pure: no req/res in here
  const { mediaEnvironment, templateFullRes, environment } = body;
  ...
  return { fileUrl };
}
```

### 2.2 `puppet-pdf/server.js:18` — `page.waitFor` was removed

```js
await page.waitFor(1000);   // ❌ removed in Puppeteer v10; package.json pins ^24.20.0
```

**Fix:**

```js
await new Promise(r => setTimeout(r, 1000));
```

Better: don't sleep at all. Arbitrary sleeps are flaky under load. Have the page signal readiness:

```js
await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });
await page.waitForFunction(() => window.__renderComplete === true, { timeout: 15_000 });
```
…and set `window.__renderComplete = true` at the end of `init()` in `index.html`.

### 2.3 `components/main.js:11,42` — wrong paths

```js
await this.loadHTML('./component/home.html');   // ❌ directory is "components", not "component"
const res = await fetch('../assets/data/resume.json'); // ❌ escapes the site root
```

This file is a stale duplicate (see §5.1). Delete it.

---

## 3. Security

### 3.1 HTML injection into the PDF — `bb-index.js` (~40 interpolation sites)

Every DB value goes straight into a template literal:

```js
<span> ${handleNull(activity?.activity_title)} </span>
```

A title containing `<` breaks the layout; `<img src=x onerror=...>` executes inside a Chromium page that has `--no-sandbox` and filesystem-adjacent privileges. This is the highest-severity issue in the file.

**Fix — escape at the boundary, no exceptions:**

```js
const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

/** Escape untrusted text for HTML interpolation. */
function esc(value, fallback = 'NA') {
  if (value === null || value === undefined || value === 'null' || value === '') return fallback;
  return String(value).replace(/[&<>"']/g, ch => ESCAPE_MAP[ch]);
}
```

Then `handleNull(x)` → `esc(x)` everywhere. Add an ESLint rule or a review checklist item so raw `${}` in HTML strings is caught in future PRs.

### 3.2 Path traversal + collision on the output filename — `bb-index.js:994`

```js
const fileName = `${templateData?.title}_template.pdf`;
const filePath = path.join(uploadDir, fileName);
```

A title of `../../config/.env` writes outside `uploaded_files/`. Two concurrent requests with the same title overwrite each other mid-write.

**Fix:**

```js
const { randomUUID } = require('crypto');

const safeTitle = String(templateData?.title ?? 'template')
  .replace(/[^a-zA-Z0-9-_]/g, '_')
  .slice(0, 60);
const fileName = `${safeTitle}_${randomUUID()}.pdf`;
const filePath = path.join(uploadDir, fileName);

// belt and braces — verify we didn't escape the directory
if (!filePath.startsWith(path.resolve(uploadDir) + path.sep)) {
  throw new AppError(400, 'Invalid template title');
}
```

### 3.3 Error object leaked to the client — `bb-index.js:1006`

```js
return res.status(500).send({ code: 500, message: error.message, error });
```

Serialising a Sequelize error exposes the SQL string, table names, and column names.

**Fix:** log the full error server-side, return a correlation id.

```js
const errorId = randomUUID();
logger.error({ errorId, err: error }, 'PDF generation failed');
return res.status(500).json({ code: 500, message: 'Failed to generate PDF', errorId });
```

### 3.4 `--no-sandbox`

Acceptable *only* inside a locked-down container. Combined with §3.1 (injectable HTML) it means an attacker-controlled trip title gets JS execution in an unsandboxed Chromium. Fix §3.1 first; then keep `--no-sandbox` only if you're running as non-root in a container.

### 3.5 `innerHTML` directive in `gpapp.js` — `data-gp-html`

```js
element[attribute] = data ?? '';   // attribute === 'innerHTML'
```

Currently safe (data comes from your own `resume.json`), but the *directive is the framework's primary API*. The moment it renders anything user-supplied it's stored XSS.

**Fix:** default to `textContent`, make HTML opt-in.

```js
const ATTRIBUTE_MAP = {
  'data-gp-text': 'textContent',   // ✅ default, safe
  'data-gp-html': 'innerHTML',     // ⚠️ documented as trusted-content-only
  'data-gp-src':  'src',
  'data-gp-alt':  'alt',
  'data-gp-href': 'href',
};
```

Also validate `href`/`src` — reject anything not `https:`, `mailto:`, `tel:`, or a same-origin relative path, so `javascript:` URLs can never land in the DOM.

---

## 4. Correctness & reliability — `bb-index.js`

### 4.1 Guard clauses run *after* the code they're guarding

```js
const templateData = templateFullRes.data?.template;
const id = templateData.entity_type;              // ❌ line 18: TypeError if template missing
const entityDetails = await db.sequelize.query(query, {...});  // ❌ line 26: DB hit before validation

if (!templateDays || !templateData) {             // line 30: too late
  return res.status(400).json({ ... });
}
```

You use guard clauses well elsewhere — here the ordering got lost in a refactor. **Validate first, then touch data, then hit the DB.**

```js
if (!templateFullRes)  return fail(400, 'templateFullRes is required');

const templateDays = templateFullRes.data?.days;
const templateData = templateFullRes.data?.template;
if (!Array.isArray(templateDays) || templateDays.length === 0) return fail(400, 'templateFullRes.data.days is required');
if (!templateData?.entity_type)                               return fail(400, 'templateFullRes.data.template.entity_type is required');

// only now
const [entity] = await db.sequelize.query(ENTITY_QUERY, { ... });
if (!entity) return fail(404, `Entity ${templateData.entity_type} not found`);
```

Note `entityDetails[0]` is used 900 lines later at line 946 with no existence check — if the entity is missing you silently render an empty address instead of failing loudly.

### 4.2 `async` callbacks inside `forEach` — lines 44, 178

```js
templateDays.forEach(async (day, index) => {
  htmlContentDayLabel += `...`;
});
```

`forEach` ignores the returned promise. Today the bodies happen to be synchronous so it works by accident; the moment anyone adds an `await` (fetching an image, a lookup) the HTML string is built *after* it's already been used. This is a landmine.

**Fix — drop `async`, and build with `map().join('')` instead of `+=`:**

```js
const htmlContentDayLabel = templateDays
  .map((day, index) => renderDayLabel(day, index))
  .join('');
```

If you genuinely need async: `const parts = await Promise.all(days.map(renderDay));`

### 4.3 Browser leaks on every failure — line 962–983

```js
const browser = await puppeteer.launch(...);
const page = await browser.newPage();
await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: 0 }); // ❌ timeout: 0
const pdfBuffer = await page.pdf({...});
await browser.close();   // ❌ not in finally — skipped if pdf() throws
```

Two compounding problems:
- `timeout: 0` means **wait forever**. One unreachable image URL (a map tile, a logo CDN) hangs the request indefinitely.
- `browser.close()` isn't in a `finally`. Every throw leaks a Chromium process (~100–150 MB). A handful of failures and the box is out of memory.

**Fix:**

```js
const PDF_TIMEOUT_MS = 60_000;
let browser;
try {
  browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: 'networkidle0', timeout: PDF_TIMEOUT_MS });
  return await page.pdf({ format: 'A4', printBackground: true, margin: {...}, timeout: PDF_TIMEOUT_MS });
} finally {
  if (browser) await browser.close().catch(err => logger.warn({ err }, 'browser close failed'));
}
```

### 4.4 Only lines 580+ are inside `try`

The `try {` block starts at line 580. Everything before it — the destructuring, the `templateData.entity_type` deref, the SQL query, ~500 lines of template building — is unprotected. An exception there escapes as an unhandled rejection and (without `next(err)`) hangs the request until the client times out.

**Fix:** wrap the whole handler, or use an `asyncHandler` wrapper on the route so nothing can escape:

```js
const asyncHandler = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
router.post('/templates/:id/pdf', asyncHandler(generateTemplatePdf));
```

### 4.5 Blocking I/O — line 991–996

```js
fs.existsSync(uploadDir);
fs.mkdirSync(uploadDir, { recursive: true });
fs.writeFileSync(filePath, pdfBuffer);   // ❌ blocks the event loop for a multi-MB buffer
```

**Fix:**

```js
const fsp = require('fs/promises');
await fsp.mkdir(uploadDir, { recursive: true });   // recursive:true is already idempotent — existsSync is redundant
await fsp.writeFile(filePath, pdfBuffer);
```

### 4.6 Fragile output path — line 990

```js
path.join(__dirname, "../../../../uploaded_files/")
```

Four levels of `..` breaks the instant anyone moves the file. **Fix:** `process.env.UPLOAD_DIR` with a validated default, resolved once at startup.

### 4.7 Dead code — lines 4, 5

```js
const uploadFile = "uploaded_files";   // never read; the literal is hardcoded again at line 990
const templateEnv = req.body.environment;  // never read
```

Delete. Dead variables are how the `req`/`res` bug survived review.

---

## 5. Maintainability

### 5.1 The template engine exists three times

| File | LOC | Status |
|---|---|---|
| `gpapp/gpapp.js` | 197 | Current — class-based, component loading, event delegation |
| `assets/js/main.js` | 153 | Stale duplicate, has a `debugger` statement on line 29 |
| `components/main.js` | 152 | Stale duplicate, two broken paths |

`assets/js/main.js` and `components/main.js` both declare a top-level `const app` and `const appElement`. If any page ever loads both, the whole bundle dies with `SyntaxError: Identifier 'app' has already been declared`.

**Fix:** delete both duplicates. `gpapp.js` is the only one worth keeping. Every behaviour in the other two already exists there.

### 5.2 `bb-index.js` is one 1007-line function

~900 of those lines are inline HTML template literals with inline styles. It's unreviewable, untestable, and un-diffable.

**Fix — extract to a real template layer:**

```
services/pdf/
  template.service.js       # orchestration, ~120 lines
  renderers/
    day-label.renderer.js
    activity.renderer.js
    fnb.renderer.js
    transport.renderer.js
    accommodation.renderer.js
    map.renderer.js
  templates/
    itinerary.hbs           # or .ejs — with auto-escaping ON by default
  pdf.client.js             # puppeteer lifecycle + browser pool
```

Handlebars/EJS auto-escape by default, which kills §3.1 structurally instead of by discipline. That alone justifies the migration.

### 5.3 `console.log` and `debugger` in shipped code

`app.js:25`, `assets/js/main.js:13,29,46`, `components/main.js:13,52`.

**Fix:** ESLint with `no-console` (allow `warn`/`error`) and `no-debugger` as errors, wired into a pre-commit hook.

### 5.4 Silent failures in `gpapp.js`

```js
async loadHTML(url, options = {}) {
  try { ... } catch (error) {
    console.error('Error fetching HTML:', error);
    return '';        // ❌ caller can't distinguish "empty component" from "network died"
  }
}
```

A failed fetch renders a blank page with no user-visible signal.

**Fix:** let it throw, catch once at `loadApp()`, and render a real fallback:

```js
async loadApp() {
  try {
    this.virtualDOM = this.appElement;
    await this.loadComponents(this.components);
    await this.created();
    this.renderDOM();
  } catch (error) {
    console.error('App failed to load:', error);
    this.appElement.innerHTML =
      '<div role="alert" class="alert alert-warning m-4">Content failed to load. Please refresh.</div>';
  }
}
```

### 5.5 `gpapp.js` smaller issues

| Line | Issue | Fix |
|---|---|---|
| 2–3 | `static components = {}` / `static data = {}` are never read — shadowed by instance fields | Delete |
| 125 | `setAttributeVaules` — typo in a public method name | Rename to `setAttributeValues` |
| 100 | `dataKey` derived via `"gp" + attr.slice(8,9).toUpperCase() + attr.slice(9)` — magic indices | Use an explicit map: `{ 'data-gp-html': { prop: 'innerHTML', dataset: 'gpHtml' } }` |
| 99 | `resolveDataPath` reduces against `this` — templates can read `this.methods`, `this.appElement`, etc. | Resolve against an explicit `this.data` scope |
| 186 | `loadComponents` awaits in a `for` loop — 3 component fetches serialised | `await Promise.all(entries.map(c => this.loadComponent(c)))` |
| 173 | `el.outerHTML = ...` inside `forEach` over a live NodeList — replacing a node while iterating | Snapshot first: `[...elements].forEach(...)` |
| 157 | `updateDOM()` does `appElement.innerHTML = virtualDOM.innerHTML`, but `virtualDOM === appElement` — it's a self-assignment that force-reparses the entire DOM | Since you mutate `appElement` in place, just delete `updateDOM()` |
| 160 | `resolvedUrlPath` sniffs `location.origin.includes('github.io')` | Use `<base href="/profile/">` in HTML and plain relative URLs — zero JS |

### 5.6 `app.html` hardcodes production URLs

```html
<script src="https://gopalubt.github.io/profile/gpapp/gpapp.js"></script>
<script src="https://gopalubt.github.io/profile/app.js"></script>
```

You cannot develop offline, and you can't test a change before it's live. `index.html` gets this right with `./gpapp/gpapp.js` — make `app.html` match.

---

## 6. Repo hygiene

| Issue | Fix |
|---|---|
| **No `.gitignore`**, and 4,200 `node_modules` files sit untracked in `puppet-pdf/` — one `git add .` from a disaster | Add `.gitignore`: `node_modules/`, `*.pdf`, `.env`, `.DS_Store`, `uploaded_files/` |
| `README.md` is one word: `# profile` | Document what each folder is, how to run it, how to deploy |
| No root `package.json`, no lint, no format, no tests, no CI | See §7 |
| `bb-index.js` references `db.sequelize`, `puppeteer`, `fs`, `path` — **none are imported** | It's an orphaned fragment; either restore the imports and its home project, or remove it from this repo |

---

## 7. How to use this for development — concrete plan

### Step 0 — Decide the repo split *first* (blocks everything else)

Nothing below is worth doing twice. Pick one:
- **Option A (recommended):** three repos — `portfolio`, `gpapp` (publish to npm), `itinerary-pdf-service`.
- **Option B:** one monorepo with npm workspaces.

Either way `bb-index.js` leaves this repo.

### Step 1 — Stop the bleeding (½ day)

```bash
git rm -r --cached . && git add .            # after writing .gitignore
rm components/main.js assets/js/main.js      # duplicates (§5.1)
```
Remove the `debugger` statement, strip `console.log`s.

### Step 2 — Tooling baseline (½ day)

```json
// package.json
{
  "scripts": {
    "lint": "eslint . --max-warnings=0",
    "format": "prettier --write .",
    "test": "vitest run",
    "dev": "vite"
  }
}
```

ESLint rules that would have caught the bugs in this review:

```js
// eslint.config.js
export default [{
  rules: {
    'no-undef': 'error',              // ← catches §2.1 (req/res)
    'no-unused-vars': 'error',        // ← catches §4.7 (dead code)
    'no-debugger': 'error',           // ← catches §5.3
    'no-console': ['error', { allow: ['warn', 'error'] }],
    'no-async-promise-executor': 'error',
    'require-atomic-updates': 'error',
    'array-callback-return': 'error', // ← flags §4.2 (async forEach)
  },
}];
```

Wire it to a pre-commit hook (`husky` + `lint-staged`) so it's enforced, not aspirational.

### Step 3 — Fix the blockers (1 day)

In priority order: §2.1 (`req`/`res`) → §3.1 (HTML escaping) → §4.3 (browser leak + timeout) → §3.2 (filename) → §4.1 (guard ordering).

### Step 4 — Tests where they pay for themselves (1–2 days)

The template engine is pure DOM logic — trivially testable with `vitest` + `jsdom`:

```js
// gpapp/gpapp.test.js
import { describe, it, expect, beforeEach } from 'vitest';

describe('GpApp directives', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; });

  it('renders a list from data-gp-for', () => {
    const app = new GpApp('app');
    app.data = { items: [{ name: 'A' }, { name: 'B' }] };
    app.appElement.innerHTML = '<ul><li data-gp-for="item of data.items" data-gp-text="item.name"></li></ul>';
    app.renderDOM();
    expect(app.appElement.querySelectorAll('li')).toHaveLength(2);
  });

  it('escapes untrusted text', () => {
    const app = new GpApp('app');
    app.data = { bio: '<img src=x onerror=alert(1)>' };
    app.appElement.innerHTML = '<p data-gp-text="data.bio"></p>';
    app.renderDOM();
    expect(app.appElement.querySelector('p').innerHTML).not.toContain('<img');
  });
});
```

For the PDF service, test the **renderers** (pure string functions) — not Puppeteer. Add exactly one integration test that generates a real PDF and asserts `buffer.subarray(0, 4).toString() === '%PDF'`.

### Step 5 — Productionise the PDF service (2–3 days)

- Reuse one browser instance across requests instead of launching per call (§4.3). A single warm browser saves ~500 ms/request and most of the memory.
- Add a concurrency limit (`p-limit(3)` or a small queue) — unbounded Puppeteer concurrency is an OOM waiting to happen.
- Move to async job + polling if generation exceeds ~10 s; a 60 s synchronous HTTP request will be killed by most load balancers.
- Health check that verifies the browser is alive, not just that the process is up.

```js
// pdf.client.js — singleton browser with reconnect
let browserPromise = null;

async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const browser = await browserPromise;
    browser.on('disconnected', () => { browserPromise = null; });  // rebuild on crash
  }
  return browserPromise;
}

async function renderPdf(html, options = {}) {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 60_000 });
    return await page.pdf({ format: 'A4', printBackground: true, timeout: 60_000, ...options });
  } finally {
    await page.close().catch(() => {});   // close the page, keep the browser
  }
}
```

### Step 6 — CI (2 hours)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: npm }
      - run: npm ci
      - run: npm run lint
      - run: npm test
```

---

## 8. What's genuinely good here

Worth saying, because these are the habits to keep:

- **Layered thinking.** `GpApp` cleanly separates data resolution, DOM attribute binding, loop expansion, and event delegation. That's real design, not accident.
- **Event delegation over per-node listeners** (`attachEventDelegation`) — the right call, and it scales.
- **Parameterised SQL.** `replacements: { id }` with `QueryTypes.SELECT` — no injection there, and the query correctly filters `isDeleted = false AND status = 'ACTIVE'`.
- **Optional chaining used consistently** for nested API data. The instinct is right; §4.1 is a case where the guard just ended up in the wrong place.
- **`removeDataAttributes`** — cleaning directive attributes out of rendered output shows you're thinking about the emitted HTML, not just making it work.
- **Writing your own framework is a good learning exercise.** `gpapp.js` in 197 lines does loops, bindings, components, and event delegation. Polished up per §5.5 and §3.5, it's a legitimate portfolio piece.

---

## 9. Priority summary

| # | Issue | Severity | Effort |
|---|---|---|---|
| 1 | `req`/`res` undefined — code cannot run (§2.1) | 🔴 Blocker | S |
| 2 | HTML injection into PDF (§3.1) | 🔴 Critical | M |
| 3 | Browser leak + `timeout: 0` (§4.3) | 🔴 Critical | S |
| 4 | Path traversal in filename (§3.2) | 🔴 Critical | S |
| 5 | `page.waitFor` removed in Puppeteer 24 (§2.2) | 🟠 High | S |
| 6 | Guard clauses after use / DB hit before validation (§4.1) | 🟠 High | S |
| 7 | Error object leaked to client (§3.3) | 🟠 High | S |
| 8 | Backend code in a public portfolio repo (§1) | 🟠 High | M |
| 9 | No `.gitignore` (§6) | 🟠 High | S |
| 10 | Three copies of the template engine (§5.1) | 🟡 Medium | S |
| 11 | 1007-line function (§5.2) | 🟡 Medium | L |
| 12 | `async` in `forEach` (§4.2) | 🟡 Medium | S |
| 13 | Blocking `fs.*Sync` (§4.5) | 🟡 Medium | S |
| 14 | `innerHTML` as the default directive (§3.5) | 🟡 Medium | S |
| 15 | Hardcoded prod URLs in `app.html` (§5.6) | 🟢 Low | S |
| 16 | `debugger` / `console.log` shipped (§5.3) | 🟢 Low | S |
| 17 | No lint / tests / CI (§7) | 🟢 Low | M |

**Suggested first PR:** items 1, 3, 4, 5, 7, 9, 10, 16 — all small, all independent, and together they take the codebase from "cannot run" to "runs safely."
