/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards (project block "cards", no option).
 * Model (blocks/cards/_cards.json): block classes only (no settings rows); one row per card
 * (item model "card"): image (+imageAlt collapsed into alt) | text (richtext).
 *
 * Source shapes handled:
 *  1. `.imagecardwithdescription` (offer pages): .card > img.card-img-top + .card-body >
 *     h4.card-title + .four-card-content (rich text). Consecutive `.imagecardwithdescription`
 *     siblings (the source splits one grid into several 3- and 2-column components) merge
 *     into ONE block; the parser runs on the first one, absorbs and removes the following
 *     siblings, and does nothing when called on an already-absorbed (detached) one.
 *  2. `.highlightsBenefits .info-group` (content pages): .info-item > img + p.info-title +
 *     .sub-content. Icons have no alt in the source and sit next to the title: alt stays empty.
 *  3. `.imageWithContent` (partner card grid): one card per .card-content > .left-content img
 *     (logo) + a[href] wrapping .card-body-txt > h3 title, .card-txt, button "Visit X". The
 *     wrapping link becomes a text link (button label) at the end of the card text.
 * Titles become h3. Empty / &nbsp; paragraphs are dropped. Root-relative image and link URLs
 * are made absolute.
 */
const ORIGIN = 'https://www.thaiairways.com';
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function absUrl(url) {
  const u = (url || '').trim();
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/')) return `${ORIGIN}${u}`;
  return u;
}

function imageEl(document, img) {
  if (!img) return null;
  const out = document.createElement('img');
  out.setAttribute('src', absUrl(img.getAttribute('src') || img.getAttribute('data-src')));
  out.setAttribute('alt', norm(img.getAttribute('alt')));
  return out;
}

function heading(document, text) {
  const h = document.createElement('h3');
  h.textContent = text;
  return h;
}

/** Rich text of a description container -> list of clean block nodes. */
function richNodes(document, container) {
  if (!container) return [];
  const c = container.cloneNode(true);
  c.querySelectorAll('script, style, link, button, .navigator').forEach((n) => n.remove());
  c.querySelectorAll('*').forEach((el) => el.removeAttribute('style'));
  c.querySelectorAll('a[href]').forEach((a) => a.setAttribute('href', absUrl(a.getAttribute('href'))));
  const out = [];
  let loose = null;
  const flushable = (n) => (n.nodeType === 3 && norm(n.nodeValue)) || (n.nodeType === 1 && n.tagName !== 'BR');
  const walk = (parent) => {
    [...parent.childNodes].forEach((n) => {
      if (n.nodeType === 1 && n.tagName === 'DIV') {
        loose = null;
        walk(n);
        loose = null;
      } else if (n.nodeType === 1 && /^(P|UL|OL|H[1-6]|TABLE|BLOCKQUOTE)$/.test(n.tagName)) {
        loose = null;
        if (/^H[1-6]$/.test(n.tagName)) {
          const p = document.createElement('p');
          const s = document.createElement('strong');
          s.textContent = norm(n.textContent);
          p.append(s);
          out.push(p);
        } else out.push(n);
      } else if (flushable(n)) {
        if (!loose) {
          loose = document.createElement('p');
          out.push(loose);
        }
        loose.append(n);
      }
    });
  };
  walk(c);
  return out.filter((n) => norm(n.textContent) || (n.querySelector && n.querySelector('img')));
}

function card(document, img, textNodes) {
  return [
    img ? hinted(document, 'image', [img]) : '',
    textNodes.length ? hinted(document, 'text', textNodes) : '',
  ];
}

function fromImageCards(document, el) {
  return [...el.querySelectorAll('.card')].map((c) => {
    const img = imageEl(document, c.querySelector('img'));
    const titleEl = c.querySelector('.card-title, h1, h2, h3, h4, h5, h6');
    const text = [];
    if (titleEl && norm(titleEl.textContent)) text.push(heading(document, norm(titleEl.textContent)));
    const desc = c.querySelector('.four-card-content, .card-text, .card-description');
    if (desc) text.push(...richNodes(document, desc));
    else {
      const body = c.querySelector('.card-body');
      if (body) {
        const b = body.cloneNode(true);
        const t = b.querySelector('.card-title, h1, h2, h3, h4, h5, h6');
        if (t) t.remove();
        text.push(...richNodes(document, b));
      }
    }
    return card(document, img, text);
  });
}

function fromInfoGroup(document, el) {
  return [...el.querySelectorAll('.info-item')].map((item) => {
    const img = imageEl(document, item.querySelector('img'));
    const text = [];
    const title = item.querySelector('.info-title');
    if (title && norm(title.textContent)) text.push(heading(document, norm(title.textContent)));
    text.push(...richNodes(document, item.querySelector('.sub-content')));
    return card(document, img, text);
  });
}

function fromImageWithContent(document, el) {
  // .card-content (logo, text, "Visit X" button) or .card-small (the whole card is the link)
  return [...el.querySelectorAll('.card-content, .card-small')].map((item) => {
    const img = imageEl(document, item.querySelector('.left-content img, img.card-img-content, img.card-img-small') || item.querySelector('img'));
    const text = [];
    const title = item.querySelector('.card-title-txt, h1, h2, h3, h4, h5, h6');
    const link = item.matches('a[href]') ? item : item.querySelector('a[href]');
    const button = item.querySelector('.navigator, .learnMore');
    if (title && norm(title.textContent)) {
      const h = heading(document, norm(title.textContent));
      // no button to carry the link: the title links to the card's page
      if (link && !button) {
        const a = document.createElement('a');
        a.setAttribute('href', absUrl(link.getAttribute('href')));
        a.append(...h.childNodes);
        h.append(a);
      }
      text.push(h);
    }
    text.push(...richNodes(document, item.querySelector('.card-txt')));
    if (link && button) {
      const labelEl = item.querySelector('.navigator, .learnMore');
      const label = norm(labelEl && labelEl.textContent) || norm(title && title.textContent) || link.getAttribute('href');
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.setAttribute('href', absUrl(link.getAttribute('href')));
      a.textContent = label;
      p.append(a);
      text.push(p);
    }
    return card(document, img, text);
  });
}

export default function parse(element, { document }) {
  // already merged into the block created from a preceding sibling
  if (!element.parentNode) return;

  let cells = [];
  if (element.matches('.imagecardwithdescription')) {
    const group = [element];
    let next = element.nextElementSibling;
    while (next && next.matches('.imagecardwithdescription')) {
      group.push(next);
      next = next.nextElementSibling;
    }
    group.forEach((g) => { cells.push(...fromImageCards(document, g)); });
    group.slice(1).forEach((g) => g.remove());
  } else if (element.matches('.imageWithContent') || element.querySelector('.card-content')) {
    cells = fromImageWithContent(document, element);
  } else if (element.matches('.info-group') || element.querySelector('.info-item')) {
    cells = fromInfoGroup(document, element);
  } else {
    cells = fromImageCards(document, element);
  }
  cells = cells.filter((row) => row.some((c) => c !== ''));

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', cells });
  element.replaceWith(block);
}
