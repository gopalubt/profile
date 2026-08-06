import { badRequest } from './errors';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE_LENGTH = 5000;

/**
 * Validate a contact form submission. Guard clauses first, in order of
 * cheapest-to-check - never touch Firestore or send an email before every
 * field has been validated (same "validate before you touch data" fix from
 * the profile CODE-REVIEW.md).
 *
 * @param {object} body - raw parsed JSON request body
 * @returns {{ name: string, email: string, message: string }} trimmed, valid fields
 * @throws {AppError} 400 with a specific, client-safe message
 */
export function validateContactSubmission(body) {
  if (!body || typeof body !== 'object') throw badRequest('Request body is required');

  // Honeypot: a hidden field real users never fill in. A bot that fills
  // every field on the form trips this silently - no CAPTCHA needed for a
  // personal site's spam volume.
  if (body.company) throw badRequest('Submission rejected');

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (!name) throw badRequest('Name is required');
  if (name.length > 120) throw badRequest('Name is too long');

  if (!email) throw badRequest('Email is required');
  if (!EMAIL_PATTERN.test(email)) throw badRequest('Email is not valid');

  if (!message) throw badRequest('Message is required');
  if (message.length > MAX_MESSAGE_LENGTH) throw badRequest(`Message must be under ${MAX_MESSAGE_LENGTH} characters`);

  return { name, email, message };
}
