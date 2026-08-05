'use strict';

const { esc, escapeRaw, mediaUrl, mapHtml } = require('../html');
const { styles } = require('./styles');
const { config } = require('../config');
const { renderDayLabel, renderDayPage } = require('./day.renderer');
const { renderMap } = require('./map.renderer');

/**
 * Assembles the complete PDF document.
 *
 * Everything interpolated here goes through `esc` first. The one deliberate
 * exception is `additional_details`, which is rich text authored in the admin
 * CMS - see `renderAdditionalDetails` for why and what guards it.
 */

/** Sections shown on the includes/self-pay/excludes page. */
const INCLUDE_COLUMNS = [
  { key: 'includes', label: 'Includes' },
  { key: 'selfpay', label: 'Self Pay' },
  { key: 'excludes', label: 'Excludes' },
];

/** Q&A headings, with the placeholder text used when a section is blank. */
const DEFAULT_QUESTIONS = {
  'Payment Conditions': 'Add Description',
  'Cancellation Conditions': 'Add Description',
  'Passport & Visa': 'Add Description',
  'Medical Advice': 'Add Description',
  'Travel Insurance': 'Add Description',
};

const DOCUMENT_STYLES = `
  @page { margin-left: 0; margin-right: 0; color: ${styles.text}; }
  @media print { body { padding: 0; margin: 0; font-size: 13px; } }
  body { font-family: 'Open Sans', sans-serif; color: ${styles.text}; margin: 0; }
  h1, h2, h3 { font-family: 'Open Sans', sans-serif; }
  li.title { list-style: none; padding: 2px 0; }
  .page-heading { font-size: 1.7rem; text-align: center; font-weight: 700; color: ${styles.brand}; }
`;

function renderCover(templateData, entity, mediaBaseUrl) {
  const heroSrc = mediaUrl(mediaBaseUrl, templateData?.media?.image, config.placeholderImageUrl);
  const owner = templateData?.HRMS_REGISTERED_USER ?? {};
  const ownerName = [owner.first_name, owner.last_name].filter(Boolean).join(' ');

  return (
    `<div class="main-container" style="${styles.page}">` +
      `<img src="${heroSrc}" alt="" style="width: 100%; height: 260px; object-fit: cover; border-radius: 10px;">` +
      `<h1 style="color: ${styles.brand}; margin-top: 20px;">${esc(templateData?.title, 'Itinerary')}</h1>` +
      `<p style="font-size: 13px;">${esc(templateData?.description, '')}</p>` +
      `<div style="font-size: 13px; margin-top: 15px;">` +
        `<div><strong>Pax:</strong> ${esc(templateData?.number_of_pax, '-')} ` +
          `${esc(templateData?.paxType?.pax_type_name, '')}</div>` +
        (ownerName ? `<div><strong>Prepared by:</strong> ${esc(ownerName)}</div>` : '') +
        (owner.emp_personal_email ? `<div><strong>Email:</strong> ${esc(owner.emp_personal_email)}</div>` : '') +
        (owner.contact_number ? `<div><strong>Phone:</strong> ${esc(owner.contact_number)}</div>` : '') +
      '</div>' +
      `<div style="color: ${styles.text}; margin-top: 15px; font-size: 12px;">` +
        `<i class="fa fa-map-marker" style="color: ${styles.brand}; margin-right: 7px;"></i>` +
        `${esc(entity?.registered_office, '')}` +
      '</div>' +
    '</div>'
  );
}

function renderIncludesPage(allData, additionalDetailsHtml) {
  const columns = INCLUDE_COLUMNS.map(({ key, label }) => {
    const items = mapHtml(
      allData?.[key],
      (item) => `<li class="title">${esc(item?.title)}</li>`,
      '<li class="title">NA</li>',
    );

    return (
      '<td style="background-color: #f7f7f7; width: 33.33333%; padding: 15px 10px; vertical-align: top;">' +
        '<span style="display: flex; align-items: center;">' +
          `<span style="font-size: 1.2rem; color: ${styles.brand}; font-weight: 500;">${esc(label)}</span>` +
        '</span>' +
        `<div style="font-size: 12px; padding: 2rem 0.5rem;">${items}</div>` +
      '</td>'
    );
  }).join('');

  return (
    `<div class="main-container" style="${styles.page}">` +
      '<div class="page-heading">INCLUDES / SELF PAY / EXCLUDES</div>' +
      `<table style="width: 100%; border-spacing: 15px 20px;"><tr>${columns}</tr></table>` +
      additionalDetailsHtml +
    '</div>'
  );
}

/**
 * Rich text from the CMS, rendered as HTML.
 *
 * This is the only unescaped interpolation in the document. It is safe only
 * because the field is authored by internal staff in the admin CMS. If that
 * ever changes, or if the field becomes customer-editable, run it through a
 * sanitiser (DOMPurify / sanitize-html) with an allow-list instead.
 */
function renderAdditionalDetails(additionalData) {
  const html = additionalData?.[0]?.additional_details;
  const body = typeof html === 'string' && html.trim() !== '' ? html : 'NA';

  return (
    `<h3 style="font-size: 1rem; color: ${styles.text};">Additional details</h3>` +
    `<div style="color: ${styles.text};">${body}</div>`
  );
}

function renderQuestionsPage(questionsAnswers) {
  const supplied = questionsAnswers ?? {};

  const blocks = Object.entries(DEFAULT_QUESTIONS)
    .map(([heading, placeholder]) => {
      const value = supplied[heading];
      const body = typeof value === 'string' && value.trim() !== '' ? esc(value) : esc(placeholder);
      return (
        '<div style="margin-bottom: 18px;">' +
          `<h3 style="font-size: 1rem; color: ${styles.brand}; margin-bottom: 4px;">${esc(heading)}</h3>` +
          `<div style="font-size: 12px; color: ${styles.text};">${body}</div>` +
        '</div>'
      );
    })
    .join('');

  return (
    `<div class="main-container" style="${styles.page}">` +
      '<div class="page-heading">TERMS &amp; CONDITIONS</div>' +
      `<div style="margin-top: 20px;">${blocks}</div>` +
    '</div>'
  );
}

/**
 * Build the whole document.
 *
 * @param {object} input
 * @param {object} input.templateData
 * @param {Array}  input.templateDays
 * @param {object} input.allData
 * @param {Array}  input.additionalData
 * @param {object} input.questionsAnswers
 * @param {Array}  input.locations
 * @param {object} input.entity
 * @param {string} input.mediaBaseUrl
 * @returns {string} a complete HTML document.
 */
function renderItineraryDocument({
  templateData,
  templateDays,
  allData,
  additionalData,
  questionsAnswers,
  locations,
  entity,
  mediaBaseUrl,
}) {
  // map + join, not `+=` inside forEach: the legacy version used an async
  // forEach callback, so any await would have appended after the string was used.
  const dayIndex = templateDays.map((day, index) => renderDayLabel(day, index)).join('');
  const dayPages = templateDays.map((day, index) => renderDayPage(day, index, mediaBaseUrl)).join('');

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${esc(templateData?.title, 'Itinerary')}</title>
    <link href="https://fonts.googleapis.com/css2?family=Open+Sans:ital,wght@0,300..800;1,300..800&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css">
    <style>${DOCUMENT_STYLES}</style>
  </head>
  <body>
    ${renderCover(templateData, entity, mediaBaseUrl)}
    <div class="main-container" style="${styles.page}">
      <div class="page-heading">TRIP SUMMARY</div>
      ${renderMap(locations)}
      ${dayIndex}
    </div>
    ${dayPages}
    ${renderIncludesPage(allData, renderAdditionalDetails(additionalData))}
    ${renderQuestionsPage(questionsAnswers)}
  </body>
</html>`;
}

module.exports = { renderItineraryDocument, DEFAULT_QUESTIONS, escapeRaw };
