import { toClassName } from '../../scripts/aem.js';

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

function uniqueId(base) {
  let id = base;
  let n = 2;
  while (document.getElementById(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

function scrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

// section metadata keys may arrive as "tabLabel" or "tab-label"
function tabLabelOf(section) {
  return (section.dataset.tabLabel || section.dataset.tablabel || '').trim();
}

/**
 * Collects the consecutive sections after the block's own section that carry a tab label.
 * @param {Element} ownSection
 * @returns {Element[]}
 */
function collectPanels(ownSection) {
  const panels = [];
  let next = ownSection?.nextElementSibling;
  while (next?.classList.contains('section') && tabLabelOf(next)) {
    panels.push(next);
    next = next.nextElementSibling;
  }
  return panels;
}

function ensureId(panel, index) {
  if (!panel.id) panel.id = uniqueId(`tab-${toClassName(tabLabelOf(panel)) || index + 1}`);
  return panel.id;
}

/**
 * Names the tab list or nav: authored label first, otherwise the nearest heading above the block.
 */
function applyAccessibleName(block, labelText, element) {
  if (labelText) {
    element.setAttribute('aria-label', labelText);
    return;
  }
  const section = block.closest('.section');
  // headings and blocks in document order; keep the last heading that precedes this block
  const ordered = [...(section?.querySelectorAll(`${HEADING_SELECTOR}, .block`) || [])];
  const heading = ordered
    .slice(0, Math.max(ordered.indexOf(block), 0))
    .filter((el) => el.matches(HEADING_SELECTOR))
    .at(-1);
  if (heading) {
    if (!heading.id) heading.id = uniqueId(toClassName(heading.textContent) || 'tabs-heading');
    element.setAttribute('aria-labelledby', heading.id);
  }
}

function keepTabInView(tablist, tab) {
  const { offsetLeft, offsetWidth } = tab;
  if (offsetLeft < tablist.scrollLeft) {
    tablist.scrollLeft = offsetLeft;
  } else if (offsetLeft + offsetWidth > tablist.scrollLeft + tablist.clientWidth) {
    tablist.scrollLeft = offsetLeft + offsetWidth - tablist.clientWidth;
  }
}

function panelIndexForHash(panels) {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return { index: -1 };
  const target = document.getElementById(id);
  const index = target ? panels.findIndex((panel) => panel.contains(target)) : -1;
  return { index, target };
}

/**
 * WAI-ARIA tabs with automatic activation over sections that stay in place.
 */
function buildTabs(block, panels, { labelText, editing }) {
  const tablist = document.createElement('div');
  tablist.className = 'tabs-list';
  tablist.setAttribute('role', 'tablist');
  applyAccessibleName(block, labelText, tablist);

  const tabs = panels.map((panel, index) => {
    const panelId = ensureId(panel, index);
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.className = 'tabs-tab';
    tab.id = uniqueId(`${panelId}-tab`);
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panelId);
    tab.textContent = tabLabelOf(panel);

    panel.classList.add('tabs-panel');
    panel.setAttribute('role', 'tabpanel');
    panel.setAttribute('aria-labelledby', tab.id);
    panel.tabIndex = 0;

    tablist.append(tab);
    return tab;
  });

  let current = 0;
  const select = (index, { focus = false } = {}) => {
    current = index;
    tabs.forEach((tab, i) => {
      const selected = i === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      // every panel stays visible while authoring so it remains editable
      if (!editing) panels[i].hidden = !selected;
    });
    keepTabInView(tablist, tabs[index]);
    if (focus) tabs[index].focus();
    if (editing) panels[index].scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  };

  tablist.addEventListener('click', (event) => {
    const index = tabs.indexOf(event.target.closest('[role="tab"]'));
    if (index >= 0) select(index);
  });

  tablist.addEventListener('keydown', (event) => {
    const last = tabs.length - 1;
    const moves = {
      ArrowRight: current === last ? 0 : current + 1,
      ArrowLeft: current === 0 ? last : current - 1,
      Home: 0,
      End: last,
    };
    if (!(event.key in moves)) return;
    event.preventDefault();
    select(moves[event.key], { focus: true });
  });

  const showFromHash = () => {
    const { index, target } = panelIndexForHash(panels);
    if (index < 0) return;
    select(index);
    target.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
  };

  let hiddenBeforePrint = [];
  window.addEventListener('beforeprint', () => {
    hiddenBeforePrint = panels.filter((panel) => panel.hidden);
    hiddenBeforePrint.forEach((panel) => { panel.hidden = false; });
  });
  window.addEventListener('afterprint', () => {
    hiddenBeforePrint.forEach((panel) => { panel.hidden = true; });
    hiddenBeforePrint = [];
  });
  window.addEventListener('hashchange', showFromHash);

  block.append(tablist);
  const { index: initial } = panelIndexForHash(panels);
  select(Math.max(initial, 0));
  if (initial >= 0) showFromHash();
}

/**
 * Sticky jump links; all sections stay visible and the one in view is marked current.
 */
function buildAnchorNav(block, panels, { labelText }) {
  const nav = document.createElement('nav');
  nav.className = 'tabs-anchor-nav';
  applyAccessibleName(block, labelText, nav);
  const list = document.createElement('ul');

  const links = panels.map((panel, index) => {
    const id = ensureId(panel, index);
    panel.classList.add('tabs-anchor-target');
    panel.tabIndex = -1;
    const item = document.createElement('li');
    const link = document.createElement('a');
    link.href = `#${id}`;
    link.textContent = tabLabelOf(panel);
    link.addEventListener('click', (event) => {
      event.preventDefault();
      panel.scrollIntoView({ block: 'start', behavior: scrollBehavior() });
      window.history.pushState(null, '', `#${id}`);
      panel.focus({ preventScroll: true });
    });
    item.append(link);
    list.append(item);
    return link;
  });
  nav.append(list);
  block.append(nav);

  // stick below the fixed header only when the block has its section to itself
  const ownSection = block.closest('.section');
  const sticky = ownSection && ownSection.children.length === 1;
  if (sticky) ownSection.classList.add('tabs-anchor-section');

  const updateOffset = () => {
    const offset = `${nav.offsetHeight}px`;
    panels.forEach((panel) => panel.style.setProperty('--tabs-anchor-offset', offset));
  };
  updateOffset();
  const resizeObserver = new ResizeObserver(updateOffset);
  resizeObserver.observe(nav);

  const visible = new Set();
  const markCurrent = () => {
    const currentIndex = panels.findIndex((panel) => visible.has(panel));
    links.forEach((link, i) => {
      if (i === currentIndex) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  };
  const spy = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    markCurrent();
  }, { rootMargin: '-30% 0px -60% 0px' });
  panels.forEach((panel) => spy.observe(panel));

  if (sticky) {
    // release the sticky bar once the last panel has scrolled past
    const lastPanel = panels[panels.length - 1];
    const endObserver = new IntersectionObserver(([entry]) => {
      const past = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
      ownSection.classList.toggle('tabs-anchor-ended', past);
    });
    endObserver.observe(lastPanel);
  }
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const labelText = block.firstElementChild?.textContent.trim() || '';
  block.replaceChildren();

  const panels = collectPanels(block.closest('.section'));
  if (!panels.length) return;

  const options = {
    labelText,
    editing: block.hasAttribute('data-aue-resource'),
  };
  if (block.classList.contains('anchor')) buildAnchorNav(block, panels, options);
  else buildTabs(block, panels, options);
}
