/* eslint-disable */
/* global WebImporter */

/**
 * Parser for home-rop (project block "columns", options middle + flush).
 * Source: the home page Royal Orchid Plus band, rendered by the home app: a title (a styled
 * div, not a heading), one paragraph, "Join Now" (outlined button) and "Learn More" (link with
 * arrow), and a photo on the right. The section is styled Dark + Warm by the template.
 * Output: one row, 2 columns: text (title as h2, paragraph, Join Now as an italic link =
 * secondary button, Learn More as a plain link) | image.
 * Columns blocks carry default content only: no field hints.
 */
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

export default function parse(element, { document }) {
  const titleEl = [...element.querySelectorAll('*')].find((e) => /^More than a journey/i.test(norm(e.textContent))
    && ![...e.children].some((c) => /^More than a journey/i.test(norm(c.textContent))));
  const text = [];
  if (titleEl) {
    const h2 = document.createElement('h2');
    h2.textContent = norm(titleEl.textContent);
    text.push(h2);
  }
  element.querySelectorAll('p').forEach((p) => {
    if (norm(p.textContent) && !p.querySelector('a')) {
      const out = document.createElement('p');
      out.textContent = norm(p.textContent);
      text.push(out);
    }
  });
  element.querySelectorAll('a[href]').forEach((a) => {
    const label = norm(a.textContent);
    if (!label) return;
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.setAttribute('href', a.getAttribute('href'));
    link.textContent = label;
    if (/join/i.test(label)) {
      const em = document.createElement('em');
      em.append(link);
      p.append(em);
    } else p.append(link);
    text.push(p);
  });
  // the band's photo (decorative icons come first)
  const src = element.querySelector('img[src*="/content/dam/"]')
    || [...element.querySelectorAll('img')].find((i) => !/^(data|blob):/.test(i.getAttribute('src') || ''));
  const img = document.createElement('img');
  if (src) {
    img.setAttribute('src', src.getAttribute('src'));
    img.setAttribute('alt', norm(src.getAttribute('alt')));
  }
  const cells = [[text.length ? text : '', src ? [img] : '']];
  element.replaceWith(WebImporter.Blocks.createBlock(document, { name: 'columns', variants: ['middle', 'flush'], cells }));
}
