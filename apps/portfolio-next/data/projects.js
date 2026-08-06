/**
 * Project gallery data. Static array, matching the "Markdown/local files, no
 * DB" decision for the blog - a personal site's project list changes rarely
 * enough that a database is unwarranted complexity for it too.
 */
export const projects = [
  {
    slug: 'resume-pdf-service',
    name: 'Role-tailored resume PDF service',
    description:
      'A small Node/Express + Puppeteer service that generates a resume PDF filtered to frontend, backend, or full-stack content on demand - one warm browser, bounded concurrency, no per-request Chromium launch.',
    tags: ['Node.js', 'Express', 'Puppeteer'],
    links: { source: 'https://github.com/REPLACE_ME/gsr-workspace' },
  },
  {
    slug: 'gpapp',
    name: 'GpApp - a declarative template engine',
    description:
      'A ~290-line vanilla JS template engine: component loading, data-gp-for loops, event delegation, and an explicit safe/unsafe binding split (textContent by default, innerHTML opt-in).',
    tags: ['JavaScript', 'DOM'],
    links: { source: 'https://github.com/REPLACE_ME/gsr-workspace' },
  },
  {
    slug: 'REPLACE_WITH_A_REAL_PROJECT',
    name: 'REPLACE_WITH_PROJECT_NAME',
    description: 'REPLACE_WITH_A_SHORT_DESCRIPTION_OF_WHAT_IT_DOES_AND_WHY.',
    tags: ['REPLACE_ME'],
    links: { source: '', demo: '' },
  },
];
