'use strict';

const { esc, mapHtml } = require('../html');

/**
 * Build a complete HTML document for a (already role-filtered) resume.
 * Every value is escaped at the boundary - see html.js for why.
 * @param {object} resume - output of resume-filter.js#filterResumeByRole
 */
function renderResumeHtml(resume) {
  const links = mapHtml(
    resume.contact?.links,
    (link) => `<a href="${esc(link.url)}">${esc(link.label)}</a>`,
    '',
  );

  const skills = mapHtml(
    resume.skills,
    (skill) => `<li>${esc(skill)}</li>`,
    '<li>No skills listed for this role.</li>',
  );

  const experience = mapHtml(
    resume.experience,
    (job) => `
      <section class="job">
        <h3>${esc(job.role)} &middot; ${esc(job.company)}</h3>
        <p class="period">${esc(job.period)}</p>
        <ul>${mapHtml(job.bullets, (bullet) => `<li>${esc(bullet)}</li>`)}</ul>
      </section>
    `,
  );

  const projects = mapHtml(
    resume.projects,
    (project) => `
      <section class="project">
        <h3>${esc(project.name)}</h3>
        <p>${esc(project.description)}</p>
      </section>
    `,
  );

  const education = mapHtml(
    resume.education,
    (item) => `
      <section class="edu">
        <h3>${esc(item.degree)}</h3>
        <p>${esc(item.school)} &middot; ${esc(item.period)}</p>
      </section>
    `,
  );

  return `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>${esc(resume.name)} - Resume</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; margin: 0; padding: 32px 40px; }
  h1 { margin: 0; font-size: 26px; }
  .title { color: #4a5568; font-size: 15px; margin-top: 2px; }
  .contact { font-size: 12.5px; color: #4a5568; margin-top: 8px; }
  .contact a { color: #2b6cb0; text-decoration: none; margin-right: 12px; }
  .summary { margin-top: 18px; font-size: 13.5px; line-height: 1.5; }
  h2 { font-size: 14px; text-transform: uppercase; letter-spacing: 0.04em; color: #2b6cb0;
       border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; margin-top: 26px; }
  .skills { list-style: none; display: flex; flex-wrap: wrap; gap: 8px; padding: 0; margin: 10px 0 0; }
  .skills li { background: #edf2f7; padding: 4px 10px; border-radius: 4px; font-size: 12px; }
  .job, .project, .edu { margin-top: 14px; }
  .job h3, .project h3, .edu h3 { font-size: 13.5px; margin: 0 0 2px; }
  .period { font-size: 11.5px; color: #718096; margin: 0 0 6px; }
  ul { margin: 4px 0 0; padding-left: 18px; font-size: 12.5px; line-height: 1.5; }
</style>
</head>
<body>
  <h1>${esc(resume.name)}</h1>
  <p class="title">${esc(resume.title)}</p>
  <p class="contact">
    ${esc(resume.contact?.email)} &middot; ${esc(resume.contact?.phone)} &middot; ${esc(resume.contact?.location)}
    ${links}
  </p>

  <p class="summary">${esc(resume.summary)}</p>

  <h2>Skills</h2>
  <ul class="skills">${skills}</ul>

  <h2>Experience</h2>
  ${experience}

  <h2>Projects</h2>
  ${projects}

  <h2>Education</h2>
  ${education}
</body>
</html>
  `.trim();
}

module.exports = { renderResumeHtml };
