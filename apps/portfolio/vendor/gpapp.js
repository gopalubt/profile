/**
 * GpApp - a small declarative template engine for static sites.
 *
 * Directives:
 *   data-gp-component="name"       Replace this element with an HTML partial.
 *   data-gp-for="item of a.b"      Repeat this element once per array entry.
 *   data-gp-text="item.label"      Set textContent. SAFE - escapes automatically. Prefer this.
 *   data-gp-html="item.body"       Set innerHTML. UNSAFE - trusted content only.
 *   data-gp-src="item.thumb"       Set src (URL-validated).
 *   data-gp-href="item.url"        Set href (URL-validated).
 *   data-gp-alt="item.label"       Set alt text.
 *
 * Events:
 *   data-e="click:methodName"      Delegated to the method map passed to the constructor.
 */
class GpApp {
  /**
   * Directive -> DOM property. `dataset` is the camelCase key the browser exposes.
   * Explicit map instead of deriving names from string offsets.
   */
  static DIRECTIVES = Object.freeze({
    'data-gp-text': { property: 'textContent', dataset: 'gpText' },
    'data-gp-html': { property: 'innerHTML', dataset: 'gpHtml' },
    'data-gp-src': { property: 'src', dataset: 'gpSrc', isUrl: true },
    'data-gp-href': { property: 'href', dataset: 'gpHref', isUrl: true },
    'data-gp-alt': { property: 'alt', dataset: 'gpAlt' },
  });

  /** Protocols permitted in data-gp-src / data-gp-href. Blocks `javascript:` and `data:`. */
  static SAFE_PROTOCOLS = Object.freeze(['http:', 'https:', 'mailto:', 'tel:']);

  /** Instance internals that templates must never be able to walk into. */
  static RESERVED_KEYS = Object.freeze([
    'appElement', 'virtualDOM', 'methods', 'components', 'templates', 'constructor',
  ]);

  /**
   * @param {string} appElementId - id of the mount element.
   * @param {object} [data] - initial data exposed to templates.
   * @param {Record<string, Function>} [methods] - handlers referenced by data-e.
   */
  constructor(appElementId, data = {}, methods = {}) {
    const appElement = document.getElementById(appElementId);
    if (!appElement) {
      throw new Error(`GpApp: no element found with id "${appElementId}"`);
    }

    this.appElement = appElement;
    this.virtualDOM = appElement;
    this.methods = { ...methods };
    this.components = {};
    this.darkMode = false;
    this.eventsAttached = false;

    // Spread caller data onto the instance so templates can use `resume.x`
    // rather than `data.resume.x`.
    Object.assign(this, data);
  }

  /** Override to load data before the first render. */
  async created() {}

  /**
   * Boot: load partials, run the created hook, then render.
   * Errors surface to the user instead of leaving a blank page.
   */
  async loadApp() {
    try {
      this.virtualDOM = this.appElement;
      await this.loadComponents(this.components);
      await this.created();
      this.renderDOM();
    } catch (error) {
      console.error('GpApp: failed to load app.', error);
      this.renderFatalError();
      throw error;
    }
  }

  renderFatalError() {
    this.appElement.innerHTML =
      '<div role="alert" class="alert alert-warning m-4">' +
      'This content failed to load. Please refresh the page.' +
      '</div>';
  }

  // ---------------------------------------------------------------- rendering

  renderDOM() {
    this.expandLoops();
    this.bindAttributes(this.virtualDOM, null);
    this.stripDirectives(this.virtualDOM);
    this.attachEventDelegation();
  }

  /** Expand every data-gp-for into one clone per array entry. */
  expandLoops() {
    // Snapshot: populateTemplateLoop replaces nodes while we iterate.
    const loops = [...this.virtualDOM.querySelectorAll('[data-gp-for]')];
    loops.forEach((element) => this.populateTemplateLoop(element, element.dataset.gpFor));
  }

  /**
   * @param {Element} element - the template node, removed once expanded.
   * @param {string} expression - "item of collection.path"
   */
  populateTemplateLoop(element, expression) {
    const [item, collectionPath] = String(expression).split(' of ').map((part) => part?.trim());
    if (!item || !collectionPath) {
      console.warn(`GpApp: malformed data-gp-for "${expression}". Expected "item of path".`);
      return;
    }

    const collection = this.resolveDataPath(collectionPath);
    if (!Array.isArray(collection)) {
      // Not an error: data may legitimately be absent. Drop the template so no
      // unpopulated placeholder is left in the DOM.
      element.remove();
      return;
    }

    const parent = element.parentElement;
    if (!parent) return;

    const fragment = document.createDocumentFragment();
    collection.forEach((dataItem) => {
      const clone = element.cloneNode(true);
      clone.removeAttribute('data-gp-for');
      this.bindAttributes(clone, { [item]: dataItem });
      this.stripDirectives(clone);
      fragment.appendChild(clone);
    });

    parent.replaceChild(fragment, element);
  }

  /**
   * Apply every directive found in `root` (and on `root` itself).
   * @param {Element} root
   * @param {object|null} scope - loop scope, or null to read from the instance.
   */
  bindAttributes(root, scope) {
    Object.entries(GpApp.DIRECTIVES).forEach(([attribute, config]) => {
      const targets = [...root.querySelectorAll(`[${attribute}]`)];
      if (root.hasAttribute?.(attribute)) targets.push(root);

      targets.forEach((element) => {
        this.setElementValue(element, config, element.dataset[config.dataset], scope);
      });
    });
  }

  /**
   * @param {Element} element
   * @param {{property: string, isUrl?: boolean}} config
   * @param {string} dataKey - dot path, e.g. "skill.label"
   * @param {object|null} scope
   */
  setElementValue(element, config, dataKey, scope) {
    if (!element || !dataKey) return;

    const value = this.resolveDataPath(dataKey, scope);
    if (value === null || value === undefined) {
      element[config.property] = '';
      return;
    }

    if (config.isUrl && !GpApp.isSafeUrl(value)) {
      console.warn(`GpApp: blocked unsafe URL for ${config.property}:`, value);
      element[config.property] = '';
      return;
    }

    element[config.property] = value;
  }

  /**
   * Walk a dot path against a loop scope, or the instance when no scope applies.
   * Reserved internals are never reachable from a template.
   * @returns {*} the value, or null if any segment is missing.
   */
  resolveDataPath(path, scope = null) {
    const keys = String(path).split('.').map((key) => key.trim());
    const [root] = keys;
    if (!root) return null;

    let cursor;
    if (scope && root in scope) {
      cursor = scope[root];
    } else {
      if (GpApp.RESERVED_KEYS.includes(root)) {
        console.warn(`GpApp: "${root}" is reserved and not readable from templates.`);
        return null;
      }
      cursor = this[root];
    }

    for (const key of keys.slice(1)) {
      if (cursor === null || cursor === undefined) return null;
      cursor = cursor[key];
    }

    return cursor === undefined ? null : cursor;
  }

  /** Reject javascript:, data:, and other non-navigational schemes. */
  static isSafeUrl(value) {
    const url = String(value).trim();
    if (url === '') return false;
    // Relative URLs never carry a protocol, so they are always safe.
    if (/^[./#?]/.test(url) || !url.includes(':')) return true;

    try {
      return GpApp.SAFE_PROTOCOLS.includes(new URL(url, document.baseURI).protocol);
    } catch {
      return false;
    }
  }

  /** Remove data-gp-* attributes so they don't ship in the rendered output. */
  stripDirectives(root) {
    const elements = [root, ...root.querySelectorAll('*')];
    elements.forEach((element) => {
      if (!element.attributes) return;
      [...element.attributes]
        .filter((attribute) => attribute.name.startsWith('data-gp-'))
        .forEach((attribute) => element.removeAttribute(attribute.name));
    });
  }

  // ------------------------------------------------------------------ events

  attachEventDelegation() {
    if (this.eventsAttached) return; // loadApp may run more than once
    this.appElement.addEventListener('click', (event) => this.delegateDynamicEvent(event, 'click'));
    this.appElement.addEventListener('input', (event) => this.delegateDynamicEvent(event, 'input'));
    this.eventsAttached = true;
  }

  delegateDynamicEvent(event, eventType) {
    const target = event.target.closest('[data-e]');
    if (!target) return;

    const [eventKey, methodName] = target.dataset.e.split(':');
    if (eventKey !== eventType) return;

    const method = this.methods[methodName];
    if (typeof method !== 'function') {
      console.error(`GpApp: method "${methodName}" is not defined.`);
      return;
    }

    method.call(this, event);
  }

  // ------------------------------------------------------------- data & HTML

  /**
   * Fetch JSON. Throws on failure so callers decide how to degrade.
   * @throws {Error} on network failure or non-2xx response.
   */
  async fetchData(url, options = {}) {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`GpApp: request to ${url} failed - ${response.status} ${response.statusText}`);
    }
    return response.json();
  }

  /**
   * Resolve an app-relative path against the deployment base.
   * Uses <base href> when present, so no environment sniffing is needed.
   */
  resolvedUrlPath(path) {
    return new URL(String(path).replace(/^\//, ''), document.baseURI).href;
  }

  async loadHTML(url, options = {}) {
    const response = await fetch(this.resolvedUrlPath(url), options);
    if (!response.ok) {
      throw new Error(`GpApp: failed to fetch ${url} - ${response.status} ${response.statusText}`);
    }
    return response.text();
  }

  createVirtualDOM(html) {
    const container = document.createElement('div');
    container.innerHTML = html;
    return container;
  }

  /**
   * Replace every [data-gp-component="name"] placeholder with its partial.
   * @param {string} name
   * @param {string} url
   */
  async loadComponent(name, url) {
    const html = await this.loadHTML(url);
    // Snapshot before mutating: replaceWith detaches nodes from the live list.
    const placeholders = [...this.virtualDOM.querySelectorAll(`[data-gp-component="${name}"]`)];

    placeholders.forEach((placeholder) => {
      const template = this.createVirtualDOM(html);
      placeholder.replaceWith(...template.childNodes);
    });
  }

  /** Load all partials in parallel rather than one round trip at a time. */
  async loadComponents(components) {
    const entries = Object.entries(components ?? {});
    if (entries.length === 0) return;
    await Promise.all(entries.map(([name, url]) => this.loadComponent(name, url)));
  }
}

// Export for bundlers/tests; stays a global for plain <script> usage.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = GpApp;
}
