/* eslint-disable */
/* global WebImporter */

/**
 * thaiairways.com section transformer.
 *
 * Uses payload.template.sections (selectors tried in order) and the template-level
 * payload.template.sectionMetadata map (tabLabel for tab panels). No section styles on
 * this site (all white); style is still honoured if a template sets one.
 *
 * beforeTransform: inserts a marked <hr> before every non-first section while the parser
 * targets still exist, and reads tab labels from the source tab bars.
 * Nested panel sections (landing-page offers: sections whose selector matches inside
 * another section's element, e.g. "#offerContainer > a.filter-rop") get their <hr>
 * markers right after the containing element, in template order.
 *
 * afterTransform: when the parser turned the containing element into several blocks of
 * the same kind (one listing per tab panel), each block is moved behind its panel
 * marker; then Section Metadata (tabLabel / style) is written after each marker.
 */

const MARK = 'data-excat-section-id';
const FIRST = 'data-excat-section-first';
const state = new WeakMap();

const norm = (s) => (s || '').replace(/[\s ]+/g, ' ').trim();

function findSectionElement(root, selectors) {
  const list = Array.isArray(selectors) ? selectors : [selectors];
  for (const sel of list) {
    if (!sel) continue;
    try {
      const el = root.querySelector(sel);
      if (el) return el;
    } catch (e) {
      // selector not supported here: try the next one
    }
  }
  return null;
}

const isBefore = (a, b) => !!(a.compareDocumentPosition(b) & 4 /* FOLLOWING */);

// tab label from the source tab bar (falls back to the template value)
function sourceTabLabel(root, f, hasNested) {
  const el = f.el;
  const filterClass = [...el.classList].find((c) => c.startsWith('filter-'));
  let link = null;
  if (filterClass) {
    const key = filterClass.slice('filter-'.length);
    link = root.querySelector(`[data-bs-target="#${key}"]`);
  } else if (hasNested) {
    link = root.querySelector('[data-bs-target="#all"]');
  } else if (el.id) {
    link = root.querySelector(`.multitabscrolling a[href="#${el.id}"]`) || root.querySelector(`a[href="#${el.id}"]`);
  }
  return norm(link && link.textContent);
}

function makeMarker(doc, id, first) {
  const hr = doc.createElement('hr');
  hr.setAttribute(MARK, id);
  if (first) hr.setAttribute(FIRST, '');
  return hr;
}

function blockName(table) {
  const cell = table.querySelector('tr > th, tr > td');
  return norm(cell && cell.textContent).toLowerCase();
}

export default function transform(hookName, element, payload) {
  const template = payload && payload.template;
  const sections = (template && template.sections) || [];
  if (sections.length < 2) return;
  const doc = (payload && payload.document) || element.ownerDocument;
  const sectionMeta = (template && template.sectionMetadata) || {};

  if (hookName === 'beforeTransform') {
    const found = [];
    sections.forEach((section, idx) => {
      const el = findSectionElement(element, section.selector);
      if (!el || found.some((f) => f.el === el)) return;
      found.push({ section, idx, el });
    });
    if (!found.length) return;

    found.forEach((f) => {
      const parents = found.filter((o) => o !== f && o.el.contains(f.el));
      // innermost containing section
      f.parent = parents.sort((a, b) => (a.el.contains(b.el) ? 1 : -1))[0] || null;
    });
    found.forEach((f) => {
      f.nested = found.filter((o) => o.parent === f).sort((a, b) => a.idx - b.idx);
    });
    found.forEach((f) => {
      const templateLabel = sectionMeta[f.section.id] && sectionMeta[f.section.id].tabLabel;
      f.tabLabel = templateLabel ? (sourceTabLabel(element, f, f.nested.length > 0) || templateLabel) : null;
      f.style = f.section.style || null;
    });

    const top = found.filter((f) => !f.parent).sort((a, b) => (isBefore(a.el, b.el) ? -1 : 1));

    // reverse walk: <hr> before every non-first section, temporary marker for a first
    // section that needs Section Metadata
    for (let i = top.length - 1; i >= 0; i -= 1) {
      const f = top[i];
      const needsMeta = !!(f.style || f.tabLabel);
      if (i === 0) {
        if (needsMeta) f.el.before(makeMarker(doc, f.section.id, true));
      } else {
        f.el.before(makeMarker(doc, f.section.id, false));
      }
    }

    // nested panels: markers after the containing element, template order
    found.filter((f) => f.nested.length).forEach((p) => {
      if (p.parent) return; // only one nesting level is expected
      let anchor = p.el;
      p.nested.forEach((c) => {
        const hr = makeMarker(doc, c.section.id, false);
        anchor.after(hr);
        anchor = hr;
      });
    });

    state.set(doc, found.map((f) => ({
      id: f.section.id,
      blocks: (f.section.blocks || []).map((b) => b.toLowerCase()),
      tabLabel: f.tabLabel,
      style: f.style,
      nested: f.nested.map((c) => c.section.id),
      el: f.el,
    })));
  }

  if (hookName === 'afterTransform') {
    const info = state.get(doc);
    if (!info) return;
    state.delete(doc);
    const byId = Object.fromEntries(info.map((f) => [f.id, f]));
    const marker = (id) => element.querySelector(`hr[${MARK}="${id}"]`);

    // distribute the blocks the parser created from a container across its panel sections
    info.filter((p) => p.nested.length).forEach((p) => {
      const start = marker(p.id);
      const end = marker(p.nested[0]);
      if (!end) return;
      const names = p.blocks.flatMap((b) => [b, b.split('-')[0]]);
      const tables = [...element.querySelectorAll('table')].filter((t) => {
        if (t.parentElement && t.parentElement.closest('table')) return false;
        if (start && !isBefore(start, t)) return false;
        if (!isBefore(t, end)) return false;
        const name = blockName(t);
        return names.some((n) => name === n || name.startsWith(`${n} `) || name.startsWith(`${n}(`));
      });
      if (tables.length < 2) {
        if (tables.length === 0) console.warn(`[thaiairways-sections] ${p.id}: no ${p.blocks.join('/')} block found to split into panels`);
        return;
      }
      const cellTexts = (t) => [...t.querySelectorAll('td, th')].map((c) => norm(c.textContent).toLowerCase());
      const assigned = new Map();
      const free = [...tables];
      p.nested.forEach((cid) => {
        const label = norm(byId[cid].tabLabel).toLowerCase();
        if (!label) return;
        const t = free.find((tb) => cellTexts(tb).includes(label));
        if (t) {
          assigned.set(cid, t);
          free.splice(free.indexOf(t), 1);
        }
      });
      // first unmatched block stays with the container panel (e.g. "All Promotions")
      free.shift();
      p.nested.forEach((cid) => {
        if (!assigned.has(cid) && free.length) assigned.set(cid, free.shift());
      });
      p.nested.forEach((cid) => {
        const t = assigned.get(cid);
        const m = marker(cid);
        if (t && m) m.after(t);
      });
    });

    // Section Metadata, reverse order
    [...info].reverse().forEach((f) => {
      const cells = {};
      if (f.style) cells.style = f.style;
      if (f.tabLabel) cells.tabLabel = f.tabLabel;
      if (!Object.keys(cells).length) return;
      const sm = WebImporter.Blocks.createBlock(doc, { name: 'Section Metadata', cells });
      const m = marker(f.id);
      if (m) m.after(sm);
      else if (f.el && f.el.isConnected) f.el.after(sm);
      else console.warn(`[thaiairways-sections] ${f.id}: no marker or element left for Section Metadata`);
    });

    element.querySelectorAll(`hr[${MARK}]`).forEach((hr) => {
      if (hr.hasAttribute(FIRST)) hr.remove();
      else hr.removeAttribute(MARK);
    });
  }
}
