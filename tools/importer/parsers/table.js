/* eslint-disable */
/* global WebImporter */

/**
 * Parser for table (project block "table", no option).
 * Sources:
 *  - partner / content pages: `.generictable` wrapping SEVERAL source <table>s that form one
 *    logical table (the first one has the <thead>, each following one starts with a
 *    full-width group label row) -> ONE block; group labels become rows with only the first
 *    cell filled (the block renders them as row-group headings).
 *  - news articles: a plain <table> inside `.newsannouncementdetails .news-text`
 *    (first row is the header row, typed with <br> padding).
 * Model (blocks/table/_table.json): classes become the block class; filter (Columns, table-N) is
 * the first row; every other row is a
 * table-col-N item with cells column1..columnN (hinted). Headings typed inside cells become
 * plain text, <br> padding is stripped, rowspan/colspan are flattened to a padded grid.
 * A <caption> is kept as default content just above the block (the heading above names it).
 */
const VARIANTS = [];
const MAX_COLUMNS = 7;

const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();
const MEDIA = 'img, picture, a[href], iframe, video';

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function unwrap(el) {
  el.replaceWith(...el.childNodes);
}

function isBlankNode(n) {
  if (n.nodeType === 3) return !n.nodeValue.replace(/[\s ​]+/g, '');
  if (n.nodeType === 1) {
    if (n.tagName === 'BR') return true;
    return !norm(n.textContent) && !n.querySelector(MEDIA) && !n.matches(MEDIA);
  }
  return n.nodeType === 8;
}

// trims leading/trailing <br> and whitespace (also inside the edge inline wrappers)
function trimEdges(el) {
  ['firstChild', 'lastChild'].forEach((edge) => {
    let n = el[edge];
    while (n) {
      if (isBlankNode(n)) {
        const next = n[edge === 'firstChild' ? 'nextSibling' : 'previousSibling'];
        n.remove();
        n = next;
      } else if (n.nodeType === 1 && /^(SPAN|FONT|B|STRONG|EM|I|U|P|DIV)$/.test(n.tagName)) {
        trimEdges(n);
        break;
      } else {
        if (n.nodeType === 3) {
          n.nodeValue = edge === 'firstChild' ? n.nodeValue.replace(/^[\s ]+/, '') : n.nodeValue.replace(/[\s ]+$/, '');
        }
        break;
      }
    }
  });
}

/** Clean copy of a source cell: list of nodes, empty array when the cell is blank. */
function cellContent(document, cell) {
  const c = cell.cloneNode(true);
  c.querySelectorAll('script, style, link').forEach((n) => n.remove());
  // headings typed inside cells are cell text
  c.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    const p = document.createElement('p');
    p.append(...h.childNodes);
    h.replaceWith(p);
  });
  c.querySelectorAll('span, font').forEach(unwrap);
  c.querySelectorAll('div').forEach((d) => {
    const p = document.createElement('p');
    p.append(...d.childNodes);
    d.replaceWith(p);
  });
  c.querySelectorAll('*').forEach((el) => {
    el.removeAttribute('style');
    el.removeAttribute('class');
    el.removeAttribute('id');
    el.removeAttribute('align');
  });
  c.querySelectorAll('p, b, strong, em, i, u').forEach((el) => {
    if (isBlankNode(el)) el.remove();
  });
  c.querySelectorAll('p').forEach((p) => trimEdges(p));
  trimEdges(c);
  // a cell made only of bold text (group labels, typed header emphasis) is plain text
  const bolds = c.querySelectorAll(':scope > b, :scope > strong');
  if (bolds.length === 1 && norm(bolds[0].textContent) === norm(c.textContent)) unwrap(bolds[0]);
  c.normalize();
  if (!norm(c.textContent) && !c.querySelector(MEDIA)) return [];
  // collapse whitespace in text nodes (source indentation / &nbsp; padding)
  const walker = document.createTreeWalker(c, 4 /* SHOW_TEXT */);
  let t = walker.nextNode();
  while (t) {
    t.nodeValue = t.nodeValue.replace(/[\s ]+/g, ' ');
    t = walker.nextNode();
  }
  trimEdges(c);
  // a single paragraph is the cell text itself
  const ps = c.querySelectorAll(":scope > p");
  if (ps.length === 1 && norm(ps[0].textContent) === norm(c.textContent) && !c.querySelector(":scope > ul, :scope > ol, :scope > img")) unwrap(ps[0]);
  // whitespace between block-level children
  if (c.querySelector(':scope > p, :scope > ul, :scope > ol')) {
    [...c.childNodes].forEach((n) => { if (n.nodeType === 3 && !norm(n.nodeValue)) n.remove(); });
  }
  return [...c.childNodes];
}

/** Source rows of one <table> (thead, tbody, tfoot in order; nested tables excluded). */
function sourceRows(table) {
  return [...table.querySelectorAll('tr')].filter((tr) => tr.closest('table') === table);
}

/** Flattens rows into a grid of source cells (null = empty), honouring colspan/rowspan. */
function toGrid(rows) {
  const grid = [];
  const pending = []; // rowspan carry-over: column -> remaining rows
  rows.forEach((tr) => {
    const out = [];
    let col = 0;
    const cells = [...tr.children].filter((c) => /^(TD|TH)$/.test(c.tagName));
    const fill = () => {
      while (pending[col] > 0) {
        pending[col] -= 1;
        out[col] = null;
        col += 1;
      }
    };
    cells.forEach((cell) => {
      fill();
      const span = Math.max(1, parseInt(cell.getAttribute('colspan') || '1', 10) || 1);
      const rspan = Math.max(1, parseInt(cell.getAttribute('rowspan') || '1', 10) || 1);
      out[col] = cell;
      for (let k = 1; k < span; k += 1) out[col + k] = null;
      for (let k = 0; k < span; k += 1) if (rspan > 1) pending[col + k] = rspan - 1;
      col += span;
    });
    fill();
    grid.push(out);
  });
  return grid;
}

function buildCells(document, tables) {
  const rows = tables.flatMap((t) => sourceRows(t));
  const grid = toGrid(rows)
    .map((r) => r.map((c) => (c ? cellContent(document, c) : [])))
    .filter((r) => r.some((c) => c.length));
  const columns = Math.min(MAX_COLUMNS, Math.max(1, ...grid.map((r) => r.length)));
  return grid.map((r) => {
    const row = [];
    for (let i = 0; i < columns; i += 1) {
      let nodes = r[i] || [];
      // overflow beyond the model maximum is appended to the last cell
      if (i === columns - 1 && r.length > columns) {
        nodes = r.slice(i).flatMap((n, idx) => (idx && n.length ? [document.createTextNode(' '), ...n] : n));
      }
      row.push(nodes.length ? hinted(document, `column${i + 1}`, nodes) : '');
    }
    return row;
  });
}

export default function parse(element, { document }) {
  const tables = element.tagName === 'TABLE'
    ? [element]
    : [...element.querySelectorAll('table')].filter((t) => !t.parentElement.closest('table') || !element.contains(t.parentElement.closest('table')));

  // captions stay as default content above the block
  const captions = [];
  tables.forEach((t) => {
    const cap = t.querySelector(':scope > caption');
    if (cap) {
      if (norm(cap.textContent)) {
        const kids = [...cap.children].filter((k) => /^(P|H[1-6]|UL|OL)$/.test(k.tagName));
        if (kids.length) captions.push(...kids);
        else {
          const p = document.createElement('p');
          p.append(...cap.childNodes);
          captions.push(p);
        }
      }
      cap.remove();
    }
  });

  // text between source tables (e.g. "Effective … 1 July 2026 onwards") splits them into
  // separate table blocks, with that text kept between them
  const parts = [];
  let group = [];
  tables.forEach((t, i) => {
    const prev = tables[i - 1];
    const between = [];
    if (prev && prev.parentElement === t.parentElement) {
      for (let n = prev.nextSibling; n && n !== t; n = n.nextSibling) {
        if (norm(n.textContent)) between.push(n);
      }
    }
    if (between.length && group.length) {
      parts.push(group);
      parts.push(between);
      group = [];
    }
    group.push(t);
  });
  if (group.length) parts.push(group);

  const out = parts.map((part) => {
    if (part[0].tagName !== 'TABLE') return part;
    const cells = buildCells(document, part);
    // the Columns setting (filter) picks the row model table-col-N; it comes before the rows
    const columns = Math.max(1, ...cells.map((r) => r.length));
    // each row names its model (table-col-N) in a leading cell, which the converter consumes
    cells.forEach((r) => r.unshift(`table-col-${columns}`));
    cells.unshift([hinted(document, 'filter', [document.createTextNode(`table-${columns}`)])]);
    return [WebImporter.Blocks.createBlock(document, { name: 'table', variants: VARIANTS, cells })];
  }).flat();
  if (captions.length) element.before(...captions);
  element.replaceWith(...out);
}
