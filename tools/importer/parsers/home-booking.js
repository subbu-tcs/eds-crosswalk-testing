/* eslint-disable */
/* global WebImporter */

/**
 * Parser for home-booking (project block "booking-widget", option promo-code).
 * Source: the home page booking panel (Book Flight / Manage Booking / Check-in / Flight
 * Status), rendered by the home React app. The project's Booking Widget mounts the existing
 * standalone Book Flight bundle, so only its settings are imported: the panel's default
 * origin (BKK on en-th) and the promo code field it shows. The other three tabs exist only in
 * the home app and are not imported (see docs/home-page-map.md).
 * Model (blocks/booking-widget/_booking-widget.json): classes, origin, destinations.
 */
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

function hinted(document, field, text) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  frag.appendChild(document.createTextNode(text));
  return frag;
}

export default function parse(element, { document }) {
  // the From field shows its airport code as a pill before the city ("From BKKBangkok")
  const code = (norm(element.textContent).match(/From\s*([A-Z]{3})(?=[A-Z][a-z]|\s|$)/) || [])[1] || '';
  const variants = /Add Promo Code/i.test(element.textContent) ? ['promo-code'] : [];
  const cells = [
    [code ? hinted(document, 'origin', code) : ''],
    [''], // destinations: every route
  ];
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'booking-widget', variants, cells }));
}
