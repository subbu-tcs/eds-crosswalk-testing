/* eslint-disable */
/* global WebImporter */

/**
 * Parser for booking-widget (project block "booking-widget").
 * Source: thaiairways.com `.offers-bookingwidget-1` (AEM offers booking widget). The source is
 * a form; no form control is imported. Only the authorable settings are read from the
 * widget configuration attributes on `[data-widget-type]`:
 *   data-origin-airport     -> origin (only when it is exactly one IATA code)
 *   data-departure-airport  -> destinations (the block writes this same attribute back)
 *   data-promocode="true"   -> option promo-code
 *   data-airport-filter="true" + type SelectedAirports + from-list == [origin]
 *                           -> option fixed-route (the only filter the block can reproduce;
 *                              country filters / multi-origin lists are not expressible)
 * Model (blocks/booking-widget/_booking-widget.json): classes (block options), origin,
 * destinations -> two single-cell settings rows, both always present (empty when unset) so
 * destinations never shifts into the origin row.
 */
const IATA = /^[A-Z]{3}$/;

function hinted(document, field, text) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  frag.appendChild(document.createTextNode(text));
  return frag;
}

function codes(value) {
  return (value || '')
    .replace(/[[\]'"]/g, '')
    .split(',')
    .map((c) => c.trim().toUpperCase())
    .filter((c, i, all) => IATA.test(c) && all.indexOf(c) === i);
}

export default function parse(element, { document }) {
  const cfg = element.querySelector('[data-widget-type]')
    || element.querySelector('[data-origin-airport]')
    || element;
  const attr = (name) => (cfg.getAttribute(name) || '').trim();

  const originList = codes(attr('data-origin-airport'));
  const origin = originList.length === 1 ? originList[0] : '';
  const destinations = codes(attr('data-departure-airport'));

  const variants = [];
  if (attr('data-promocode').toLowerCase() === 'true') variants.push('promo-code');
  const fromList = codes(attr('data-airport-filter-from'));
  if (attr('data-airport-filter').toLowerCase() === 'true'
    && attr('data-airport-filter-type') === 'SelectedAirports'
    && origin && fromList.length === 1 && fromList[0] === origin) {
    variants.push('fixed-route');
  }

  const cells = [
    [origin ? hinted(document, 'origin', origin) : ''],
    [destinations.length ? hinted(document, 'destinations', destinations.join(', ')) : ''],
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'booking-widget', variants, cells });
  element.replaceWith(block);
}
