# gsr-workspace

Three projects that previously shared one flat folder, now separated into npm
workspaces.

```
apps/portfolio/          Static portfolio site (GitHub Pages)
packages/gpapp/          GpApp - a ~290 line declarative template engine
services/itinerary-pdf/  Express + Sequelize + Puppeteer PDF generator
services/pdf-spike/      Standalone Puppeteer spike
```

## Quick start

```bash
npm install                       # installs every workspace

npm run dev:portfolio             # serves the site on http://localhost:3000
npm run smoke --workspace=@gsr/itinerary-pdf   # 17 checks, no Chromium needed
```

---

## apps/portfolio

Static site, no bundler. Every page shares the header and footer and swaps only
the main partial:

```html
<div id="app" data-main="components/main.html">
```

All asset paths are relative, so the same files work at `localhost:3000` and at
`https://<user>.github.io/profile/` with no environment sniffing.

`vendor/gpapp.js` is a committed copy of `packages/gpapp/gpapp.js` — GitHub
Pages serves files as-is, so there is nothing to resolve a workspace import.
After editing the framework:

```bash
npm run sync-vendor --workspace=@gsr/portfolio
```

`npm run dev` and `npm start` do this automatically.

---

## packages/gpapp

| Directive | Effect |
|---|---|
| `data-gp-component="name"` | Replace the element with an HTML partial |
| `data-gp-for="item of a.b"` | Repeat once per array entry |
| `data-gp-text="item.label"` | Set `textContent` — **safe, prefer this** |
| `data-gp-html="item.body"` | Set `innerHTML` — trusted content only |
| `data-gp-src` / `data-gp-href` | Set the URL, rejecting `javascript:` and `data:` |
| `data-gp-alt` | Set alt text |
| `data-e="click:methodName"` | Delegated event handler |

---

## services/itinerary-pdf

See [`services/itinerary-pdf/README.md`](services/itinerary-pdf/README.md).

> **Rotate the Google Maps API key.** The legacy `bb-index.js` had a live key
> hardcoded in source. It was never committed *here* (and `.gitignore` now
> excludes `*.bak` so it stays that way), but the file came from the Blueberry
> ERP project where it likely is committed. Check that history and rotate.

---

## What was fixed

Full analysis in [`CODE-REVIEW.md`](CODE-REVIEW.md).

**Would not run**

- `bb-index.js` took `(body)` but called `req.body` and `res.status` — `ReferenceError`.
- `bb-index.js` read a `locations` variable that was never declared.
- `puppet-pdf/server.js` called `page.waitFor()`, removed in Puppeteer v10 (package pins v24).
- `components/main.js` fetched `./component/home.html` (wrong directory).

**Security**

- ~40 unescaped interpolations into PDF HTML → everything through `esc()`.
- Unsanitised PDF filename (path traversal + concurrent overwrite) → slug + UUID + containment check.
- Raw error objects returned to clients (leaked SQL) → generic message + `errorId`.
- Google Maps API key hardcoded in source → `GOOGLE_MAPS_API_KEY`.
- `innerHTML` was the default binding → `data-gp-text` is now the safe default.
- `javascript:` URLs could reach `src`/`href` → protocol allow-list.

**Reliability**

- `browser.close()` outside `finally` leaked Chromium on every failure.
- `timeout: 0` meant one unreachable image hung the request forever.
- A browser launched per request → one warm browser with a concurrency cap.
- Guard clauses ran *after* the derefs and DB query they protected.
- `forEach(async …)` with `+=` → `.map().join('')`.
- Blocking `fs.*Sync` → `fs/promises`.

**Maintainability**

- The template engine existed three times; two stale copies deleted (one shipped a `debugger` statement).
- Both duplicates declared a top-level `const app`, so loading them together was a `SyntaxError`.
- A 1007-line function split into controller / service / renderers.
- `terms.html` was entirely commented out; `app.html` duplicated `index.html`; `components/home.html` imported a file that does not exist.
- No `.gitignore`, with 4,200 untracked `node_modules` files on disk.
- Hardcoded `gopalubt.github.io` URLs made local development impossible.

## Not done

You opted out of ESLint, Vitest, and CI. The rules that would have caught the
top three bugs, for when you want them:

```js
'no-undef': 'error',           // req/res and locations
'no-unused-vars': 'error',     // the dead vars that hid them
'no-debugger': 'error',
'array-callback-return': 'error',
```

`services/itinerary-pdf/scripts/smoke.js` is a dependency-free stand-in for now.
