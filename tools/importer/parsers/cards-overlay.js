/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-overlay (project block "cards" + option overlay = "Cards (overlay)").
 * Model (blocks/cards/_cards.json, item "card"): image (+imageAlt) | text -> one row per card.
 *
 * Source shapes handled:
 *  1. content pages `.carouselwithslider` (charter-flights): a Bootstrap multi-card carousel;
 *     each .card holds the image plus TWO copies of its text (.card-not-overlay for the resting
 *     state, .card-img-overlay for hover). One copy is kept (the overlay copy, else the other);
 *     carousel controls/indicators are dropped. Cards repeated across slides are de-duplicated.
 *  2. landing pages `.moreService .cms-card-container` (earn-miles): a.card[href] wrapping
 *     .img-gradient img + h4 title (+ arrow icon) + .card-img-overlay copy. The repeating unit
 *     is keyed on the inner block-level .card-img-overlay / .img-gradient wrappers (the outer
 *     <a> is inline); its href becomes the link on the card title.
 * Text cell: h3 title (linked when the card links somewhere) + description paragraph.
 * An all-lowercase source title (CSS-uppercased in the source, e.g. "thai") takes the casing
 * the same word has in the card's description ("THAI").
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
  if (u.startsWith('/') && !u.startsWith('/en-') && /\.(png|jpe?g|gif|svg|webp)(\?|$)/i.test(u)) return `${ORIGIN}${u}`;
  return u;
}

function textOf(el) {
  if (!el) return '';
  const c = el.cloneNode(true);
  c.querySelectorAll('img, script, style').forEach((n) => n.remove());
  return norm(c.textContent);
}

function fixCase(title, description) {
  if (!title || title !== title.toLowerCase()) return title;
  const words = title.split(' ');
  const descWords = (description || '').match(/[\p{L}\p{N}&'-]+/gu) || [];
  return words.map((w) => {
    const hit = descWords.find((d) => d.toLowerCase() === w.toLowerCase() && d !== w);
    return hit || w;
  }).join(' ');
}

/** The card units: one element per card, in document order. */
function cardUnits(element) {
  const overlays = [...element.querySelectorAll('.card-img-overlay')];
  const units = overlays.map((o) => o.closest('.card') || o.parentElement);
  if (units.length) return units.filter((u, i) => units.indexOf(u) === i);
  return [...element.querySelectorAll('.card')];
}

export default function parse(element, { document }) {
  const cells = [];
  const seen = new Set();

  cardUnits(element).forEach((unit) => {
    const overlay = unit.querySelector('.card-img-overlay');
    const resting = unit.querySelector('.card-not-overlay') || unit;
    const titleEl = (overlay && overlay.querySelector('.card-overlay-title, h1, h2, h3, h4, h5, h6'))
      || resting.querySelector('.card-headtitle, h1, h2, h3, h4, h5, h6');
    const descEl = (overlay && overlay.querySelector('.card-overlay-text, p'))
      || resting.querySelector('.card-text, p');
    const description = textOf(descEl);
    const title = fixCase(textOf(titleEl), description);

    const srcImg = [...unit.querySelectorAll('img')].find((i) => !i.classList.contains('arrowImg')
      && !i.closest('h1, h2, h3, h4, h5, h6'));
    const key = `${title}|${srcImg ? srcImg.getAttribute('src') : ''}`;
    if (seen.has(key)) return;
    seen.add(key);

    const link = unit.closest('a[href]') || unit.querySelector('a[href]');
    const href = link && link.getAttribute('href');

    const text = [];
    if (title) {
      const h3 = document.createElement('h3');
      if (href && href !== '#') {
        const a = document.createElement('a');
        a.setAttribute('href', href);
        a.textContent = title;
        h3.append(a);
      } else {
        h3.textContent = title;
      }
      text.push(h3);
    }
    if (description) {
      const p = document.createElement('p');
      p.textContent = description;
      text.push(p);
    }

    let imgCell = '';
    if (srcImg) {
      const img = document.createElement('img');
      img.setAttribute('src', absUrl(srcImg.getAttribute('src') || srcImg.getAttribute('data-src')));
      img.setAttribute('alt', fixCase(norm(srcImg.getAttribute('alt')), description));
      imgCell = hinted(document, 'image', [img]);
    }
    if (!imgCell && !text.length) return;
    cells.push([imgCell, text.length ? hinted(document, 'text', text) : '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', variants: ['overlay'], cells });
  element.replaceWith(block);
}
