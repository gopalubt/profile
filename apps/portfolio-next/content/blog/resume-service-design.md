---
title: "Designing a role-tailored resume PDF service"
date: "2026-08-05"
excerpt: "One resume.json, filtered per role at request time, rendered with a warm Puppeteer browser instead of one launched per request."
---

The resume download on this site isn't three static PDF files - it's one
`resume.json` filtered by role (`frontend` / `backend` / `fullstack`) and
rendered to a PDF on demand.

## Why not just three PDFs?

Three static files are simpler on day one, and wrong by day thirty: every
resume update means regenerating and re-uploading three files by hand, and
nothing stops them from silently drifting out of sync with each other.
One data source with a role filter means there's exactly one place to
update, ever.

## Why not generate the PDF per request from scratch (new browser each time)?

A cold Puppeteer launch costs roughly 500ms and 100-150MB of memory. Doing
that per request works fine for a demo and falls over the moment two
people click "download" at the same time. The service keeps one warm
Chromium instance alive across requests and only opens a new *page* per
render, with a hard concurrency cap so a burst of requests degrades to a
clean `503` instead of taking the process down.
