/* eslint-disable */
/* global WebImporter */

/**
 * Parser for tabs-anchor (project block "tabs" + option anchor = "Tabs (anchor)").
 * Source: content pages `.multitabscrolling` (sticky jump-link bar): .navigation-section >
 *   nav > ul#pills-tab-multiscrolling > li > a[href="#sectionN"] (+ a commented-out legacy nav
 *   and a hidden mobile <select> duplicate).
 * The project block holds ONLY its Label setting: the jump targets are the following sections
 * (#section1..N) with Section Metadata "tabLabel", created by
 * tools/importer/transformers/thaiairways-sections.js (labels read from this bar in
 * beforeTransform, before this parser runs). No link or form control is imported here.
 * Model (blocks/tabs/_tabs.json): classes (block option "anchor"), label -> one single-cell
 * row (kept even when empty). Label = the link list's / nav's aria-label when the source has
 * one (the mobile select's generic "Navigation Select" is ignored); otherwise empty (the block
 * then uses the heading just above it).
 */
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

function hinted(document, field, text) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  frag.appendChild(document.createTextNode(text));
  return frag;
}

export default function parse(element, { document }) {
  const list = element.querySelector('.navigation-section ul, ul.nav-links, [role="tablist"]');
  const nav = list && list.closest('nav');
  const label = norm((list && list.getAttribute('aria-label')) || (nav && nav.getAttribute('aria-label')) || '');

  const cells = [[label ? hinted(document, 'label', label) : '']];
  const block = WebImporter.Blocks.createBlock(document, { name: 'tabs', variants: ['anchor'], cells });
  element.replaceWith(block);
}
