/* global GpApp */
'use strict';

/**
 * Page bootstrap for the portfolio.
 *
 * Every page shares the header/footer and swaps only the main partial, declared
 * on the mount element:  <div id="app" data-main="components/main.html">
 *
 * All partial paths are relative, so the same files work at
 * http://localhost:3000/ and at https://<user>.github.io/profile/ with no
 * environment sniffing.
 */

const DEFAULT_MAIN_COMPONENT = 'components/main.html';
const RESUME_URL = 'assets/data/resume.json';
const THEME_STORAGE_KEY = 'gsr:theme';

const ICON_LIGHT = '<i class="bi bi-brightness-high"></i>';
const ICON_DARK = '<i class="bi bi-moon"></i>';

const app = new GpApp('app', {}, {
  toggleDarkMode() {
    this.applyTheme(!this.darkMode);
    this.persistTheme();
  },
});

/**
 * Set the theme and sync every toggler button.
 * @param {boolean} enabled
 */
app.applyTheme = function applyTheme(enabled) {
  this.darkMode = enabled;
  this.appElement.classList.toggle('darkMode', enabled);
  this.appElement.querySelectorAll('.theme-toggler').forEach((button) => {
    button.innerHTML = enabled ? ICON_LIGHT : ICON_DARK;
    button.setAttribute('aria-pressed', String(enabled));
    button.setAttribute('aria-label', enabled ? 'Switch to light mode' : 'Switch to dark mode');
  });
};

/** Read the saved theme, falling back to the OS preference. */
app.readStoredTheme = function readStoredTheme() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'dark' || stored === 'light') return stored === 'dark';
  } catch {
    // Private browsing or blocked storage - fall through to the OS preference.
  }
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
};

app.persistTheme = function persistTheme() {
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, this.darkMode ? 'dark' : 'light');
  } catch {
    // Storage unavailable - the theme still applies for this page view.
  }
};

document.addEventListener('DOMContentLoaded', async () => {
  app.components = {
    header: 'components/header.html',
    main: app.appElement.dataset.main || DEFAULT_MAIN_COMPONENT,
    footer: 'components/footer.html',
  };

  app.created = async function created() {
    // A missing resume is not fatal: the page still renders its static copy.
    try {
      this.resume = await this.fetchData(this.resolvedUrlPath(RESUME_URL));
    } catch (error) {
      console.error('Could not load resume data; rendering static content only.', error);
      this.resume = null;
    }
  };

  await app.loadApp();
  app.applyTheme(app.readStoredTheme());
});
