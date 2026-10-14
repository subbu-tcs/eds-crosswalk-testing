import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// block-level fields rendered by Crosswalk as leading single-cell rows, in model order
const CONFIG_FIELDS = ['searchLabel', 'noResultsMessage'];
const SEARCH_DEBOUNCE_MS = 150;
const supportsExclusiveDetails = typeof HTMLDetailsElement !== 'undefined'
  && 'name' in HTMLDetailsElement.prototype;

let groupCounter = 0;

function uniqueId(base) {
  let id = base;
  let n = 2;
  while (document.getElementById(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

function normalize(text) {
  return (text || '').toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Removes the leading config rows and returns their text values by field name.
 * @param {Element} block
 * @returns {Object<string, string>}
 */
function readConfig(block) {
  const config = {};
  CONFIG_FIELDS.forEach((field) => {
    const row = block.firstElementChild;
    if (row && row.children.length === 1) {
      config[field] = row.textContent.trim();
      row.remove();
    }
  });
  return config;
}

function optimizePictures(container) {
  container.querySelectorAll('picture > img').forEach((img) => {
    const optimized = createOptimizedPicture(img.src, img.alt, false, [
      { media: '(width >= 900px)', width: '1200' },
      { width: '750' },
    ]);
    moveInstrumentation(img, optimized.querySelector('img'));
    img.closest('picture').replaceWith(optimized);
  });
}

function buildSummary(labelCell) {
  const summary = document.createElement('summary');
  summary.className = 'accordion-item-label';
  // unwrap a single paragraph: <summary> only accepts phrasing content
  const source = labelCell.children.length === 1 && labelCell.firstElementChild.matches('p')
    ? labelCell.firstElementChild
    : labelCell;
  moveInstrumentation(labelCell, summary);
  if (source !== labelCell) moveInstrumentation(source, summary);
  const title = document.createElement('span');
  title.className = 'accordion-item-title';
  title.append(...source.childNodes);
  summary.append(title);
  return summary;
}

/**
 * Turns one authored row (summary cell, body cell) into a <details> item.
 * Rows without a summary keep their content visible instead of being dropped.
 */
function buildItem(row, index, options) {
  const [labelCell, bodyCell = document.createElement('div')] = row.children;
  bodyCell.className = 'accordion-item-body';
  optimizePictures(bodyCell);

  const summaryText = labelCell?.textContent.trim();
  if (!summaryText) {
    const untitled = document.createElement('div');
    untitled.className = 'accordion-item accordion-item-untitled';
    moveInstrumentation(row, untitled);
    untitled.append(bodyCell);
    row.replaceWith(untitled);
    return untitled;
  }

  const details = document.createElement('details');
  details.className = 'accordion-item';
  moveInstrumentation(row, details);
  details.id = uniqueId(`${options.idPrefix}-${toClassName(summaryText) || index + 1}`);
  if (options.groupName) details.name = options.groupName;
  details.append(buildSummary(labelCell), bodyCell);
  // keep every item open while authoring so all fields stay editable in place
  if (options.editing) details.open = true;
  row.replaceWith(details);
  return details;
}

function enableSingleOpenFallback(block) {
  block.addEventListener('toggle', (event) => {
    const opened = event.target;
    if (!opened.matches?.('details.accordion-item') || !opened.open) return;
    block.querySelectorAll('details.accordion-item[open]').forEach((other) => {
      if (other !== opened) other.open = false;
    });
  }, true);
}

function openFromHash(block) {
  const id = decodeURIComponent(window.location.hash.slice(1));
  if (!id) return;
  const target = block.querySelector(`details#${CSS.escape(id)}`);
  if (!target) return;
  target.open = true;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  target.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
  target.querySelector('summary')?.focus({ preventScroll: true });
}

function enablePrintExpansion(block) {
  let restore = [];
  window.addEventListener('beforeprint', () => {
    restore = [...block.querySelectorAll('details.accordion-item:not([open])')];
    restore.forEach((item) => { item.open = true; });
  });
  window.addEventListener('afterprint', () => {
    restore.forEach((item) => { item.open = false; });
    restore = [];
  });
}

/**
 * Adds an on-page search that hides non-matching items.
 * Requires an authored search label; without it the block stays a plain accordion.
 */
function addSearch(block, items, { searchLabel, noResultsMessage }) {
  if (!searchLabel || !items.length) return;

  const form = document.createElement('form');
  form.className = 'accordion-search';
  form.setAttribute('role', 'search');
  const inputId = uniqueId('accordion-search');

  const label = document.createElement('label');
  label.setAttribute('for', inputId);
  label.textContent = searchLabel;

  const input = document.createElement('input');
  input.type = 'search';
  input.id = inputId;
  input.name = 'q';
  input.autocomplete = 'off';

  const status = document.createElement('p');
  status.className = 'accordion-search-status';
  status.setAttribute('role', 'status');

  form.append(label, input);
  form.addEventListener('submit', (event) => event.preventDefault());

  const index = items.map((item) => ({ item, text: normalize(item.textContent) }));
  const apply = () => {
    const query = normalize(input.value);
    let matches = 0;
    index.forEach(({ item, text }) => {
      const match = !query || text.includes(query);
      item.hidden = !match;
      if (match) matches += 1;
    });
    status.textContent = query && matches === 0 ? noResultsMessage || '' : '';
  };

  let timer;
  input.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(apply, SEARCH_DEBOUNCE_MS);
  });

  block.prepend(form, status);
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const config = readConfig(block);
  const editing = block.hasAttribute('data-aue-resource');
  const single = block.classList.contains('single') && !editing;
  groupCounter += 1;

  const options = {
    editing,
    idPrefix: 'accordion',
    groupName: single && supportsExclusiveDetails ? `accordion-group-${groupCounter}` : '',
  };

  const items = [...block.children]
    .filter((row) => row.children.length)
    .map((row, index) => buildItem(row, index, options));

  if (single && !supportsExclusiveDetails) enableSingleOpenFallback(block);
  if (block.classList.contains('faq')) addSearch(block, items, config);

  enablePrintExpansion(block);
  openFromHash(block);
  window.addEventListener('hashchange', () => openFromHash(block));
}
