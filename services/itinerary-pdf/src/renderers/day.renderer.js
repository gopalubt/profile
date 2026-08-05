'use strict';

const { esc, mediaUrl, mapHtml } = require('../html');
const { styles } = require('./styles');
const { config } = require('../config');

/**
 * Day renderers.
 *
 * The legacy file repeated near-identical markup five times - once each for
 * activities, F&B, transport, accommodation, and services - across roughly 450
 * lines. The blocks differ only in icon, heading, and field names, so they are
 * described as data here and rendered by one function.
 */

/**
 * @typedef {object} SectionSpec
 * @property {string} key       - property on the day object.
 * @property {string} countKey  - property on day.counts.
 * @property {string} icon      - Font Awesome 4 class.
 * @property {string} heading
 * @property {string} media
 * @property {string} title
 * @property {string} startTime
 * @property {string} endTime
 * @property {string} description
 * @property {string} [location]
 * @property {string} [from]
 * @property {string} [to]
 * @property {string} [rating]
 */

/** @type {SectionSpec[]} */
const SECTIONS = [
  {
    key: 'activities',
    countKey: 'activities',
    icon: 'fa-male',
    heading: 'Activity',
    media: 'activity_media',
    title: 'activity_title',
    startTime: 'activity_start_time',
    endTime: 'activity_end_time',
    location: 'activity_location',
    description: 'activity_description',
  },
  {
    key: 'fnbs',
    countKey: 'fnbs',
    icon: 'fa-cutlery',
    heading: 'Food & Beverage (F&B)',
    media: 'FNB_media',
    title: 'FNB_store_name',
    startTime: 'FNB_start_time',
    endTime: 'FNB_end_time',
    location: 'FNB_location',
    description: 'FNB_description',
    rating: 'FNB_rate',
  },
  {
    key: 'transports',
    countKey: 'transports',
    icon: 'fa-car',
    heading: 'Transportation',
    media: 'trans_media',
    title: 'trans_title',
    startTime: 'trans_start_time',
    endTime: 'trans_end_time',
    from: 'trans_from',
    to: 'trans_to',
    description: 'trans_description',
  },
  {
    key: 'accommodations',
    countKey: 'accommodations',
    icon: 'fa-bed',
    heading: 'Stays',
    media: 'accom_media',
    title: 'accom_name',
    startTime: 'accom_start_time',
    endTime: 'accom_end_time',
    location: 'accom_location',
    description: 'accom_description',
    rating: 'accom_rating',
  },
  {
    key: 'services',
    countKey: 'services',
    icon: 'fa-cog',
    heading: 'Services',
    media: 'service_media',
    title: 'service_title',
    startTime: 'service_start_time',
    endTime: 'service_end_time',
    location: 'service_location',
    description: 'service_description',
  },
];

/** A circular icon followed by text. */
function chip(iconClass, text, tone = 'brand') {
  return (
    `<span style="${styles.meta}">` +
    `<i class="fa ${iconClass}" style="${styles.chip(tone)}" aria-hidden="true"></i>` +
    `${esc(text)}</span>`
  );
}

/**
 * One entry inside a day section.
 * @param {object} item
 * @param {SectionSpec} spec
 * @param {string} mediaBaseUrl
 */
function renderSectionItem(item, spec, mediaBaseUrl) {
  const imageSrc = mediaUrl(mediaBaseUrl, item?.[spec.media], config.placeholderImageUrl);

  const place = spec.from
    ? `${esc(item?.[spec.from])} - ${esc(item?.[spec.to])}`
    : esc(item?.[spec.location]);

  const rating = spec.rating && item?.[spec.rating]
    ? chip('fa-star', item[spec.rating], 'warm')
    : '';

  return (
    `<div class="box-child" style="${styles.card}">` +
      `<img alt="" class="header_logo" src="${imageSrc}" style="${styles.cardImage}">` +
      '<div>' +
        `<h2 style="${styles.cardTitle}">${esc(item?.[spec.title])}</h2>` +
        `<div style="${styles.metaRow}">` +
          chip('fa-clock-o', `${esc(item?.[spec.startTime])} - ${esc(item?.[spec.endTime])}`, 'neutral') +
          `<span style="${styles.meta}">` +
            `<i class="fa fa-map-marker" style="${styles.chip('warm')}" aria-hidden="true"></i>${place}` +
          '</span>' +
          rating +
        '</div>' +
        `<div style="${styles.description}"><p>${esc(item?.[spec.description], '')}</p></div>` +
      '</div>' +
    '</div>'
  );
}

/**
 * A titled section, or '' when the day has no entries for it.
 * @param {object} day
 * @param {SectionSpec} spec
 * @param {string} mediaBaseUrl
 */
function renderSection(day, spec, mediaBaseUrl) {
  const items = day?.[spec.key];
  // Trust the array, not day.counts: counts and payload can disagree.
  if (!Array.isArray(items) || items.length === 0) return '';

  return (
    `<div class="Stays_hotel" style="${styles.sectionHeader}">` +
      `<div style="${styles.sectionHeaderText}">` +
        `<i class="fa ${spec.icon}" style="${styles.sectionIcon}" aria-hidden="true"></i>` +
        `${esc(spec.heading)}</div>` +
    '</div>' +
    mapHtml(items, (item) => renderSectionItem(item, spec, mediaBaseUrl))
  );
}

/**
 * Compact index entry listing what happens on a day.
 * @param {object} dayData
 * @param {number} index
 */
function renderDayLabel(dayData, index) {
  const title = dayData?.day?.title;

  const lines = SECTIONS.flatMap((spec) => {
    const items = dayData?.[spec.key];
    if (!Array.isArray(items) || items.length === 0) return [];

    return items.map((item) => {
      const place = spec.from
        ? `${esc(item?.[spec.from])} - ${esc(item?.[spec.to])}`
        : esc(item?.[spec.location]);

      return (
        `<div style="${styles.inlineRow}">` +
          chip(spec.icon, item?.[spec.title]) +
          chip('fa-clock-o', `${esc(item?.[spec.startTime])} - ${esc(item?.[spec.endTime])}`, 'neutral') +
          `<span style="${styles.meta}">` +
            `<i class="fa fa-map-marker" style="${styles.chip('warm')}" aria-hidden="true"></i>${place}` +
          '</span>' +
        '</div>'
      );
    });
  }).join('');

  return (
    '<div style="padding-bottom: 20px; width: 100%; float: left;">' +
      `<h2 style="${styles.dayLabelHeading}">Day ${index + 1} | ${esc(title, '')}</h2>` +
      `<div>${lines}</div>` +
    '</div>'
  );
}

/**
 * A full page for one day.
 * @param {object} dayData
 * @param {number} index
 * @param {string} mediaBaseUrl
 */
function renderDayPage(dayData, index, mediaBaseUrl) {
  const day = dayData?.day ?? {};
  const heroSrc = mediaUrl(mediaBaseUrl, day?.images?.[0], config.placeholderImageUrl);
  const sections = SECTIONS.map((spec) => renderSection(dayData, spec, mediaBaseUrl)).join('<br>');

  return (
    `<div class="main-container" style="${styles.page}">` +
      `<div class="Days-title" style="${styles.dayTitle}">Day ${index + 1}</div>` +
      '<div class="box-parent">' +
        `<div style="font-family: Open Sans, sans-serif; color: ${styles.text}; ` +
             'font-weight: normal; line-height: 25px; margin-top: 25px;">' +
          `<img alt="" class="header_logo" src="${heroSrc}" style="${styles.cardImage}">` +
          `<div style="font-size: 13px; font-weight: 500; color: ${styles.brand};">` +
            `<i class="fa fa-map-marker" style="${styles.chip()}"></i>${esc(day?.location)}` +
          '</div>' +
          `<h2 style="color: ${styles.brand}; margin-top: 5px; margin-bottom: 10px;">` +
            `${esc(day?.title, 'Itinerary')}</h2>` +
          `<p style="color: ${styles.text}; font-size: 13px;">${esc(day?.description, '')}</p>` +
        '</div>' +
      '</div>' +
      sections +
    '</div>'
  );
}

module.exports = { renderDayLabel, renderDayPage, SECTIONS };
