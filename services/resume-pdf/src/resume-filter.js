'use strict';

const { badRequest } = require('./errors');

const VALID_ROLES = ['frontend', 'backend', 'fullstack'];

/**
 * Filter resume content down to what's relevant for a given role.
 *
 * Deliberately NOT a flat lookup table keyed by role combination - there's
 * only one "combination" dimension here (a single selected role) and the
 * outcome for each item is a simple per-item match, not a distinct case per
 * combination. A resolver-per-item + filter is the right shape (same
 * reasoning as the notification-recipient resolver: decompose when the
 * outcome genuinely composes, don't build a table you don't need).
 *
 * @param {object} resume - full resume.json content
 * @param {'frontend'|'backend'|'fullstack'} role
 * @throws {AppError} 400 if role is not one of VALID_ROLES
 */
function filterResumeByRole(resume, role) {
  if (!VALID_ROLES.includes(role)) {
    throw badRequest(`Unknown role "${role}". Expected one of: ${VALID_ROLES.join(', ')}`);
  }

  // fullstack shows everything tagged for either discipline.
  const matches = (roles) => (role === 'fullstack' ? true : Array.isArray(roles) && roles.includes(role));

  return {
    name: resume.name,
    title: resume.title,
    contact: resume.contact,
    summary: resume.summary[role] ?? resume.summary.fullstack ?? '',
    skills: (resume.skills || []).filter((skill) => matches(skill.roles)).map((skill) => skill.name),
    experience: (resume.experience || []).map((job) => ({
      company: job.company,
      role: job.role,
      period: job.period,
      bullets: (job.bullets || []).filter((bullet) => matches(bullet.roles)).map((bullet) => bullet.text),
    })),
    projects: (resume.projects || []).filter((project) => matches(project.roles)),
    education: resume.education || [],
  };
}

module.exports = { filterResumeByRole, VALID_ROLES };
