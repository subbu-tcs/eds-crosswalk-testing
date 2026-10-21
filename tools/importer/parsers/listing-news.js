/* eslint-disable */
/* global WebImporter */

/**
 * Parser for listing-news (project block "listing", option filter).
 * Source: news landing page `.newsandannouncement`: All / News / Announcements filter tabs,
 * a hand-kept list of article links with dates, and a pagination bar. The articles carry their
 * own title, date and category (page metadata, see thaiairways-metadata.js), so the list is
 * read from the query index instead: one listing block over the news folder, with the
 * category filter buttons standing in for the source tabs. No article links are imported.
 *
 * Model (blocks/listing/_listing.json): classes (filter), folder (aem-content), categories,
 * limit -> three single-cell settings rows in model order; empty rows are kept.
 */
const FOLDER = '/content/eds-crosswalk-testing/en-th/content/news-and-announcements';

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

export default function parse(element, { document }) {
  const a = document.createElement('a');
  a.setAttribute('href', FOLDER);
  a.textContent = FOLDER;
  const cells = [
    [hinted(document, 'folder', [a])],
    [''], // categories: every category
    [''], // limit: every article
  ];
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'listing', variants: ['filter'], cells }));
}
