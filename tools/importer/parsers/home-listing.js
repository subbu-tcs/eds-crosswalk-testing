/* eslint-disable */
/* global WebImporter */

/**
 * Parser for home-listing (project block "listing").
 * Source: the home page's three generated lists, marked by thaiairways-home.js:
 *   offers    "Discover your next adventure" (h1, intro, Show All Offers) + 5 special offers
 *   partners  "Exclusive Deals with Our Partners" (Show All Partner Privileges) + slider
 *   news      "News & Announcements" (Show All News) + 3 latest articles
 * The cards come from the offer and news pages (query index), so only the section heading,
 * intro and "Show all" link are imported as default content, followed by a listing block.
 * Model (blocks/listing/_listing.json): classes, folder (aem-content), categories, limit ->
 * three settings rows in model order; empty rows are kept.
 */
const SITE = '/content/eds-crosswalk-testing/en-th/content';
const CONFIG = {
  offers: {
    heading: 'h1', variants: ['featured'], folder: `${SITE}/offers-promotions`, categories: 'Special Offers', limit: '5',
    link: '/en-th/content/offers-promotions',
  },
  partners: {
    heading: 'h2', variants: [], folder: `${SITE}/offers-promotions`, categories: 'Partners', limit: '',
    link: '/en-th/content/offers-promotions',
  },
  news: {
    heading: 'h2', variants: ['featured'], folder: `${SITE}/news-and-announcements`, categories: '', limit: '3',
    link: '/en-th/content/news-and-announcements',
  },
};
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

/** Innermost elements whose own text matches (the rendered app nests spans and divs). */
function leaf(root, re) {
  return [...root.querySelectorAll('*')].find((e) => re.test(norm(e.textContent))
    && ![...e.children].some((c) => re.test(norm(c.textContent))));
}

export default function parse(element, { document }) {
  const kind = element.dataset.home;
  const cfg = CONFIG[kind];
  if (!cfg) return;
  const out = [];

  // heading: the real heading, else the section's title text
  const titleEl = element.querySelector('h1, h2, h3')
    || leaf(element, kind === 'partners' ? /^Exclusive Deals with Our Partners/i : /^News & Announcements/i);
  const title = norm(titleEl && titleEl.textContent)
    .replace(/Show All.*$/i, '').trim();
  if (title) {
    const h = document.createElement(cfg.heading);
    h.textContent = title;
    out.push(h);
  }
  // intro (offers only): the paragraph right after the heading
  if (kind === 'offers') {
    const intro = leaf(element, /^Enjoy exclusive travel discounts/i);
    if (intro) {
      const p = document.createElement('p');
      p.textContent = norm(intro.textContent);
      out.push(p);
    }
  }
  const more = leaf(element, /^Show All/i);
  if (more) {
    const p = document.createElement('p');
    const a = document.createElement('a');
    a.setAttribute('href', cfg.link);
    a.textContent = norm(more.textContent);
    p.append(a);
    out.push(p);
  }

  const folder = document.createElement('a');
  folder.setAttribute('href', cfg.folder);
  folder.textContent = cfg.folder;
  const cells = [
    [hinted(document, 'folder', [folder])],
    [cfg.categories ? hinted(document, 'categories', [document.createTextNode(cfg.categories)]) : ''],
    [cfg.limit ? hinted(document, 'limit', [document.createTextNode(cfg.limit)]) : ''],
  ];
  out.push(WebImporter.Blocks.createBlock(document, { name: 'listing', variants: cfg.variants, cells }));
  element.replaceWith(...out);
}
