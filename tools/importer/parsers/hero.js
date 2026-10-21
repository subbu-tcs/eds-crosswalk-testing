/* eslint-disable */
/* global WebImporter */

/**
 * Parser for hero (project block "hero", no option).
 * Source: thaiairways.com `.banner` (banner component):
 *   .hero-section > img.normalImg (desktop) [+ img.commonMobBanner (mobile crop)]
 *   .banner-title-div > h1.banner-title [+ description / CTA]
 * Model (blocks/hero/_hero.json): classes (skipped), image (+imageAlt collapsed),
 * mobileImage, text -> 3 rows: image | mobileImage | text. Empty rows are kept so
 * the text stays in its own row when there is no mobile image.
 */
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function imageEl(document, img) {
  const out = document.createElement('img');
  out.setAttribute('src', img.getAttribute('src') || img.getAttribute('data-src') || '');
  out.setAttribute('alt', norm(img.getAttribute('alt')));
  return out;
}

export default function parse(element, { document }) {
  const imgs = [...element.querySelectorAll('.hero-section img, img')]
    .filter((img, i, all) => all.indexOf(img) === i);
  const mobileImg = imgs.find((img) => img.classList.contains('commonMobBanner')) || null;
  const desktopImg = imgs.find((img) => img !== mobileImg) || null;

  const textNodes = [];
  const titleWrap = element.querySelector('.banner-title-div') || element;
  const title = titleWrap.querySelector('h1, h2, .banner-title');
  if (title && norm(title.textContent)) {
    const h1 = document.createElement('h1');
    h1.textContent = norm(title.textContent);
    textNodes.push(h1);
  }
  // optional subtitle / description and CTA links typed in the title area
  titleWrap.querySelectorAll('p, .banner-description, .banner-subtitle').forEach((p) => {
    if (title && (p === title || title.contains(p) || p.contains(title))) return;
    if (!norm(p.textContent)) return;
    if (textNodes.some((n) => n.contains && n.contains(p))) return;
    const para = document.createElement('p');
    para.innerHTML = p.innerHTML;
    textNodes.push(para);
  });
  titleWrap.querySelectorAll('a[href]').forEach((a) => {
    if (a.closest('p, .banner-description, .banner-subtitle')) return;
    if (!norm(a.textContent)) return;
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.setAttribute('href', a.getAttribute('href'));
    link.textContent = norm(a.textContent);
    p.appendChild(link);
    textNodes.push(p);
  });

  const cells = [
    [desktopImg ? hinted(document, 'image', [imageEl(document, desktopImg)]) : ''],
    [mobileImg ? hinted(document, 'mobileImage', [imageEl(document, mobileImg)]) : ''],
    [textNodes.length ? hinted(document, 'text', textNodes) : ''],
  ];

  const block = WebImporter.Blocks.createBlock(document, { name: 'hero', cells });
  element.replaceWith(block);
}
