/* eslint-disable */
/* global WebImporter */

/**
 * Parser for carousel (project block "carousel", no option).
 * Source: thaiairways.com `.imagetitlewithcarousel` (charter-flights aircraft slider):
 *   .carousel-slide > a.carousel-card[href] > .card > .inflight-card-img img +
 *   .inflight-card-content > span.inflight-card-header (title) + span.inflight-card-desc (rich)
 *   live prev/next buttons carry visually-hidden labels ("Previous" / "Next").
 * The repeating unit is the inner block-level .card (the outer <a> is inline); the <a> href
 * becomes the link on the slide title.
 * Model (blocks/carousel/_carousel.json):
 *   block: classes (skipped), label, previousLabel, nextLabel -> three leading single-cell
 *          settings rows in model order, always present (empty when unknown) so they never
 *          shift; label stays empty (the block then uses the heading just above it)
 *   item (carousel-slide): image (+imageAlt) | mobileImage | text -> 3 cells per slide.
 * Every slide uses the same generic aircraft photo with no alt: alt stays empty (decorative).
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
  if (u.startsWith('/content/')) return `${ORIGIN}${u}`;
  return u;
}

function buttonLabel(element, selector) {
  const btn = [...element.querySelectorAll(selector)][0];
  if (!btn) return '';
  const hidden = btn.querySelector('.visually-hidden, .sr-only');
  return norm(hidden && hidden.textContent) || norm(btn.getAttribute('aria-label')) || norm(btn.textContent);
}

function richNodes(document, el) {
  if (!el) return [];
  const c = el.cloneNode(true);
  c.querySelectorAll('script, style, img').forEach((n) => n.remove());
  const blocks = [...c.querySelectorAll(':scope > p, :scope > ul, :scope > ol')];
  if (blocks.length) return blocks.filter((b) => norm(b.textContent));
  const t = norm(c.textContent);
  if (!t) return [];
  const p = document.createElement('p');
  p.textContent = t;
  return [p];
}

function slideUnits(element) {
  const contents = [...element.querySelectorAll('.inflight-card-content')];
  if (contents.length) {
    const units = contents.map((c) => c.closest('.card') || c.parentElement);
    return units.filter((u, i) => units.indexOf(u) === i);
  }
  return [...element.querySelectorAll('.carousel-slide .card, .carousel-item')];
}

export default function parse(element, { document }) {
  const prev = buttonLabel(element, '.carousel-control-prev, button[id^="prev"]');
  const next = buttonLabel(element, '.carousel-control-next, button[id^="next"]');
  const label = norm(element.querySelector('[aria-label][role="region"], .carousel[aria-label]')
    && element.querySelector('[aria-label][role="region"], .carousel[aria-label]').getAttribute('aria-label'));

  const cells = [
    [label ? hinted(document, 'label', [document.createTextNode(label)]) : ''],
    [prev ? hinted(document, 'previousLabel', [document.createTextNode(prev)]) : ''],
    [next ? hinted(document, 'nextLabel', [document.createTextNode(next)]) : ''],
  ];

  slideUnits(element).forEach((unit) => {
    const srcImg = unit.querySelector('.inflight-card-img img, img');
    const titleEl = unit.querySelector('.inflight-card-header, h1, h2, h3, h4, h5, h6');
    const title = norm(titleEl && titleEl.textContent);
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
      } else h3.textContent = title;
      text.push(h3);
    }
    text.push(...richNodes(document, unit.querySelector('.inflight-card-desc')));

    let imgCell = '';
    if (srcImg) {
      const img = document.createElement('img');
      img.setAttribute('src', absUrl(srcImg.getAttribute('src') || srcImg.getAttribute('data-src')));
      img.setAttribute('alt', norm(srcImg.getAttribute('alt')));
      imgCell = hinted(document, 'image', [img]);
    }
    if (!imgCell && !text.length) return;
    cells.push([imgCell, '', text.length ? hinted(document, 'text', text) : '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel', cells });
  element.replaceWith(block);
}
