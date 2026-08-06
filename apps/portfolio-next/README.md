# @gsr/portfolio-next

Next.js (App Router) portfolio site: Home, About, Projects, Blog, Contact.

## Pages

| Route | Source |
|---|---|
| `/` | `app/page.js` |
| `/about` | `app/about/page.js` - content in `data/site.js` |
| `/projects` | `app/projects/page.js` - content in `data/projects.js` |
| `/blog` | `app/blog/page.js` - lists posts from `content/blog/*.md` |
| `/blog/[slug]` | `app/blog/[slug]/page.js` |
| `/contact` | `app/contact/page.js` |

## Contact form

`POST /api/contact` (`app/api/contact/route.js`):

1. Validates the payload (`lib/validate-contact.js`) - rejects before
   touching Firestore or sending anything.
2. Writes the submission to Firestore (`contactSubmissions` collection) via
   the Admin SDK (`lib/firebase-admin.js`).
3. Sends a notification email via Resend (`lib/send-contact-email.js`).

If step 3 fails, the request still returns success - the submission is
already durably saved by then, and a flaky email provider shouldn't make a
visitor re-submit and create a duplicate Firestore doc. The failure is
logged server-side instead. See the comment in `route.js`.

A hidden honeypot field (`company`) provides basic spam filtering without a
CAPTCHA - real users never see or fill it (hidden via CSS, not `type="hidden"`,
so basic bots that only skip `type="hidden"` still get caught).

## Resume download

The "Download Resume" button on the home page calls the separate
`services/resume-pdf` microservice directly from the browser (not through
this app's API) - see `components/ResumeDownload.js` and
`NEXT_PUBLIC_RESUME_PDF_URL`. That service owns the resume content and PDF
rendering; this app only links to it.

## Blog

Markdown files in `content/blog/*.md` with YAML frontmatter (`title`, `date`,
`excerpt`). No database, no admin UI - add a file, commit it, it's live.
Rendered with `remark` + `remark-html` (`lib/posts.js`). Safe to use
`dangerouslySetInnerHTML` for the rendered body specifically because posts
are authored by you and committed to git, not user-submitted - see the
comment in `app/blog/[slug]/page.js` if that source ever changes.

## Setup

```bash
cp .env.example .env
# Firebase: console -> Project settings -> Service accounts -> Generate new private key
# Resend: resend.com -> API Keys
npm install
npm run dev   # http://localhost:3000
```

Fill in `data/site.js` with your real name/bio/links, and
`data/projects.js` with your real projects - both ship with `REPLACE_ME`
placeholders so a forgotten field is obvious rather than silently wrong.

## Deploying

Vercel is the natural fit (this is a standard Next.js app - no config
needed beyond the environment variables above). `services/resume-pdf`
deploys separately (see its own README) since it needs a long-lived process
for Chromium, which Vercel's serverless functions aren't built for.
