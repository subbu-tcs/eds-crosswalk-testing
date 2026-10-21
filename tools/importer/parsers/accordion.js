/* eslint-disable */
/* global WebImporter */

/**
 * Parser for accordion (project block "accordion", no option).
 * Source: thaiairways.com `.multiAccordion`:
 *   [.heading-section (optional title)] .accordion > .accordion-item* >
 *     h2.accordion-header > button (title, typed with <strong>/<u>)
 *     .accordion-collapse > .accordion-body > .accordian-items (rich body)
 * Model (blocks/accordion/_accordion.json):
 *   block: classes (skipped), searchLabel, noResultsMessage -> two leading single-cell
 *          settings rows, kept empty so the item rows don't shift (the block reads them
 *          in model order)
 *   item (accordion-item): summary (plain text) | body (richtext) -> one row per item.
 * A non-empty source section title is kept as default content (h2) above the block.
 */
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function bodyNodes(document, body) {
  const c = body.cloneNode(true);
  c.querySelectorAll('script, style, link, button[data-bs-toggle]').forEach((n) => n.remove());
  // a table can't sit inside a block cell: keep its text, cell by cell in reading order;
  // icons without alt text are decoration and are dropped
  c.querySelectorAll('table').forEach((t) => {
    const out = [];
    t.querySelectorAll('tr').forEach((tr) => {
      [...tr.children].forEach((cell) => {
        cell.querySelectorAll('img:not([alt]), img[alt=""]').forEach((img) => (img.closest('picture') || img).remove());
        if (!norm(cell.textContent) && !cell.querySelector('img')) return;
        if (cell.querySelector('p, ul, ol')) out.push(...cell.childNodes);
        else {
          const p = document.createElement('p');
          p.append(...cell.childNodes);
          out.push(p);
        }
      });
    });
    t.replaceWith(...out);
  });
  // wrapper divs around the rich text
  let root = c;
  while (root.children.length === 1 && root.firstElementChild.tagName === 'DIV') root = root.firstElementChild;
  root.querySelectorAll('div').forEach((d) => {
    if (d.querySelector('p, ul, ol, table, h1, h2, h3, h4, h5, h6, div')) d.replaceWith(...d.childNodes);
    else {
      const p = document.createElement('p');
      p.append(...d.childNodes);
      d.replaceWith(p);
    }
  });
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    // headings typed in the body are emphasis, not document outline
    const p = document.createElement('p');
    const s = document.createElement('strong');
    s.textContent = norm(h.textContent);
    p.append(s);
    if (norm(h.textContent)) h.replaceWith(p);
    else h.remove();
  });
  root.querySelectorAll('p').forEach((p) => {
    if (!norm(p.textContent) && !p.querySelector('img, a[href]')) p.remove();
  });
  // loose inline content -> paragraph
  const nodes = [];
  let loose = null;
  [...root.childNodes].forEach((n) => {
    const block = n.nodeType === 1 && /^(P|UL|OL|TABLE|BLOCKQUOTE|PRE)$/.test(n.tagName);
    if (block) {
      loose = null;
      nodes.push(n);
    } else if ((n.nodeType === 3 && norm(n.nodeValue)) || (n.nodeType === 1 && n.tagName !== 'BR')) {
      if (!loose) {
        loose = document.createElement('p');
        nodes.push(loose);
      }
      loose.append(n);
    }
  });
  return nodes.filter((n) => norm(n.textContent) || (n.querySelector && n.querySelector('img, a[href]')));
}

export default function parse(element, { document }) {
  const cells = [
    [''], // searchLabel (empty: no FAQ search)
    [''], // noResultsMessage
  ];

  const items = [...element.querySelectorAll('.accordion-item')]
    .filter((it) => !it.parentElement.closest('.accordion-item'));
  items.forEach((item) => {
    const header = item.querySelector('.accordion-header, .accordion-button');
    const summary = norm(header && header.textContent);
    const body = item.querySelector('.accordion-body') || item.querySelector('.accordion-collapse');
    const nodes = body ? bodyNodes(document, body) : [];
    if (!summary && !nodes.length) return;
    cells.push([
      summary ? hinted(document, 'summary', [document.createTextNode(summary)]) : '',
      nodes.length ? hinted(document, 'body', nodes) : '',
    ]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'accordion', cells });

  const heading = element.querySelector('.heading-section');
  const title = norm(heading && heading.textContent);
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    element.before(h2);
  }
  element.replaceWith(block);
}
