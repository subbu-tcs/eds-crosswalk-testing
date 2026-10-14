import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';

const INDEX_PATH = '/query-index.json';
const PAGE_SIZE = 500;
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const DAY_MS = 24 * 60 * 60 * 1000;

let indexRows;

async function fetchIndexPage(offset, rows) {
  const resp = await fetch(`${INDEX_PATH}?offset=${offset}&limit=${PAGE_SIZE}`);
  if (!resp.ok) throw new Error(`query index responded ${resp.status}`);
  const { data = [], total = 0 } = await resp.json();
  rows.push(...data);
  const next = offset + data.length;
  return data.length && next < total ? fetchIndexPage(next, rows) : rows;
}

/** Loads the whole query index once per page view, shared by every listing block. */
function loadIndex() {
  if (!indexRows) indexRows = fetchIndexPage(0, []);
  return indexRows;
}

function uniqueId(base) {
  let id = base;
  let n = 2;
  while (document.getElementById(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

function normalizePath(href) {
  if (!href) return '';
  const { pathname } = new URL(href, window.location.origin);
  return pathname.replace(/\.html$/, '').replace(/\/$/, '');
}

function normalizeText(text) {
  return (text || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Parses ISO dates, date-only values and epoch seconds/milliseconds.
 * Date-only end dates are inclusive, so they are moved to the end of that day.
 */
function parseDate(value, { endOfDay = false } = {}) {
  if (value === undefined || value === null || value === '') return null;
  const text = String(value).trim();
  if (/^\d+$/.test(text)) {
    const n = Number(text);
    return new Date(n < 1e11 ? n * 1000 : n);
  }
  const time = Date.parse(text);
  if (Number.isNaN(time)) return null;
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(text);
  return new Date(dateOnly && endOfDay ? time + DAY_MS - 1 : time);
}

/** Block-level fields arrive as single-cell rows in model order: folder, categories, limit. */
function readConfig(block) {
  const [folderRow, categoriesRow, limitRow] = [...block.children];
  const folderCell = folderRow?.firstElementChild;
  const folder = normalizePath(
    folderCell?.querySelector('a')?.getAttribute('href') || folderCell?.textContent.trim(),
  );
  const categories = (categoriesRow?.textContent || '')
    .split(',')
    .map(normalizeText)
    .filter(Boolean);
  const limit = Number.parseInt(limitRow?.textContent, 10);
  return {
    folder,
    categories,
    limit: Number.isInteger(limit) && limit > 0 ? limit : Infinity,
    showFilter: block.classList.contains('filter'),
  };
}

function selectItems(rows, { folder, categories }) {
  const now = Date.now();
  return rows
    .filter((row) => row.path?.startsWith(`${folder}/`) && row.title)
    .map((row) => ({
      ...row,
      dateValue: parseDate(row.date),
      start: parseDate(row.validfrom),
      end: parseDate(row.validto, { endOfDay: true }),
      modified: parseDate(row.lastModified),
    }))
    .filter((item) => !(item.start && item.start.getTime() > now))
    .filter((item) => !(item.end && item.end.getTime() < now))
    .filter((item) => !categories.length || categories.includes(normalizeText(item.category)))
    .sort((a, b) => {
      const ta = (a.dateValue || a.modified)?.getTime() || 0;
      const tb = (b.dateValue || b.modified)?.getTime() || 0;
      return tb - ta;
    });
}

function precedingHeading(block) {
  const section = block.closest('.section');
  const ordered = [...(section?.querySelectorAll(`${HEADING_SELECTOR}, .block`) || [])];
  return ordered
    .slice(0, Math.max(ordered.indexOf(block), 0))
    .filter((el) => el.matches(HEADING_SELECTOR))
    .at(-1);
}

function element(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text) el.textContent = text;
  return el;
}

function renderCard(item, { headingTag, dateFormat }) {
  const li = element('li', 'listing-item');
  const article = element('article', 'listing-card');

  if (item.image) {
    const media = element('div', 'listing-card-image');
    // decorative: the linked title next to it carries the meaning
    media.append(createOptimizedPicture(item.image, '', false, [
      { media: '(width >= 900px)', width: '750' },
      { width: '600' },
    ]));
    article.append(media);
  }

  const body = element('div', 'listing-card-body');
  if (item.category) body.append(element('p', 'listing-card-category', item.category));
  const heading = element(headingTag, 'listing-card-title');
  const link = element('a', '', item.title);
  link.href = item.path;
  heading.append(link);
  body.append(heading);
  if (item.description) body.append(element('p', 'listing-card-description', item.description));
  if (item.dateValue) {
    const time = element('time', 'listing-card-date', dateFormat.format(item.dateValue));
    time.dateTime = item.dateValue.toISOString();
    body.append(time);
  }
  article.append(body);
  li.append(article);
  return li;
}

function buildFilter(items, list, heading, onChange) {
  const labels = new Map();
  items.forEach((item) => {
    const key = normalizeText(item.category);
    if (key && !labels.has(key)) labels.set(key, item.category.trim());
  });
  if (labels.size < 2) return null;

  const group = element('div', 'listing-filter');
  group.setAttribute('role', 'group');
  if (heading) {
    if (!heading.id) heading.id = uniqueId(toClassName(heading.textContent) || 'listing-heading');
    group.setAttribute('aria-labelledby', heading.id);
  }
  const buttons = [...labels].map(([key, label]) => {
    const button = element('button', 'listing-filter-option', label);
    button.type = 'button';
    button.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-controls', list.id);
    button.addEventListener('click', () => {
      const pressed = button.getAttribute('aria-pressed') === 'true';
      buttons.forEach((b) => b.setAttribute('aria-pressed', 'false'));
      if (!pressed) button.setAttribute('aria-pressed', 'true');
      onChange(pressed ? '' : key);
    });
    group.append(button);
    return button;
  });
  return group;
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default async function decorate(block) {
  const config = readConfig(block);
  const heading = precedingHeading(block);
  block.replaceChildren();
  if (!config.folder) {
    block.hidden = true;
    return;
  }

  const list = element('ul', 'listing-items');
  list.id = uniqueId('listing-items');
  list.setAttribute('aria-busy', 'true');
  block.append(list);

  let items = [];
  try {
    items = selectItems(await loadIndex(), config);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('listing: could not load the query index', error);
  }
  list.removeAttribute('aria-busy');

  if (!items.length) {
    block.hidden = true;
    return;
  }

  const level = heading ? Math.min(Number(heading.tagName[1]) + 1, 6) : 2;
  const options = {
    headingTag: `h${level}`,
    dateFormat: new Intl.DateTimeFormat(document.documentElement.lang || undefined, { dateStyle: 'long' }),
  };
  const render = (category) => {
    const visible = items
      .filter((item) => !category || normalizeText(item.category) === category)
      .slice(0, config.limit);
    list.replaceChildren(...visible.map((item) => renderCard(item, options)));
    list.firstElementChild?.classList.add('listing-item-first');
  };

  if (config.showFilter) {
    const filter = buildFilter(items, list, heading, render);
    if (filter) block.prepend(filter);
  }
  render('');
}
