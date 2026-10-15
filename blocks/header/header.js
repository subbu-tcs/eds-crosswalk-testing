import { toClassName } from '../../scripts/aem.js';

// media query match that indicates desktop width
const isDesktop = window.matchMedia('(min-width: 900px)');
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

// interface labels for controls the fragment cannot carry (form controls are built in JS)
const LABELS = {
  close: 'Close',
  clear: 'Clear',
  back: 'Back',
  subMenu: 'sub-menu',
  openMenu: 'Open navigation',
  closeMenu: 'Close navigation',
};

/**
 * Fetches the nav fragment. Metadata independent: /content first (local preview),
 * then the site root (DA/EDS). Image paths are resolved against the fragment URL.
 * @returns {Promise<HTMLElement|null>} the fragment body, or null when unavailable
 */
async function fetchNavFragment() {
  let resp = await fetch('/content/nav.plain.html');
  if (!resp.ok) resp = await fetch('/nav.plain.html');
  if (!resp.ok) return null;
  // parse inertly so relative image paths are not requested before they are resolved
  const doc = new DOMParser().parseFromString(await resp.text(), 'text/html');
  const base = new URL(resp.url || '/nav.plain.html', window.location.href);
  doc.querySelectorAll('img[src]').forEach((img) => {
    img.setAttribute('src', new URL(img.getAttribute('src'), base).href);
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

function createIconButton(className, label) {
  const button = createElement('button', className, { type: 'button', 'aria-label': label });
  button.append(createElement('span', 'nav-icon', { 'aria-hidden': 'true' }));
  return button;
}

/** A visible "Back" button used by small-screen sub-panels. */
function createBackButton() {
  const button = createElement('button', 'nav-back', { type: 'button' });
  button.append(createElement('span', 'nav-icon', { 'aria-hidden': 'true' }), LABELS.back);
  return button;
}

/** Returns the search link of a section: a link whose query has an empty parameter. */
function findSearchLink(section) {
  return [...section.querySelectorAll('a[href]')].find((a) => {
    const url = new URL(a.href, window.location.href);
    return [...url.searchParams.values()].some((value) => value === '');
  });
}

/**
 * Turns consecutive paragraphs into cards. An image-only paragraph starts a card; a following
 * paragraph with strong text is its title, plain text its description and a link its call to
 * action. An image without title or link becomes a decorative figure.
 * @param {Element[]} nodes paragraphs in authored order
 * @returns {Element[]} decorated cards and figures
 */
function buildCards(nodes) {
  const groups = [];
  nodes.forEach((node) => {
    const media = node.querySelector('picture, img');
    if (media && !node.textContent.trim()) groups.push({ media, rest: [] });
    else if (groups.length) groups[groups.length - 1].rest.push(node);
  });
  // the authored paragraphs are replaced by the decorated cards
  nodes.forEach((node) => node.remove());

  return groups.map(({ media, rest }) => {
    const img = media.tagName === 'IMG' ? media : media.querySelector('img');
    if (img) img.loading = 'lazy';
    const titleNode = rest.find((p) => p.querySelector('strong') && !p.querySelector('a'));
    const textNode = rest.find((p) => p !== titleNode && !p.querySelector('a') && p.textContent.trim());
    const cta = rest.map((p) => p.querySelector('a')).find(Boolean);
    if (!titleNode && !cta) {
      const figure = createElement('div', 'nav-figure');
      figure.append(media);
      return figure;
    }
    const card = createElement('div', 'nav-card');
    const body = createElement('div', 'nav-card-body');
    if (titleNode) {
      const title = createElement('p', 'nav-card-title');
      title.textContent = titleNode.textContent.trim();
      body.append(title);
    }
    if (textNode) {
      const text = createElement('p', 'nav-card-text');
      text.textContent = textNode.textContent.trim();
      body.append(text);
    }
    if (cta) {
      cta.className = 'nav-card-cta';
      body.append(cta);
    }
    card.append(media, body);
    return card;
  });
}

/**
 * Cards whose titles all match link labels in the same panel form a set: one card shows at a
 * time and hovering or focusing a matching link swaps it in.
 */
function groupCards(cards, columns, panel) {
  const realCards = cards.filter((c) => c.classList.contains('nav-card'));
  if (realCards.length < 2 || !columns) return cards;
  const linkLabels = [...columns.querySelectorAll('a')]
    .map((a) => a.textContent.trim().toLowerCase());
  const titleOf = (card) => card.querySelector('.nav-card-title')?.textContent.trim().toLowerCase();
  if (!realCards.every((card) => linkLabels.includes(titleOf(card)))) return cards;

  const set = createElement('div', 'nav-card-set');
  set.append(...realCards);
  realCards[0].classList.add('is-active');
  const swap = (e) => {
    const link = e.target.closest('.nav-columns a');
    if (!link) return;
    const match = realCards.find((card) => titleOf(card) === link.textContent.trim().toLowerCase());
    if (!match) return;
    realCards.forEach((card) => card.classList.toggle('is-active', card === match));
  };
  panel.addEventListener('mouseover', swap);
  panel.addEventListener('focusin', swap);
  return [...cards.filter((c) => !realCards.includes(c)), set];
}

function decorateExternalLinks(root) {
  root.querySelectorAll('.nav-sublinks a[href]').forEach((a) => {
    if (new URL(a.href, window.location.href).origin !== window.location.origin) {
      a.classList.add('nav-external');
      a.append(createElement('span', 'nav-icon', { 'aria-hidden': 'true' }));
    }
  });
}

/**
 * Small screens: a group with sub-links gets an arrow button that opens its sub-links in a
 * sub-panel (Back button, group title, sub-links). Desktop shows the sub-links in place.
 */
function decorateDrillDown(group, title, sublinks) {
  const label = title?.textContent.trim() || '';
  const drill = createIconButton('nav-drill', `${label} ${LABELS.subMenu}`);
  drill.setAttribute('aria-expanded', 'false');
  const subpanel = createElement('div', 'nav-subpanel');
  const back = createBackButton();
  const heading = createElement('p', 'nav-subpanel-title');
  heading.textContent = label;
  sublinks.replaceWith(subpanel);
  subpanel.append(back, heading, sublinks);
  group.insertBefore(drill, subpanel);

  const toggle = (open) => {
    group.classList.toggle('is-drilled', open);
    drill.setAttribute('aria-expanded', String(open));
    (open ? back : drill).focus();
  };
  drill.addEventListener('click', () => toggle(true));
  back.addEventListener('click', () => toggle(false));
}

/**
 * Decorates a list of columns: column > list of groups > group title link + optional sub-links.
 */
function decorateColumns(list) {
  list.classList.add('nav-columns');
  [...list.children].forEach((column) => {
    column.classList.add('nav-column');
    column.querySelectorAll(':scope > ul > li').forEach((group) => {
      group.classList.add('nav-group');
      const title = group.querySelector(':scope > a');
      title?.classList.add('nav-group-title');
      const sublinks = group.querySelector(':scope > ul');
      if (sublinks) {
        sublinks.classList.add('nav-sublinks');
        decorateDrillDown(group, title, sublinks);
      }
    });
  });
}

/**
 * Builds a panel body from authored nodes: lead cards/figures, a list of link columns,
 * then trailing cards. Headings before the columns stay as the panel intro.
 * @param {Element[]} nodes authored content
 * @param {Element} panel the panel element (used for card-set events)
 * @returns {Element} the inner panel container
 */
function buildPanelBody(nodes, panel) {
  const inner = createElement('div', 'nav-panel-inner');
  const listIndex = nodes.findIndex((n) => n.tagName === 'UL');
  const columns = listIndex >= 0 ? nodes[listIndex] : null;
  const before = listIndex >= 0 ? nodes.slice(0, listIndex) : nodes;
  const after = listIndex >= 0 ? nodes.slice(listIndex + 1) : [];
  const intro = before.filter((n) => /^H[1-6]$/.test(n.tagName));

  if (columns) decorateColumns(columns);
  const main = createElement('div', 'nav-panel-main');
  main.append(...intro);
  if (columns) main.append(columns);

  const leadNodes = before.filter((n) => !intro.includes(n));
  const leadCards = groupCards(buildCards(leadNodes), columns, panel);
  const trailCards = groupCards(buildCards(after), columns, panel);
  inner.append(...leadCards, main);
  if (trailCards.length) {
    const aside = createElement('div', 'nav-panel-cards');
    aside.append(...trailCards);
    inner.append(aside);
  }
  decorateExternalLinks(inner);
  panel.append(inner);
  return inner;
}

/**
 * Builds region navigation for a panel whose content is grouped by sub-headings:
 * a list of region buttons scrolls a single scrollable list and tracks the visible region.
 */
function buildRegions(nodes, panel) {
  const inner = createElement('div', 'nav-panel-inner');
  const tabs = createElement('div', 'nav-regions-tabs');
  const box = createElement('div', 'nav-regions', { tabindex: '0' });
  const regions = [];
  let current = null;
  nodes.forEach((node) => {
    if (/^H[3-6]$/.test(node.tagName)) {
      current = createElement('section', 'nav-region');
      current.append(node);
      regions.push(current);
      box.append(current);
    } else if (current) {
      current.append(node);
    }
  });

  const locale = window.location.pathname.split('/')[1];
  box.querySelectorAll('li').forEach((entry) => {
    const langs = createElement('span', 'nav-region-langs');
    [...entry.childNodes].forEach((child) => {
      if (child.nodeType === Node.TEXT_NODE && /^[\s|]*$/.test(child.textContent)) child.remove();
      else if (child.tagName === 'A') {
        if (locale && new URL(child.href).pathname.split('/')[1] === locale) child.setAttribute('aria-current', 'true');
        langs.append(child);
      }
    });
    entry.append(langs);
  });

  const scrollToRegion = (region) => {
    box.scrollTo({ top: region.offsetTop - box.offsetTop, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
  };
  const names = regions.map((region) => region.querySelector('h3, h4, h5, h6').textContent);
  const buttons = regions.map((region, i) => {
    const button = createElement('button', 'nav-regions-tab', { type: 'button', 'aria-current': i === 0 ? 'true' : 'false' });
    button.textContent = names[i];
    button.addEventListener('click', () => scrollToRegion(region));
    return button;
  });
  tabs.append(...buttons);

  // small screens pick a region from a dropdown and show only that region
  const select = createElement('select', 'nav-regions-select', { 'aria-label': panel.getAttribute('aria-label') || '' });
  names.forEach((name, i) => select.append(new Option(name, String(i))));
  const showRegion = (index) => regions.forEach((region, i) => region.classList.toggle('is-selected', i === index));
  showRegion(0);
  select.addEventListener('change', () => showRegion(Number(select.value)));

  box.addEventListener('scroll', () => {
    const atEnd = box.scrollTop + box.clientHeight >= box.scrollHeight - 2;
    let active = 0;
    regions.forEach((region, i) => {
      if (region.offsetTop - box.offsetTop <= box.scrollTop + 8) active = i;
    });
    if (atEnd) active = regions.length - 1;
    buttons.forEach((b, i) => b.setAttribute('aria-current', i === active ? 'true' : 'false'));
  }, { passive: true });

  const body = createElement('div', 'nav-regions-body');
  body.append(tabs, select, box);
  inner.append(body);
  panel.append(inner);
  return inner;
}

/**
 * Creates a search form from a link (action URL, empty query parameter, placeholder text).
 * @param {Element} link the authored search link
 * @param {string} labelText accessible label and submit button text
 * @param {string} id input id
 * @param {boolean} withButtons adds the clear and submit buttons
 */
function createSearchForm(link, labelText, id, withButtons = true) {
  const url = new URL(link.href, window.location.href);
  const [param = 'q'] = [...url.searchParams.keys()];
  const form = createElement('form', 'nav-search-form', {
    action: `${url.origin}${url.pathname}`, method: 'get', role: 'search',
  });
  const label = createElement('label', 'nav-visually-hidden', { for: id });
  label.textContent = labelText;
  const field = createElement('div', 'nav-search-field');
  const input = createElement('input', '', {
    id, type: 'search', name: param, placeholder: link.textContent.trim(), autocomplete: 'off',
  });
  field.append(createElement('span', 'nav-icon nav-search-icon', { 'aria-hidden': 'true' }), input);
  form.append(label, field);
  form.addEventListener('submit', (e) => {
    if (!input.value.trim()) e.preventDefault();
  });
  if (!withButtons) return form;

  const clear = createIconButton('nav-search-clear', LABELS.clear);
  clear.hidden = true;
  const submit = createElement('button', 'nav-search-submit', { type: 'submit' });
  submit.textContent = labelText;
  submit.disabled = true;
  const sync = () => {
    const empty = !input.value.trim();
    submit.disabled = empty;
    clear.hidden = empty;
  };
  input.addEventListener('input', sync);
  clear.addEventListener('click', () => {
    input.value = '';
    sync();
    input.focus();
  });
  field.append(clear);
  form.append(submit);
  return form;
}

/**
 * Builds the search panel: the form, then optional suggestions authored after the search link
 * (sub-headings, a list of keyword links and suggestion cards).
 */
function buildSearchPanel(heading, link, nodes, panel) {
  const inner = createElement('div', 'nav-panel-inner');
  const form = createSearchForm(link, heading.textContent.trim(), `${panel.id}-input`);
  const formParagraph = link.closest('p');
  const rest = nodes.slice(nodes.indexOf(formParagraph) + 1);
  heading.classList.add('nav-visually-hidden');
  inner.append(heading, form);

  if (rest.length) {
    const suggest = createElement('div', 'nav-search-suggest');
    const cardNodes = [];
    rest.forEach((node) => {
      if (node.tagName === 'UL') node.classList.add('nav-search-keywords');
      if (node.tagName === 'P') cardNodes.push(node);
      else suggest.append(node);
    });
    const cards = createElement('div', 'nav-search-cards');
    cards.append(...buildCards(cardNodes));
    suggest.append(cards);
    inner.append(suggest);
  }
  panel.append(inner);
  return inner;
}

/**
 * Builds a panel from a fragment section that starts with a heading.
 * The section shape decides the panel type: link columns/cards, regions or a search form.
 * @returns {{ panel: Element, modal: boolean }}
 */
function buildSectionPanel(section, id) {
  const nodes = [...section.children];
  const heading = nodes.find((n) => /^H[1-6]$/.test(n.tagName));
  const panel = createElement('div', 'nav-panel', { id, role: 'region' });
  panel.hidden = true;
  if (heading) panel.setAttribute('aria-label', heading.textContent.trim());

  const searchLink = findSearchLink(section);
  if (searchLink) {
    panel.classList.add('nav-panel-search');
    buildSearchPanel(heading, searchLink, nodes, panel);
    return { panel, modal: true };
  }
  const back = createBackButton();
  if (section.querySelector('h3, h4, h5, h6')) {
    panel.classList.add('nav-panel-regions');
    const inner = buildRegions(nodes.filter((n) => n !== heading), panel);
    const top = createElement('div', 'nav-panel-header');
    top.append(heading);
    inner.prepend(back, top);
    return { panel, modal: true };
  }
  panel.classList.add('nav-panel-dropdown');
  buildPanelBody(nodes, panel).prepend(back);
  return { panel, modal: false };
}

/**
 * Coordinates panels: one open at a time, optional backdrop, outside click, Escape and focus.
 */
function createPanelController(block, navWrapper) {
  const backdrop = createElement('div', 'nav-backdrop');
  backdrop.hidden = true;
  block.prepend(backdrop);
  let open = null;
  let lockedScroll = false;
  const entries = [];

  const focusables = (panel) => [...panel.querySelectorAll('a[href], button:not([disabled]), input, select, [tabindex="0"]')]
    .filter((el) => el.offsetParent !== null);

  function close({ restoreFocus = false } = {}) {
    if (!open) return;
    const { trigger, panel } = open;
    trigger.setAttribute('aria-expanded', 'false');
    panel.hidden = true;
    backdrop.hidden = true;
    navWrapper.classList.remove('is-open');
    panel.querySelectorAll('.is-drilled').forEach((group) => group.classList.remove('is-drilled'));
    // only release the scroll lock this controller set (the mobile menu keeps its own lock)
    if (lockedScroll) document.body.style.overflowY = '';
    lockedScroll = false;
    if (restoreFocus) trigger.focus();
    open = null;
  }

  function show(entry, via) {
    if (open?.trigger === entry.trigger) return;
    close();
    const { trigger, panel, options } = entry;
    trigger.setAttribute('aria-expanded', 'true');
    panel.hidden = false;
    // the backdrop dims the page under desktop panels; small-screen panels cover the screen
    backdrop.hidden = !options.backdrop || !isDesktop.matches;
    navWrapper.classList.add('is-open');
    if (options.modal && document.body.style.overflowY !== 'hidden') {
      document.body.style.overflowY = 'hidden';
      lockedScroll = true;
    }
    open = { ...entry, via };
    if (options.modal) (panel.querySelector('input') || focusables(panel)[0])?.focus();
  }

  function register(trigger, panel, options) {
    const entry = { trigger, panel, options };
    entries.push(entry);
    panel.querySelector(':scope > .nav-panel-inner > .nav-back')?.addEventListener('click', () => close({ restoreFocus: true }));
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', panel.id);
    trigger.addEventListener('click', () => {
      // a click on a panel opened by hover keeps it open; the next click closes it
      if (open?.trigger === trigger && open.via === 'hover') open.via = 'click';
      else if (open?.trigger === trigger) close();
      else show(entry, 'click');
    });
    if (options.hover) {
      (options.hoverTarget || trigger).addEventListener('mouseenter', () => {
        if (isDesktop.matches) show(entry, 'hover');
      });
    }
    panel.querySelector('.nav-panel-close')?.addEventListener('click', () => close({ restoreFocus: true }));
  }

  backdrop.addEventListener('click', () => close());
  document.addEventListener('click', (e) => {
    if (!open || !open.options.closeOnOutsideClick || !isDesktop.matches) return;
    if (open.panel.contains(e.target) || open.trigger.contains(e.target)) return;
    close();
  });
  document.addEventListener('keydown', (e) => {
    if (!open) return;
    if (e.key === 'Escape') {
      close({ restoreFocus: true });
      return;
    }
    // keep keyboard focus inside modal panels
    if (e.key === 'Tab' && open.options.modal) {
      const items = focusables(open.panel);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  // desktop non-modal panels close when keyboard focus leaves them
  navWrapper.addEventListener('focusout', (e) => {
    if (!open || open.options.modal || !e.relatedTarget || !isDesktop.matches) return;
    if (!open.panel.contains(e.relatedTarget) && !open.trigger.contains(e.relatedTarget)) close();
  });
  isDesktop.addEventListener('change', () => close());

  /** Opens the first hover panel (the small-screen menu starts with its first section open). */
  const openFirst = () => {
    const first = entries.find((entry) => entry.options.hover);
    if (first) show(first, 'click');
  };
  const isOpen = () => !!open;

  return {
    register, close, openFirst, isOpen,
  };
}

/**
 * Replaces an in-page link (#panel) with a button that keeps the link's content.
 * Text is wrapped so small screens can show the icon alone.
 */
function linkToButton(link, className) {
  const button = createElement('button', className, { type: 'button' });
  [...link.childNodes].forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
      const label = createElement('span', 'nav-tool-label');
      label.textContent = child.textContent.trim();
      button.append(label);
    } else {
      button.append(child);
    }
  });
  if (!button.querySelector('.nav-tool-label') && !button.querySelector('img[alt]:not([alt=""])')) {
    button.setAttribute('aria-label', link.textContent.trim());
  }
  link.replaceWith(button);
  return button;
}

/**
 * Builds the main navigation: list items with a label paragraph open a megamenu built from
 * the rest of the item; items with a single link stay links.
 */
function decorateSections(section, controller) {
  const list = section.querySelector('ul');
  if (!list) return;
  list.classList.add('nav-sections-list');
  [...list.children].forEach((item, i) => {
    const label = item.querySelector(':scope > p');
    const content = [...item.children].filter((c) => c !== label);
    if (!label || !content.length) {
      item.classList.add('nav-item');
      return;
    }
    item.classList.add('nav-item', 'nav-drop');
    const id = `nav-panel-${toClassName(label.textContent) || i}`;
    const trigger = createElement('button', 'nav-drop-trigger', { type: 'button' });
    trigger.textContent = label.textContent.trim();
    const panel = createElement('div', 'nav-panel nav-panel-megamenu', { id, role: 'region', 'aria-label': trigger.textContent });
    panel.hidden = true;
    buildPanelBody(content, panel);
    label.replaceWith(trigger);
    item.append(panel);
    controller.register(trigger, panel, {
      hover: true, hoverTarget: trigger, backdrop: true, closeOnOutsideClick: true, modal: false,
    });
  });
}

/**
 * Utility items: an icon placed before a link joins that link (so the icon is the link on
 * small screens), separators become spans, and each item is classed by what it opens.
 */
function decorateUtilityItem(item) {
  const first = item.firstElementChild;
  const link = first?.tagName === 'IMG' ? first.nextElementSibling : null;
  if (link?.tagName === 'A') link.prepend(first);
  [...item.childNodes].forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE && child.textContent.trim()) {
      const sep = createElement('span', 'nav-tool-sep', { 'aria-hidden': 'true' });
      sep.textContent = child.textContent.trim();
      child.replaceWith(sep);
    }
  });
  const target = item.querySelector('a[href^="#"]');
  item.classList.add(target ? `nav-tool-${target.getAttribute('href').slice(1)}` : 'nav-tool-links');
}

/**
 * Tools: the first list is the utility row, the second the icon actions. Links to #slug open
 * the fragment section whose heading has that slug.
 */
function decorateTools(section, panelSections, controller, navWrapper) {
  const lists = section.querySelectorAll(':scope > ul');
  lists[0]?.classList.add('nav-utility');
  lists[1]?.classList.add('nav-actions');
  lists[0]?.querySelectorAll(':scope > li').forEach(decorateUtilityItem);

  section.querySelectorAll('a[href^="#"]').forEach((link) => {
    const slug = link.getAttribute('href').slice(1);
    const source = panelSections.get(slug);
    if (!source) return;
    const id = `nav-panel-${slug}`;
    const { panel, modal } = buildSectionPanel(source, id);
    if (modal) {
      const closeButton = createIconButton('nav-panel-close', LABELS.close);
      const top = panel.querySelector('.nav-panel-header') || panel.querySelector('.nav-panel-inner');
      top.prepend(closeButton);
    }
    const trigger = linkToButton(link, 'nav-tool-trigger');
    navWrapper.append(panel);
    controller.register(trigger, panel, {
      hover: false, backdrop: modal, closeOnOutsideClick: modal, modal,
    });
  });
}

/**
 * Small screens: the open menu starts with its own search field, built from the same search
 * link as the search panel.
 */
function buildMenuSearch(panelSections) {
  const section = [...panelSections.values()].find((s) => findSearchLink(s));
  if (!section) return null;
  const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
  const form = createSearchForm(findSearchLink(section), heading?.textContent.trim() || '', 'nav-menu-search-input', false);
  form.classList.add('nav-menu-search');
  return form;
}

/**
 * Builds a dismissible banner (small screens) from a section without a heading: image, strong
 * title, text and a link. Dismissal is remembered per banner link.
 */
function buildBanner(section) {
  const link = section.querySelector('a[href]');
  const key = `nav-banner-dismissed:${link?.getAttribute('href') || section.textContent.trim().slice(0, 40)}`;
  try {
    if (window.localStorage.getItem(key)) return null;
  } catch { /* storage unavailable: show the banner */ }
  const banner = createElement('div', 'nav-banner');
  const title = section.querySelector('strong');
  if (title) banner.setAttribute('aria-label', title.textContent.trim());
  banner.setAttribute('role', 'region');
  const dismiss = createIconButton('nav-banner-close', LABELS.close);
  const media = section.querySelector('picture, img');
  const text = createElement('div', 'nav-banner-text');
  [...section.querySelectorAll('p')].forEach((p) => {
    if (p.querySelector('picture, img') || p.querySelector('a')) return;
    p.className = p.querySelector('strong') ? 'nav-banner-title' : 'nav-banner-subtitle';
    text.append(p);
  });
  banner.append(dismiss);
  if (media) banner.append(media);
  banner.append(text);
  if (link) {
    link.className = 'nav-banner-link';
    banner.append(link);
  }
  dismiss.addEventListener('click', () => {
    const block = banner.closest('.header');
    banner.remove();
    if (block && !block.querySelector('.nav-banner')) block.classList.add('no-banner');
    try {
      window.localStorage.setItem(key, '1');
    } catch { /* storage unavailable: dismissed for this page only */ }
  });
  return banner;
}

/**
 * Opens or closes the small-screen menu. The menu slides in and out unless reduced motion is
 * preferred; it opens with its first section expanded.
 */
function toggleMobileMenu(nav, button, controller, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const finish = () => {
    nav.classList.remove('is-closing');
    nav.setAttribute('aria-expanded', 'false');
  };
  button.setAttribute('aria-label', expanded ? LABELS.openMenu : LABELS.closeMenu);
  if (expanded) {
    controller.close();
    document.body.style.overflowY = '';
    if (isDesktop.matches || prefersReducedMotion.matches || forceExpanded !== null) {
      finish();
    } else {
      nav.classList.add('is-closing');
      nav.addEventListener('animationend', finish, { once: true });
    }
    return;
  }
  nav.setAttribute('aria-expanded', 'true');
  document.body.style.overflowY = isDesktop.matches ? '' : 'hidden';
  controller.openFirst();
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  const fragment = await fetchNavFragment();
  if (!fragment) return;

  const sections = [...fragment.children].filter((c) => c.tagName === 'DIV');
  const [brand, main, tools, ...rest] = sections;
  // remaining sections are panels keyed by the slug of their first heading; sections without a
  // heading are banners
  const panelSections = new Map();
  const banners = [];
  rest.forEach((section) => {
    const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) panelSections.set(toClassName(heading.textContent), section);
    else banners.push(section);
  });

  block.textContent = '';
  const nav = createElement('nav', '', { id: 'nav', 'aria-expanded': 'false' });
  const navWrapper = createElement('div', 'nav-wrapper');
  navWrapper.append(nav);
  block.append(navWrapper);
  const controller = createPanelController(block, navWrapper);

  const renderedBanners = banners.map(buildBanner).filter(Boolean);
  block.prepend(...renderedBanners);
  // lets the header give back the space reserved for a banner when none is shown
  block.classList.toggle('no-banner', renderedBanners.length === 0);

  if (brand) {
    brand.className = 'nav-brand';
    brand.querySelectorAll('img').forEach((img) => { img.loading = 'eager'; });
    nav.append(brand);
  }
  const menuSearch = buildMenuSearch(panelSections);
  if (menuSearch) nav.append(menuSearch);
  if (main) {
    main.className = 'nav-sections';
    decorateSections(main, controller);
    nav.append(main);
  }
  if (tools) {
    tools.className = 'nav-tools';
    nav.append(tools);
    decorateTools(tools, panelSections, controller, navWrapper);
  }

  // hamburger for small screens; while the menu is open it becomes the close button
  const hamburger = createElement('div', 'nav-hamburger');
  const hamburgerButton = createElement('button', '', { type: 'button', 'aria-controls': 'nav', 'aria-label': LABELS.openMenu });
  hamburgerButton.append(createElement('span', 'nav-hamburger-icon'));
  hamburger.append(hamburgerButton);
  hamburgerButton.addEventListener('click', () => toggleMobileMenu(nav, hamburgerButton, controller));
  nav.prepend(hamburger);
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || isDesktop.matches || nav.getAttribute('aria-expanded') !== 'true') return;
    // Escape closes an open sub-panel or section first, then the menu
    if (controller.isOpen()) return;
    toggleMobileMenu(nav, hamburgerButton, controller);
    hamburgerButton.focus();
  });
  isDesktop.addEventListener('change', () => toggleMobileMenu(nav, hamburgerButton, controller, false));
}
