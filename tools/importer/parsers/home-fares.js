/* eslint-disable */
/* global WebImporter */

/**
 * Parser for home-fares (project block "fare-widget", a key-value block).
 * Source: the home page "Trending Destinations From [Bangkok]" row, rendered by the home app
 * from the airline's fares service (/common/calendarPricing/popular-fares), which the project's
 * Fare Widget calls too. Only settings are imported: the origin shown (Bangkok on en-th; the
 * source's origin list per market has no entry for Thailand) and the component's template
 * defaults, so authors see every field. The fare note becomes default content after the block.
 * Model (blocks/fare-widget/_fare-widget.json): key-value rows, one per field.
 */
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

const FIELDS = [
  ['origins', 'Bangkok (BKK)'],
  ['source', '/common/calendarPricing/popular-fares'],
  ['journey', 'ROUND_TRIP'],
  ['limit', ''],
  ['link', '/en-th/book/book-flight'],
  ['heading', 'Trending destinations from'],
  ['from', 'From'],
  ['to', 'To'],
  ['price', 'From {currency} {price}*'],
  ['book', 'Book now'],
  ['roundtrip', 'Round trip'],
  ['oneway', 'One way'],
  ['previous', 'Previous destinations'],
  ['next', 'Next destinations'],
];

export default function parse(element, { document }) {
  const cells = FIELDS.map(([key, val]) => [key, val]);
  const block = WebImporter.Blocks.createBlock(document, { name: 'fare-widget', cells });
  const note = [...element.querySelectorAll('*')].find((e) => /^\*Fares displayed/.test(norm(e.textContent))
    && ![...e.children].some((c) => /^\*Fares displayed/.test(norm(c.textContent))));
  const out = [block];
  if (note) {
    const p = document.createElement('p');
    p.textContent = norm(note.textContent);
    out.push(p);
  }
  element.replaceWith(...out);
}
