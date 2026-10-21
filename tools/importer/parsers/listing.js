/* eslint-disable */
/* global WebImporter */

/**
 * Parser for listing (project block "listing", no option).
 * Source: offers landing page `#offerContainer` (`.offers .offer-container`): ~78 offer cards
 * (a.card.filter-<category> > img + h4 title + teaser + "Now until" footnote), one grid that
 * the source filters with a tab bar. The cards are generated content: the listing block reads
 * them from the offer pages (query index), so no card content is imported.
 *
 * Output: FIVE listing blocks, one per tab panel, in tab order:
 *   All Promotions (no category), Special Offers, Partners, Royal Orchid Plus,
 *   Royal Orchid Holidays.
 * Contract with tools/importer/transformers/thaiairways-sections.js (afterTransform): it moves
 * each listing block behind its panel marker by matching the tab label against the block's
 * cell text (the categories cell), and keeps the first unmatched block (All Promotions) in the
 * container panel. So the categories value must equal the tab label, and the All Promotions
 * block must come first with an empty categories cell.
 *
 * Model (blocks/listing/_listing.json): classes (skipped), folder (aem-content), categories,
 * limit -> three single-cell settings rows in model order; empty rows are kept (limit is
 * always empty) so nothing shifts.
 */
const FOLDER = '/content/eds-crosswalk-testing/en-th/content/offers-promotions';

// source filter key (a.card.filter-<key>, tab data-bs-target="#<key>") -> category
const CATEGORIES = [
  { key: 'specialOffers', category: 'Special Offers' },
  { key: 'partners', category: 'Partners' },
  { key: 'rop', category: 'Royal Orchid Plus' },
  { key: 'roh', category: 'Royal Orchid Holidays' },
];

const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function listingBlock(document, category) {
  const a = document.createElement('a');
  a.setAttribute('href', FOLDER);
  a.textContent = FOLDER;
  const cells = [
    [hinted(document, 'folder', [a])],
    [category ? hinted(document, 'categories', [document.createTextNode(category)]) : ''],
    [''], // limit: empty shows every matching page
  ];
  return WebImporter.Blocks.createBlock(document, { name: 'listing', cells });
}

export default function parse(element, { document }) {
  // categories in tab order; source-only filter keys not in the known list are appended,
  // labelled from the source tab bar when it is still in the document
  const keys = [...new Set([...element.querySelectorAll('[class*="filter-"]')]
    .flatMap((el) => [...el.classList])
    .filter((c) => c.startsWith('filter-'))
    .map((c) => c.slice('filter-'.length)))];
  const categories = CATEGORIES.map((c) => c.category);
  keys.forEach((key) => {
    if (CATEGORIES.some((c) => c.key === key)) return;
    const tab = document.querySelector(`[data-bs-target="#${key}"]`);
    const label = norm(tab && tab.textContent);
    if (label && !categories.includes(label)) categories.push(label);
  });

  const blocks = [listingBlock(document, ''), ...categories.map((c) => listingBlock(document, c))];
  element.replaceWith(...blocks);
}
