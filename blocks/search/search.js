const INDEX_PATH = '/query-index.json';
const PAGE_SIZE = 500;
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
// the header search link uses this parameter, so a search from any page lands here
const QUERY_PARAM = 'query';
const TYPING_DELAY = 250;

let indexRows;

async function fetchIndexPage(offset, rows) {
  const resp = await fetch(`${INDEX_PATH}?offset=${offset}&limit=${PAGE_SIZE}`);
  if (!resp.ok) throw new Error(`query index responded ${resp.status}`);
  const { data = [], total = 0 } = await resp.json();
  rows.push(...data);
  const next = offset + data.length;
  return data.length && next < total ? fetchIndexPage(next, rows) : rows;
}

/** Loads the whole query index once per page view. */
function loadIndex() {
  if (!indexRows) indexRows = fetchIndexPage(0, []);
  return indexRows;
}

function element(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
  return el;
}

/** Lower case, with Latin accents removed; Thai and other scripts keep their marks. */
function normalize(text) {
  return String(text || '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Block-level fields arrive as single-cell rows in model order. */
function readConfig(block) {
  const [label, placeholder, results, noResults] = [...block.children]
    .map((row) => row.textContent.trim());
  return {
    label: label || '',
    placeholder: placeholder || '',
    results: results || '{count}',
    noResults: noResults || '',
  };
}

/**
 * Fills {count} and {query}. A message may give singular and plural forms separated by "|",
 * e.g. "{count} result for {query} | {count} results for {query}".
 */
function fill(template, values) {
  const forms = template.split('|').map((form) => form.trim());
  const form = forms.length > 1 && values.count !== undefined
    ? forms[new Intl.PluralRules(document.documentElement.lang || undefined).select(values.count) === 'one' ? 0 : 1]
    : forms[0];
  return form.replace(/\{(count|query)\}/g, (_, key) => values[key] ?? '');
}

function precedingHeading(block) {
  const section = block.closest('.section');
  const ordered = [...(section?.querySelectorAll(`${HEADING_SELECTOR}, .block`) || [])];
  return ordered
    .slice(0, Math.max(ordered.indexOf(block), 0))
    .filter((el) => el.matches(HEADING_SELECTOR))
    .at(-1) || document.querySelector('main h1');
}

/**
 * Pages the search covers: titled, indexable pages of the current market (the first path
 * segment, e.g. /en-th/), without the nav, footer and fragments.
 */
function searchable(rows) {
  const [, market] = window.location.pathname.split('/');
  const scope = /^[a-z]{2}-[a-z]{2}$/.test(market || '') ? `/${market}/` : '/';
  return rows
    .filter((row) => row.title && row.path?.startsWith(scope))
    .filter((row) => !/noindex/i.test(row.robots || ''))
    .filter((row) => !/(^|\/)(nav|footer)$|\/fragments\//.test(row.path))
    .map((row) => ({
      ...row,
      $title: normalize(row.title),
      $keywords: normalize(row.keywords),
      $description: normalize(row.description),
    }));
}

/**
 * Every term must appear in the title, keywords or description. Matches in the title count
 * most, then keywords, then the description; the whole query in the title ranks first.
 */
function search(pages, query) {
  const phrase = normalize(query);
  const terms = phrase.split(' ').filter(Boolean);
  if (!terms.length) return [];
  return pages
    .map((page) => {
      const haystack = `${page.$title} ${page.$keywords} ${page.$description}`;
      if (!terms.every((term) => haystack.includes(term))) return null;
      let score = page.$title.includes(phrase) ? 10 : 0;
      if (page.$title.startsWith(phrase)) score += 2;
      terms.forEach((term) => {
        if (page.$title.includes(term)) score += 3;
        if (page.$keywords.includes(term)) score += 2;
        if (page.$description.includes(term)) score += 1;
      });
      return { page, score };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || a.page.title.localeCompare(b.page.title))
    .map(({ page }) => page);
}

/**
 * Text with the search terms wrapped in <mark>. Matching runs on the normalised text (so "cafe"
 * marks "Café"), and each match is mapped back to the original characters.
 */
function highlight(text, query) {
  const fragment = document.createDocumentFragment();
  const terms = normalize(query).split(' ').filter(Boolean);
  let flat = '';
  const origin = []; // index in text for each character of flat
  [...text].reduce((offset, char) => {
    const normal = normalize(char) || (/\s/.test(char) ? ' ' : '');
    [...normal].forEach(() => origin.push(offset));
    flat += normal;
    return offset + char.length;
  }, 0);
  const marked = new Array(text.length).fill(false);
  terms.forEach((term) => {
    let at = flat.indexOf(term);
    while (at !== -1) {
      const start = origin[at];
      const end = at + term.length < origin.length ? origin[at + term.length] : text.length;
      for (let i = start; i < end; i += 1) marked[i] = true;
      at = flat.indexOf(term, at + term.length);
    }
  });
  let i = 0;
  while (i < text.length) {
    let j = i;
    while (j < text.length && marked[j] === marked[i]) j += 1;
    const part = text.slice(i, j);
    if (marked[i]) {
      const mark = document.createElement('mark');
      mark.textContent = part;
      fragment.append(mark);
    } else fragment.append(part);
    i = j;
  }
  return fragment;
}

function renderResult(page, query, headingTag) {
  const li = element('li', 'search-result');
  const heading = element(headingTag, 'search-result-title');
  const link = element('a', '', { href: page.path });
  link.append(highlight(page.title, query));
  heading.append(link);
  li.append(heading);
  if (page.description) {
    const description = element('p', 'search-result-description');
    description.append(highlight(page.description, query));
    li.append(description);
  }
  const path = element('p', 'search-result-path');
  path.textContent = decodeURI(page.path);
  li.append(path);
  return li;
}

/**
 * loads and decorates the search block
 * @param {Element} block The search block element
 */
export default async function decorate(block) {
  const config = readConfig(block);
  const id = `search-${[...document.querySelectorAll('.search.block')].indexOf(block) + 1}`;
  const level = Number(precedingHeading(block)?.tagName.slice(1) || 1);
  const headingTag = `h${Math.min(level + 1, 6)}`;

  // a real GET form: without JavaScript it reloads this page with ?query=
  const form = element('form', 'search-form', { role: 'search', action: window.location.pathname, method: 'get' });
  const label = element('label', 'search-visually-hidden', { for: `${id}-input` });
  label.textContent = config.label;
  const field = element('div', 'search-field');
  const input = element('input', '', {
    id: `${id}-input`, type: 'search', name: QUERY_PARAM, autocomplete: 'off', enterkeyhint: 'search',
  });
  if (config.placeholder) input.placeholder = config.placeholder;
  field.append(element('span', 'search-icon', { 'aria-hidden': 'true' }), input);
  const submit = element('button', 'button primary search-submit', { type: 'submit' });
  submit.textContent = config.label;
  form.append(label, field, submit);

  const status = element('p', 'search-status', { role: 'status' });
  const results = element('ul', 'search-results', { 'aria-labelledby': `${id}-status` });
  status.id = `${id}-status`;
  block.replaceChildren(form, status, results);

  let pages = null;
  const render = async (query) => {
    const trimmed = query.trim();
    if (!trimmed) {
      status.textContent = '';
      results.replaceChildren();
      block.classList.remove('has-results', 'no-results');
      return;
    }
    try {
      pages ??= searchable(await loadIndex());
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('search: index unavailable', error);
      block.classList.add('no-results');
      status.textContent = fill(config.noResults, { query: trimmed });
      return;
    }
    const found = search(pages, trimmed);
    block.classList.toggle('has-results', found.length > 0);
    block.classList.toggle('no-results', found.length === 0);
    status.textContent = found.length
      ? fill(config.results, { count: found.length, query: trimmed })
      : fill(config.noResults, { query: trimmed });
    results.replaceChildren(...found.map((page) => renderResult(page, trimmed, headingTag)));
  };

  const syncUrl = (query) => {
    const url = new URL(window.location.href);
    if (query.trim()) url.searchParams.set(QUERY_PARAM, query.trim());
    else url.searchParams.delete(QUERY_PARAM);
    window.history.replaceState(null, '', url);
  };

  let timer;
  input.addEventListener('input', () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      syncUrl(input.value);
      render(input.value);
    }, TYPING_DELAY);
  });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    window.clearTimeout(timer);
    syncUrl(input.value);
    render(input.value);
  });

  const initial = new URLSearchParams(window.location.search).get(QUERY_PARAM) || '';
  input.value = initial;
  if (initial.trim()) await render(initial);
}
