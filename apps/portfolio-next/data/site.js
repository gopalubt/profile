/**
 * Site-wide profile content for Home/About. Kept separate from
 * services/resume-pdf/src/data/resume.json deliberately - that file drives a
 * downloadable, role-filtered PDF from a standalone service; this one drives
 * the static About/Home copy for this app. Duplication of a few facts (name,
 * title) between two independently-deployed things is a smaller cost than
 * coupling a Next.js app's build to a separate microservice's data file.
 */
export const site = {
  name: 'REPLACE_WITH_YOUR_NAME',
  title: 'Full-Stack Engineer',
  tagline: 'I build layered, guard-clause-first backends and clean Angular/React frontends.',
  location: 'REPLACE_WITH_YOUR_CITY',
  email: 'REPLACE_WITH_YOUR_EMAIL',
  social: {
    github: 'https://github.com/REPLACE_ME',
    linkedin: 'https://linkedin.com/in/REPLACE_ME',
  },
  about: [
    'REPLACE_WITH_A_PARAGRAPH_ABOUT_YOURSELF.',
    'REPLACE_WITH_A_SECOND_PARAGRAPH_ABOUT_WHAT_YOU_LIKE_BUILDING.',
  ],
};
