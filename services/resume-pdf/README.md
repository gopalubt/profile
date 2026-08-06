# @gsr/resume-pdf

Generates a role-tailored resume PDF on demand: `GET /resume?role=frontend|backend|fullstack`.

One `src/data/resume.json` is the single source of truth. Each skill,
experience bullet, and project is tagged with the role(s) it's relevant to;
`fullstack` shows everything, `frontend`/`backend` show only what's tagged
for that role plus anything shared. See `src/resume-filter.js`.

## Why a service, not static PDF files

Three hand-maintained PDFs (frontend.pdf, backend.pdf, fullstack.pdf) drift
out of sync the moment you update your resume in only one of them. One data
file + a filter function makes that impossible by construction.

## Why one warm browser instead of launching Chromium per request

A cold Puppeteer launch costs ~500ms and ~100-150MB. This service (same
pattern as `services/itinerary-pdf`) launches Chromium once and keeps it
warm; only a `page` is opened per request and closed in a `finally` no
matter how the render ends. A concurrency cap (`PDF_MAX_CONCURRENT`, default
2) returns a clean `503` under load instead of exhausting memory.

## Setup

```bash
cp .env.example .env
# fill in src/data/resume.json with your real details - it ships with
# REPLACE_ME placeholders on purpose, so a forgotten field fails obviously.
npm install
npm run smoke   # 10 checks, no Chromium required
npm start       # listens on PORT (default 4001)
```

Point the portfolio site's `NEXT_PUBLIC_RESUME_PDF_URL` at wherever this
runs (locally: `http://localhost:4001`).

## Deploying

This needs a host that runs a long-lived Node process with Chromium
available (Render, Railway, Fly.io, a small VM) - not a typical serverless
function, which either can't run full Puppeteer or needs a special slim
Chromium build (`@sparticuz/chromium`) to fit the size limit. Keeping this
as a small standalone service avoids that problem entirely.

Set `CORS_ORIGIN` to your real portfolio domain in production - the default
only allows `localhost:3000`.

## Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/resume?role=frontend\|backend\|fullstack` | Streams a PDF download. `role` defaults to `fullstack`. |
| GET | `/health` | `{ status: "ok" }` |
