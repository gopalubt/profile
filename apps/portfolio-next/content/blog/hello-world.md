---
title: "Hello, world"
date: "2026-08-04"
excerpt: "Why this site exists and what's actually running behind it."
---

This is the first post on this site. It's a markdown file, committed to
git, rendered at request time - no database, no CMS, no admin login to
build. For a personal blog that gets updated occasionally, that's the
right amount of infrastructure: none beyond what already exists.

## What's actually running here

- This page: a Next.js app reading markdown files like this one.
- The contact form: writes to Firestore and sends an email notification.
- The resume download: a separate small Node/Express + Puppeteer service
  that renders a role-tailored PDF on demand, reusing a warm-browser
  pattern instead of launching Chromium per request.

More on each of those as they get built out.
