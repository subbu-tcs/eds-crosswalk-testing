/* eslint-disable */
/* global WebImporter */

/**
 * Parser for tabs (project block "tabs", no option).
 * Source: offers landing page `.offers .navigation-section`: ul#pills-tab[role=tablist] >
 *   a.nav-link[data-bs-target="#all|#specialOffers|#partners|#rop|#roh"] (+ a hidden mobile
 *   <select> duplicate). The source panels are one filtered grid (#offerContainer).
 * The project block holds ONLY its Label setting: the tab panels are the following sections
 * with Section Metadata "tabLabel", created by tools/importer/transformers/thaiairways-sections.js
 * (labels read from this tab bar in beforeTransform, before this parser runs). No tab label or
 * form control is imported here.
 * Model (blocks/tabs/_tabs.json): classes (skipped), label -> one single-cell row (kept even
 * when empty). Label = the tab list's aria-label when the source has one; the offers category
 * bar (which has none) is named "Offer categories" as decided in the page analysis; otherwise
 * empty (the block then uses the heading just above it).
 */
const OFFER_KEYS = ['#all', '#specialOffers', '#partners', '#rop', '#roh'];
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

function hinted(document, field, text) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  frag.appendChild(document.createTextNode(text));
  return frag;
}

export default function parse(element, { document }) {
  const list = element.querySelector('[role="tablist"], ul.nav, nav ul');
  let label = norm(list && (list.getAttribute('aria-label') || ''));
  if (!label) {
    const targets = [...element.querySelectorAll('[data-bs-target]')].map((t) => t.getAttribute('data-bs-target'));
    if (targets.length && targets.every((t) => OFFER_KEYS.includes(t))) label = 'Offer categories';
  }

  const cells = [[label ? hinted(document, 'label', label) : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs', cells });
  element.replaceWith(block);
}
