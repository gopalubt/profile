'use strict';

/**
 * Inject an HTML partial into a container.
 *
 * Throws on a bad selector or a failed fetch so the caller can fail loudly.
 * The first draft ignored both, producing a silently blank PDF.
 *
 * @param {string} selector
 * @param {string} file - filename inside components/
 * @returns {Promise<void>}
 */
async function loadComponent(selector, file) {
  const container = document.querySelector(selector);
  if (!container) {
    throw new Error(`loadComponent: no element matches "${selector}"`);
  }

  const response = await fetch(`components/${file}`);
  if (!response.ok) {
    throw new Error(`loadComponent: failed to fetch ${file} - ${response.status}`);
  }

  container.innerHTML = await response.text();
}
