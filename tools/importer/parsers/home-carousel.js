/* eslint-disable */
/* global WebImporter */

/**
 * Parser for home-carousel (project block "carousel", option hero).
 * Source: the home page hero carousel, read from its content feed (bannercarousel.model.json,
 * embedded by tools/importer/home-feeds.mjs and moved into the section by
 * thaiairways-home.js), not from the rendered slider:
 *   carouselDetails[]: image, title, subTitle, subTitle2, buttonText, buttonUrl ("None" = empty)
 * Model (blocks/carousel/_carousel.json):
 *   block: classes (hero), label, previousLabel, nextLabel -> three settings rows;
 *   item (carousel-slide): image (+imageAlt) | mobileImage | text.
 * Slide text: title as h2, subtitles as paragraphs, the button as a bold link (primary
 * button). Slides whose message is in the image (no title) get an empty alt for review.
 */
const ORIGIN = 'https://www.thaiairways.com';
const value = (v) => (v && v !== 'None' ? String(v).trim() : '');

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function el(document, tag, text) {
  const e = document.createElement(tag);
  e.textContent = text;
  return e;
}

export default function parse(element, { document }) {
  const feed = element.querySelector('[data-excat-feed="bannercarousel"]');
  let slides = [];
  try {
    slides = JSON.parse(feed ? feed.textContent : '{}').carouselDetails || [];
  } catch (e) {
    slides = [];
  }
  if (!slides.length) return; // no feed: leave the section to default content

  const cells = [
    [hinted(document, 'label', [document.createTextNode('Highlights')])],
    [hinted(document, 'previousLabel', [document.createTextNode('Previous slide')])],
    [hinted(document, 'nextLabel', [document.createTextNode('Next slide')])],
  ];
  slides.forEach((s) => {
    const src = value(s.image);
    if (!src) return;
    const title = value(s.title);
    const img = document.createElement('img');
    img.setAttribute('src', src.startsWith('/') ? `${ORIGIN}${src}` : src);
    img.setAttribute('alt', title);

    const text = [];
    if (title) text.push(el(document, 'h2', title));
    [value(s.subTitle), value(s.subTitle2)].filter(Boolean).forEach((t) => text.push(el(document, 'p', t)));
    const label = value(s.buttonText);
    const href = value(s.buttonUrl) || value(s.redirectionUrl);
    if (label && href) {
      const p = document.createElement('p');
      const strong = document.createElement('strong');
      const a = el(document, 'a', label);
      a.setAttribute('href', href);
      strong.append(a);
      p.append(strong);
      text.push(p);
    }
    cells.push([hinted(document, 'image', [img]), '', text.length ? hinted(document, 'text', text) : '']);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'carousel', variants: ['hero'], cells });
  element.replaceWith(block);
}
