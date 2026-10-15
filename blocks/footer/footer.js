// interface labels for controls the fragment cannot carry
const LABELS = {
  newTab: '(opens in a new tab)',
  backToTop: 'Scroll page to top',
};

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const isDesktop = window.matchMedia('(min-width: 900px)');

/**
 * Fetches the footer fragment. Metadata independent: /content first (local preview),
 * then the site root (DA/EDS). Image paths are resolved against the fragment URL.
 * @returns {Promise<HTMLElement|null>} the fragment body, or null when unavailable
 */
async function fetchFooterFragment() {
  let resp = await fetch('/content/footer.plain.html');
  if (!resp.ok) resp = await fetch('/footer.plain.html');
  if (!resp.ok) return null;
  // parse inertly so relative image paths are not requested before they are resolved
  const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
  const base = new URL(resp.url || '/footer.plain.html', window.location.href);
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.setAttribute('src', new URL(img.getAttribute('src'), base).href);
    img.loading = 'lazy';
  });
  doc.querySelectorAll('source[srcset]').forEach((source) => {
    source.setAttribute('srcset', new URL(source.getAttribute('srcset'), base).href);
  });
  return doc.body;
}

function createElement(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
  return el;
}

const isHeading = (el) => /^H[1-6]$/.test(el.tagName);
const imageOnly = (el) => !!el.querySelector('picture, img') && !el.textContent.trim();

/**
 * Links that leave the site or open a document open in a new tab and say so; text links get a
 * small icon marking an external page or a download.
 */
function decorateLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const url = new URL(a.href, window.location.href);
    const isDocument = /\.pdf$/i.test(url.pathname);
    const isExternal = url.origin !== window.location.origin;
    if (!isDocument && !isExternal) return;
    a.target = '_blank';
    a.rel = 'noopener';
    const note = createElement('span', 'footer-visually-hidden');
    note.textContent = ` ${LABELS.newTab}`;
    if (a.textContent.trim()) {
      a.classList.add(isDocument ? 'footer-link-download' : 'footer-link-external');
      a.append(createElement('span', 'footer-icon', { 'aria-hidden': 'true' }));
    }
    a.append(note);
  });
}

/** Headings each followed by a list become side-by-side link columns. */
function buildColumns(section) {
  const columns = [];
  [...section.children].forEach((node) => {
    if (isHeading(node)) {
      const column = createElement('div', 'footer-column');
      column.append(node);
      columns.push(column);
    } else if (columns.length) {
      columns[columns.length - 1].append(node);
    }
  });
  section.replaceChildren(...columns);
}

/**
 * Small screens: column headings toggle their lists, one open at a time. Desktop shows every
 * list with plain headings, so no inert toggle stays in the tab order.
 */
function setupAccordion(section) {
  const columns = [...section.querySelectorAll('.footer-column')];
  const apply = () => {
    columns.forEach((column, i) => {
      const heading = column.querySelector(':scope > h2, :scope > h3, :scope > h4');
      const list = column.querySelector(':scope > ul');
      if (!heading || !list) return;
      const existing = heading.querySelector('.footer-accordion-toggle');
      if (isDesktop.matches) {
        if (existing) existing.replaceWith(...existing.childNodes);
        list.hidden = false;
        return;
      }
      if (existing) return;
      list.id = list.id || `footer-column-${i}`;
      const toggle = createElement('button', 'footer-accordion-toggle', { type: 'button', 'aria-expanded': 'false', 'aria-controls': list.id });
      toggle.append(...heading.childNodes);
      heading.append(toggle);
      list.hidden = true;
      toggle.addEventListener('click', () => {
        const open = toggle.getAttribute('aria-expanded') !== 'true';
        columns.forEach((other) => {
          const otherToggle = other.querySelector('.footer-accordion-toggle');
          const otherList = other.querySelector(':scope > ul');
          if (!otherToggle || !otherList) return;
          const expand = other === column && open;
          otherToggle.setAttribute('aria-expanded', String(expand));
          otherList.hidden = !expand;
        });
      });
    });
  };
  apply();
  isDesktop.addEventListener('change', apply);
}

/**
 * A section whose first paragraph is an image becomes a card: the image fills the card, the
 * heading and text sit on it, and the links become its actions (a strong link is primary).
 */
function buildCard(section) {
  const media = section.querySelector('picture, img');
  const mediaWrap = createElement('div', 'footer-card-media');
  mediaWrap.append(media.closest('picture') || media);
  const text = createElement('div', 'footer-card-text');
  const actions = createElement('div', 'footer-card-actions');
  [...section.children].forEach((node) => {
    if (!node.textContent.trim()) return;
    const link = node.querySelector('a');
    if (link) {
      link.className = node.querySelector('strong') ? 'footer-button' : 'footer-button-secondary';
      actions.append(link);
    } else {
      text.append(node);
    }
  });
  section.replaceChildren(mediaWrap, text, actions);
}

/**
 * Classifies a fragment section by its content and decorates it.
 * @returns {string} the section role
 */
function decorateSection(section, isLast) {
  const headings = [...section.children].filter(isHeading);
  const lists = [...section.querySelectorAll(':scope > ul')];
  const iconList = lists.find((ul) => [...ul.children].every(imageOnly));
  if (iconList) iconList.classList.add('footer-icon-list');

  let role = 'promo';
  if (isLast && !headings.length) role = 'bottom';
  else if (headings.length > 1 && lists.length === headings.length && !iconList) role = 'links';
  else if (section.firstElementChild && imageOnly(section.firstElementChild)) role = 'card';
  else if (iconList && headings.length === 1 && lists.length === 1) role = 'social';

  section.className = `footer-section footer-${role}`;
  if (role === 'links') {
    buildColumns(section);
    setupAccordion(section);
  }
  if (role === 'card') buildCard(section);
  return role;
}

/** Fixed button that returns to the top; shown once the page has scrolled a screen. */
function buildBackToTop() {
  const button = createElement('button', 'footer-back-to-top', { type: 'button', 'aria-label': LABELS.backToTop });
  button.append(createElement('span', 'footer-icon', { 'aria-hidden': 'true' }));
  button.hidden = true;
  const sync = () => { button.hidden = window.scrollY < window.innerHeight; };
  window.addEventListener('scroll', sync, { passive: true });
  sync();
  button.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
    // move keyboard focus back to the start of the page
    const target = document.querySelector('header a, header button, main');
    target?.focus({ preventScroll: true });
  });
  return button;
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  const fragment = await fetchFooterFragment();
  if (!fragment) return;

  const sections = [...fragment.children].filter((c) => c.tagName === 'DIV');
  const main = createElement('div', 'footer-main');
  const extras = [];
  sections.forEach((section, i) => {
    const role = decorateSection(section, i === sections.length - 1);
    if (role === 'bottom') extras.push(section);
    else main.append(section);
  });
  decorateLinks(main);

  block.textContent = '';
  block.append(main, ...extras, buildBackToTop());
}
