/* eslint-disable */
/* global WebImporter */

/**
 * Parser for columns (project block "columns", no option).
 * Source: thaiairways.com `.leftImageRightContent` (both samples):
 *   .overviewContent > .highlightHeader > label (title) + .seatingContent (rich text) +
 *     .navigator > (.learnMore > a[href] "Discover More" + arrow icon | a[href] > button label)
 *   .rightSideImage > img.rightImage
 *   or mirrored: .leftSideImage > img.leftImage, then .rightContent (same text structure)
 * Output: one row, 2 columns in source order: text column (label -> h2, text, the link or
 * button as a plain text link) and image column.
 * Columns blocks carry default content only: no field hints (excat-xwalk-expert rule).
 */
const ORIGIN = 'https://www.thaiairways.com';
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

function absUrl(url) {
  const u = (url || '').trim();
  if (u.startsWith('//')) return `https:${u}`;
  if (u.startsWith('/content/')) return `${ORIGIN}${u}`;
  return u;
}

function richNodes(document, el) {
  if (!el) return [];
  const c = el.cloneNode(true);
  c.querySelectorAll('script, style').forEach((n) => n.remove());
  c.querySelectorAll('*').forEach((n) => n.removeAttribute('style'));
  const out = [];
  let loose = null;
  [...c.childNodes].forEach((n) => {
    if (n.nodeType === 1 && /^(P|UL|OL|H[1-6]|TABLE)$/.test(n.tagName)) {
      loose = null;
      if (norm(n.textContent) || n.querySelector('img')) out.push(n);
    } else if ((n.nodeType === 3 && norm(n.nodeValue)) || (n.nodeType === 1 && n.tagName !== 'BR')) {
      if (!loose) {
        loose = document.createElement('p');
        out.push(loose);
      }
      loose.append(n);
    }
  });
  return out.filter((n) => norm(n.textContent) || n.querySelector('img'));
}

export default function parse(element, { document }) {
  // text then image (.overviewContent + .rightSideImage), or mirrored (.leftSideImage + .rightContent)
  const textCol = element.querySelector('.overviewContent, .rightContent')
    || element.querySelector('.col-md-6:not(.leftSideImage):not(.rightSideImage)') || element;
  const imageCol = element.querySelector('.rightSideImage, .leftSideImage');
  // eslint-disable-next-line no-bitwise
  const imageFirst = !!imageCol && !!(imageCol.compareDocumentPosition(textCol) & 4);

  const text = [];
  const label = textCol.querySelector('.highlightHeader label, .highlightHeader, label');
  if (label && norm(label.textContent)) {
    const h2 = document.createElement('h2');
    h2.textContent = norm(label.textContent);
    text.push(h2);
  }
  text.push(...richNodes(document, textCol.querySelector('.seatingContent')));

  const nav = textCol.querySelector('.navigator');
  const link = (nav && nav.querySelector('a[href]')) || (nav && nav.closest('a[href]'));
  if (link) {
    const labelText = norm((link.querySelector('button') || link).textContent)
      || norm(nav.textContent);
    if (labelText) {
      const p = document.createElement('p');
      const a = document.createElement('a');
      a.setAttribute('href', link.getAttribute('href'));
      a.textContent = labelText;
      p.append(a);
      text.push(p);
    }
  }

  const imgs = [];
  const srcImg = imageCol ? imageCol.querySelector('img') : null;
  if (srcImg) {
    const img = document.createElement('img');
    img.setAttribute('src', absUrl(srcImg.getAttribute('src') || srcImg.getAttribute('data-src')));
    img.setAttribute('alt', norm(srcImg.getAttribute('alt')));
    imgs.push(img);
  }

  const textCell = text.length ? text : '';
  const imageCell = imgs.length ? imgs : '';
  const cells = [imageFirst ? [imageCell, textCell] : [textCell, imageCell]];
  const block = WebImporter.Blocks.createBlock(document, { name: 'columns', cells });
  element.replaceWith(block);
}
