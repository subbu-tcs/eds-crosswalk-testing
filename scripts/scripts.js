import {
  getMetadata,
  loadBlock,
  toClassName,
  loadHeader,
  loadFooter,
  decorateIcons,
  decorateSections,
  decorateBlocks,
  decorateTemplateAndTheme,
  waitForFirstImage,
  loadSection,
  loadSections,
  loadCSS,
} from './aem.js';

/**
 * The market of the current page: the first path segment when it is language-country,
 * e.g. "en-th" or "th-th"; empty for pages outside a market.
 * @returns {string}
 */
export function getMarket() {
  const [, segment = ''] = window.location.pathname.split('/');
  return /^[a-z]{2}-[a-z]{2}$/.test(segment) ? segment : '';
}

/** The page language from the market: "th-th" -> "th-TH", "en-th" -> "en-TH"; else "en". */
function marketLanguage() {
  const market = getMarket();
  if (!market) return 'en';
  const [language, country] = market.split('-');
  return `${language}-${country.toUpperCase()}`;
}

let placeholders;

async function fetchSheet(path) {
  try {
    const resp = await fetch(path);
    if (!resp.ok) return {};
    const json = await resp.json();
    const rows = Array.isArray(json.data) ? json.data : json[json[':names']?.[0]]?.data || [];
    return Object.fromEntries(rows
      .filter((row) => row.Key || row.key)
      .map((row) => [toClassName(row.Key || row.key), row.Text ?? row.text ?? '']));
  } catch {
    return {};
  }
}

/**
 * Loads the interface labels once per page view: the site-wide placeholders sheet
 * (/placeholders.json), overridden by the market's (/en-th/placeholders.json).
 * Each sheet has Key and Text columns.
 * @returns {Promise<Object<string, string>>} labels by key ("header-open-menu")
 */
export function fetchPlaceholders() {
  if (!placeholders) {
    const market = getMarket();
    placeholders = Promise.all([
      fetchSheet('/placeholders.json'),
      market ? fetchSheet(`/${market}/placeholders.json`) : {},
    ]).then(([site, local]) => ({ ...site, ...local }));
  }
  return placeholders;
}

/**
 * A block's interface labels: its English defaults, replaced by any sheet entry keyed
 * "<block>-<label>", e.g. header + openMenu -> "header-open-menu".
 * @param {string} block block name
 * @param {Object<string, string>} defaults labels by camelCase name
 * @returns {Promise<Object<string, string>>}
 */
export async function getLabels(block, defaults) {
  const sheet = await fetchPlaceholders();
  return Object.fromEntries(Object.entries(defaults).map(([name, text]) => {
    const key = toClassName(`${block}-${name.replace(/([a-z0-9])([A-Z])/g, '$1-$2')}`);
    return [name, String(sheet[key] ?? '').trim() || text];
  }));
}

/**
 * Moves all the attributes from a given elmenet to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveAttributes(from, to, attributes) {
  if (!attributes) {
    // eslint-disable-next-line no-param-reassign
    attributes = [...from.attributes].map(({ nodeName }) => nodeName);
  }
  attributes.forEach((attr) => {
    const value = from.getAttribute(attr);
    if (value) {
      to?.setAttribute(attr, value);
      from.removeAttribute(attr);
    }
  });
}

/**
 * Move instrumentation attributes from a given element to another given element.
 * @param {Element} from the element to copy attributes from
 * @param {Element} to the element to copy attributes to
 */
export function moveInstrumentation(from, to) {
  moveAttributes(
    from,
    to,
    [...from.attributes]
      .map(({ nodeName }) => nodeName)
      .filter((attr) => attr.startsWith('data-aue-') || attr.startsWith('data-richtext-')),
  );
}

/**
 * load fonts.css and set a session storage flag
 */
async function loadFonts() {
  await loadCSS(`${window.hlx.codeBasePath}/styles/fonts.css`);
  try {
    if (!window.location.hostname.includes('localhost')) sessionStorage.setItem('fonts-loaded', 'true');
  } catch (e) {
    // do nothing
  }
}

/**
 * Builds all synthetic blocks in a container element.
 * @param {Element} main The container element
 */
function buildAutoBlocks() {
  try {
    // TODO: add auto block, if needed
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Auto Blocking failed', error);
  }
}

/**
 * Decorates formatted links to style them as buttons.
 * @param {HTMLElement} main The main container element
 */
export function decorateButtons(main) {
  main.querySelectorAll('p a[href]').forEach((a) => {
    a.title = a.title || a.textContent;
    const p = a.closest('p');
    const text = a.textContent.trim();

    // quick structural checks
    if (a.querySelector('img') || p.textContent.trim() !== text) return;

    // skip URL display links
    try {
      if (new URL(a.href).href === new URL(text, window.location).href) return;
    } catch { /* continue */ }

    // require authored formatting for buttonization
    const strong = a.closest('strong');
    const em = a.closest('em');
    if (!strong && !em) return;

    p.className = 'button-wrapper';
    a.className = 'button';
    if (strong && em) { // high-impact call-to-action
      a.classList.add('accent');
      const outer = strong.contains(em) ? strong : em;
      outer.replaceWith(a);
    } else if (strong) {
      a.classList.add('primary');
      strong.replaceWith(a);
    } else {
      a.classList.add('secondary');
      em.replaceWith(a);
    }
  });
}

/**
 * Decorates the main element.
 * @param {Element} main The main element
 */
// eslint-disable-next-line import/prefer-default-export
export function decorateMain(main) {
  decorateIcons(main);
  buildAutoBlocks(main);
  decorateSections(main);
  decorateBlocks(main);
  decorateButtons(main);
}

function createSlot(name) {
  const wrapper = document.createElement('div');
  wrapper.className = `${name}-wrapper`;
  const block = document.createElement('div');
  block.className = `${name} block`;
  block.dataset.blockName = name;
  block.dataset.blockStatus = 'initialized';
  wrapper.append(block);
  return wrapper;
}

/**
 * Adds the notification ticker and breadcrumb slots between the header and the page content.
 * Both are filled after the main content has loaded, so they don't delay the largest paint:
 * - the ticker reserves its height when this market had active notices on the previous page,
 *   so it only moves the page on the first visit;
 * - the breadcrumb always reserves its bar. Home pages ("/", "/en-th/") and pages with
 *   Hide breadcrumb on get none.
 * @param {Element} main The main element
 */
function prepareHeaderSlots(main) {
  const notifications = createSlot('notifications');
  const [, market] = window.location.pathname.split('/');
  try {
    if (sessionStorage.getItem(`notifications:${market}`) === 'shown') notifications.classList.add('is-reserved');
  } catch { /* storage unavailable: no reservation */ }
  main.before(notifications);

  const path = window.location.pathname.replace(/\.html$/, '').replace(/\/(index)?$/, '');
  if (!path || /^\/[a-z]{2}-[a-z]{2}$/.test(path) || getMetadata('hidebreadcrumb') === 'true') return;
  main.before(createSlot('breadcrumb'));
}

/**
 * Loads everything needed to get to LCP.
 * @param {Element} doc The container element
 */
async function loadEager(doc) {
  document.documentElement.lang = marketLanguage();
  decorateTemplateAndTheme();
  const main = doc.querySelector('main');
  if (main) {
    decorateMain(main);
    prepareHeaderSlots(main);
    document.body.classList.add('appear');
    await loadSection(main.querySelector('.section'), waitForFirstImage);
  }

  try {
    /* if desktop (proxy for fast connection) or fonts already loaded, load fonts.css */
    if (window.innerWidth >= 900 || sessionStorage.getItem('fonts-loaded')) {
      loadFonts();
    }
  } catch (e) {
    // do nothing
  }
}

/**
 * Loads everything that doesn't need to be delayed.
 * @param {Element} doc The container element
 */
async function loadLazy(doc) {
  loadHeader(doc.querySelector('header'));

  const main = doc.querySelector('main');
  await loadSections(main);

  const { hash } = window.location;
  const element = hash ? doc.getElementById(hash.substring(1)) : false;
  if (hash && element) element.scrollIntoView();

  loadFooter(doc.querySelector('footer'));
  doc.querySelectorAll(':is(.notifications-wrapper, .breadcrumb-wrapper) > .block').forEach(loadBlock);

  loadCSS(`${window.hlx.codeBasePath}/styles/lazy-styles.css`);
  loadFonts();
}

/**
 * Loads everything that happens a lot later,
 * without impacting the user experience.
 */
function loadDelayed() {
  // eslint-disable-next-line import/no-cycle
  window.setTimeout(() => import('./delayed.js'), 3000);
  // load anything that can be postponed to the latest here
}

async function loadPage() {
  await loadEager(document);
  await loadLazy(document);
  loadDelayed();
}

loadPage();
