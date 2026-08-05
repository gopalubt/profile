'use strict';

/**
 * Inline style strings shared by the renderers.
 *
 * The PDF is rendered by Chromium from a single HTML string, and print engines
 * are unreliable with external stylesheets, so styles stay inline. Naming them
 * here keeps the markup readable and means a colour change happens once.
 */

const BRAND = '#2662d9';
const TEXT = '#202833';
const MUTED = '#56738f';

const styles = {
  brand: BRAND,
  text: TEXT,

  page:
    'max-width: 91%; width: 91%; margin: auto; font-family: Open Sans, sans-serif; ' +
    'border-radius: 10px; display: flow-root; page-break-after: always;',

  dayTitle:
    'padding-left: 15px; padding-top: 15px; border-top-left-radius: 10px; ' +
    `border-top-right-radius: 10px; background-color: ${BRAND}; color: #fff; ` +
    'height: 55px; font-weight: 900; font-size: 1.875rem;',

  dayLabelHeading:
    `font-size: 16px; font-weight: 600; margin-top: 0px; border-bottom: solid 2px ${BRAND}; ` +
    'padding-bottom: 10px;',

  sectionHeader:
    'background-color: #f0f5fe; border-radius: 7px; padding: 8px 10px; margin-top: 15px;',

  sectionHeaderText:
    `font-size: 13px; font-weight: 500; font-family: Open Sans, sans-serif; color: ${TEXT};`,

  sectionIcon: `color: ${BRAND}; margin-right: 7px;`,

  card:
    `font-family: Open Sans, sans-serif; color: ${TEXT}; font-weight: normal; ` +
    'line-height: 25px; margin-top: 20px;',

  cardImage:
    'height: 120px; width: 130px; float: left; padding: 0px; margin-right: 25px; ' +
    'margin-bottom: 10px; border-radius: 10px; overflow: hidden;',

  cardTitle:
    `color: ${BRAND}; margin-top: 5px; margin-bottom: 5px; font-size: 14px; font-weight: 500;`,

  metaRow: 'margin-bottom: 8px;',

  meta:
    `font-size: 13px; font-weight: 500; font-family: Open Sans, sans-serif; color: ${TEXT}; ` +
    'margin-right: 10px;',

  description: `color: ${TEXT}; font-size: 13px;`,

  inlineRow:
    `font-size: 13px; width: 100%; float: left; font-weight: 500; ` +
    `font-family: Open Sans, sans-serif; color: ${TEXT}; margin-bottom: 7px;`,

  /** Circular icon chip. `tone` picks the background/foreground pair. */
  chip(tone = 'brand') {
    const tones = {
      brand: { background: '#dfe8f9', color: '#2662da' },
      neutral: { background: '#e5e9ee', color: MUTED },
      warm: { background: '#ffeae5', color: '#e76343' },
    };
    const { background, color } = tones[tone] ?? tones.brand;
    return (
      `background-color: ${background}; width: 20px; height: 20px; text-align: center; ` +
      `border-radius: 50px; line-height: 20px; color: ${color}; font-size: 13px; margin-right: 7px;`
    );
  },
};

module.exports = { styles };
