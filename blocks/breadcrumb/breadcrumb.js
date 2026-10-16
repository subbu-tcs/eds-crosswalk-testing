import { getMetadata } from '../../scripts/aem.js';

const INDEX_PATH = '/query-index.json';
const PAGE_SIZE = 500;
// interface labels the content cannot carry (until the per-market labels sheet exists)
const LABELS = { nav: 'Breadcrumb', home: 'Home' };

async function fetchIndexPage(offset, rows) {
  const resp = await fetch(`${INDEX_PATH}?offset=${offset}&limit=${PAGE_SIZE}`);
  if (!resp.ok) throw new Error(`query index responded ${resp.status}`);
  const { data = [], total = 0 } = await resp.json();
  rows.push(...data);
  const next = offset + data.length;
  return data.length && next < total ? fetchIndexPage(next, rows) : rows;
}

const normalize = (path) => String(path || '').replace(/\.html$/, '').replace(/\/(index)?$/, '');
const clean = (text) => String(text || '').replace(/\s+/g, ' ').trim();
// "Checked Baggage Allowance & Rules | Thai Airways" -> "Checked Baggage Allowance & Rules"
const shortTitle = (title) => clean(title).split(/\s+[|–]\s+/)[0];

/**
 * The trail: the market home, then every ancestor path that is a published page, then this page.
 * Labels: each page's Breadcrumb title, otherwise its title without the site name.
 */
function buildTrail(rows) {
  const pages = new Map(rows.map((row) => [normalize(row.path), row]));
  const path = normalize(window.location.pathname);
  const segments = path.split('/').filter(Boolean);
  const market = /^[a-z]{2}-[a-z]{2}$/.test(segments[0] || '') ? `/${segments[0]}` : '';
  const home = pages.get(market);
  const trail = [{ href: `${market}/`, label: clean(home?.breadcrumbtitle) || LABELS.home }];

  for (let i = market ? 2 : 1; i < segments.length; i += 1) {
    const ancestor = `/${segments.slice(0, i).join('/')}`;
    const page = pages.get(ancestor);
    if (page) {
      trail.push({ href: page.path, label: clean(page.breadcrumbtitle) || shortTitle(page.title) });
    }
  }

  const current = clean(getMetadata('breadcrumbtitle'))
    || clean(document.querySelector('main h1')?.textContent)
    || shortTitle(document.title);
  trail.push({ label: current, current: true });
  return trail.filter((item) => item.label);
}

/** BreadcrumbList structured data for search engines. */
function addStructuredData(trail) {
  const script = document.createElement('script');
  script.type = 'application/ld+json';
  script.textContent = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      item: new URL(item.href || window.location.pathname, window.location.origin).href,
    })),
  });
  document.head.append(script);
}

/**
 * loads and decorates the breadcrumb
 * @param {Element} block The breadcrumb block element
 */
export default async function decorate(block) {
  let rows = [];
  try {
    rows = await fetchIndexPage(0, []);
  } catch (error) {
    // without the index the trail is home and this page
    // eslint-disable-next-line no-console
    console.error('breadcrumb: index unavailable', error);
  }
  const trail = buildTrail(rows);

  const nav = document.createElement('nav');
  nav.setAttribute('aria-label', LABELS.nav);
  const list = document.createElement('ol');
  trail.forEach((item) => {
    const li = document.createElement('li');
    if (item.current) {
      const span = document.createElement('span');
      span.setAttribute('aria-current', 'page');
      span.textContent = item.label;
      li.append(span);
    } else {
      const a = document.createElement('a');
      a.href = item.href;
      a.textContent = item.label;
      li.append(a);
    }
    list.append(li);
  });
  nav.append(list);
  block.replaceChildren(nav);
  addStructuredData(trail);
}
