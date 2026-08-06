import { Resend } from 'resend';

/**
 * Send a notification email for a new contact submission.
 * Failures here are logged and swallowed by the caller (route.js) rather
 * than failing the whole request - the submission is already safely in
 * Firestore by the time this runs, so a flaky email provider shouldn't turn
 * into a 500 for the visitor. See route.js for the reasoning.
 *
 * @param {{ name: string, email: string, message: string }} submission
 */
export async function sendContactNotification(submission) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    throw new Error('Email is not configured - set RESEND_API_KEY, CONTACT_TO_EMAIL, CONTACT_FROM_EMAIL');
  }

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to,
    reply_to: submission.email,
    subject: `New contact form submission from ${submission.name}`,
    text: `From: ${submission.name} <${submission.email}>\n\n${submission.message}`,
  });

  if (error) throw new Error(error.message || 'Resend rejected the email');
}
