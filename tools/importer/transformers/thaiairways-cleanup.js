/* eslint-disable */
/* global WebImporter */

/**
 * thaiairways.com (AEM 6.x "thai-generic") cleanup transformer.
 *
 * beforeTransform: removes chrome and non-authorable widgets, fixes image URLs, turns
 * script-only buttons into links, normalises headings and typed pseudo-structure, and
 * drops spacers, so block parsers see clean input.
 * afterTransform: closes heading-level gaps across the final document, strips leftover
 * scripts/styles/meta and tracking attributes. HTML comments are never removed here
 * (XWalk field hints are comments written by the parsers).
 */

const ORIGIN = 'https://www.thaiairways.com';
const PIN = '\u{1F4CD}';
// local hash of the hotlinked fbcdn pin emoji (1f4cd.png) in the scraped cleaned.html
const PIN_LOCAL_HASH = '87b09744016eae4d1fd9d97c64ef1e7f';
const MEDIA = 'img,picture,video,iframe,svg,input,select,textarea,table,a[href]';

const CHROME = [
  '.header-react',
  '#header',
  '.footer-react',
  '#footer',
  'footer#thaiFooter',
  '.cmp-breadcrumb',
  '#fb-root',
  '#onetrust-consent-sdk',
  '#onetrust-banner-sdk',
  '#onetrust-pc-sdk',
  '.onetrust-pc-dark-filter',
  'iframe[src*="webchat"]',
  'iframe[src*="genai-api.thaiairways.com"]',
  '.smartbanner',
  '.app-banner',
  '#app-banner',
  '.scroll',
  '#back-to-top',
  'button.back-to-top',
  '.more-container',
  '#view-more',
];

const text = (el) => (el ? el.textContent.replace(/[\s ​]+/g, ' ').trim() : '');
const isBlank = (el) => !el.textContent.replace(/[\s ​]+/g, '') && !el.querySelector(MEDIA);

function removeAll(root, selectors) {
  selectors.forEach((sel) => {
    try {
      root.querySelectorAll(sel).forEach((el) => el.remove());
    } catch (e) {
      // invalid selector in this DOM implementation: ignore
    }
  });
}

function renameTag(el, tag) {
  const doc = el.ownerDocument;
  const n = doc.createElement(tag);
  while (el.firstChild) n.append(el.firstChild);
  el.replaceWith(n);
  return n;
}

function unwrap(el) {
  el.replaceWith(...el.childNodes);
}

/* ---------- images ---------- */

function fixImageUrl(src) {
  if (!src) return src;
  let s = src.trim();
  if (/^(data:|\.\.?\/|blob:)/i.test(s)) return s;
  if (s.startsWith('//')) s = `https:${s}`;
  else if (s.startsWith('/')) s = `${ORIGIN}${s}`;
  try {
    const u = new URL(s);
    if (/(^|\.)thaiairways\.com$/i.test(u.hostname)) {
      u.searchParams.delete('v');
      return u.toString();
    }
  } catch (e) {
    // leave unparseable values as-is
  }
  return s;
}

function emojiFor(img) {
  const src = img.getAttribute('src') || '';
  const m = src.match(/fbcdn\.net\/images\/emoji\.php\/[^?#]*\/([0-9a-f]+(?:_[0-9a-f]+)*)\.png/i);
  if (m) {
    try {
      return String.fromCodePoint(...m[1].split('_').map((h) => parseInt(h, 16)));
    } catch (e) {
      return PIN;
    }
  }
  if (src.includes(PIN_LOCAL_HASH)) return PIN;
  return null;
}

function fixImages(root, doc) {
  // hotlinked Facebook emoji icons (pin bullets) become the Unicode character
  root.querySelectorAll('img').forEach((img) => {
    const ch = emojiFor(img);
    if (ch) img.replaceWith(doc.createTextNode(`${ch} `));
  });

  root.querySelectorAll('img').forEach((img) => {
    const dataSrc = img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
    const src = img.getAttribute('src');
    if (dataSrc && (!src || /^data:image\/gif/i.test(src))) img.setAttribute('src', dataSrc);
    if (img.getAttribute('src')) img.setAttribute('src', fixImageUrl(img.getAttribute('src')));
  });
  root.querySelectorAll('img[srcset], source[srcset]').forEach((el) => {
    const v = el.getAttribute('srcset')
      .split(',')
      .map((part) => {
        const [u, ...rest] = part.trim().split(/\s+/);
        return [fixImageUrl(u), ...rest].join(' ');
      })
      .join(', ');
    el.setAttribute('srcset', v);
  });

  // placeholder alts ("larger-Img") get the page title as a description
  const h1 = root.querySelector('h1');
  const pageTitle = text(h1) || text(doc.querySelector('head > title')).replace(/\s*\|\s*Thai Airways\s*$/i, '');
  root.querySelectorAll('img[alt]').forEach((img) => {
    if (/^larger-?img$/i.test(img.getAttribute('alt').trim()) && pageTitle) img.setAttribute('alt', pageTitle);
  });
}

/* ---------- links / buttons ---------- */

function decodeMailto(root) {
  root.querySelectorAll('a[href^="mailto:"]').forEach((a) => {
    const addr = a.getAttribute('href').slice(7);
    if (addr.includes('@') || !/^[A-Za-z0-9+/=]+$/.test(addr)) return;
    try {
      const decoded = atob(addr);
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(decoded)) a.setAttribute('href', `mailto:${decoded}`);
    } catch (e) {
      // not base64
    }
  });
}

function cleanLinkContent(a) {
  // decorative arrow/icon images inside a text link
  if (text(a)) a.querySelectorAll('img').forEach((img) => img.remove());
  a.querySelectorAll('b, strong, span').forEach(unwrap);
  const t = text(a);
  if (t && !a.querySelector('img')) a.textContent = t;
}

function buttonDestination(btn) {
  const dataHref = btn.getAttribute('data-href') || btn.getAttribute('data-url') || btn.getAttribute('data-link');
  if (dataHref && dataHref !== '#') return dataHref;
  const onclick = btn.getAttribute('onclick') || '';
  const m = onclick.match(/(?:location(?:\.href)?|window\.open)\s*(?:=|\()\s*['"]([^'"]+)['"]/);
  if (m && m[1] !== '#') return m[1];
  return null;
}

function convertButtons(root, doc) {
  // <a href><button>label</button></a>  ->  <a href>label</a>
  root.querySelectorAll('a[href] button').forEach((btn) => {
    btn.replaceWith(...btn.childNodes);
  });

  root.querySelectorAll('button').forEach((btn) => {
    const inner = btn.querySelector('a[href]');
    let a = null;
    if (inner) {
      a = inner;
    } else {
      const dest = buttonDestination(btn);
      if (!dest) return;
      a = doc.createElement('a');
      a.setAttribute('href', dest);
      a.append(...btn.childNodes);
    }
    cleanLinkContent(a);
    if (btn.closest('.buttonComponent')) {
      // standalone CTA: own paragraph, bold link = primary button in EDS
      const p = doc.createElement('p');
      const strong = doc.createElement('strong');
      strong.append(a);
      p.append(strong);
      btn.replaceWith(p);
    } else {
      btn.replaceWith(a);
    }
  });
}

/* ---------- headings ---------- */

function normalizeHeadings(root, doc) {
  // malformed wrappers: <h2><p>Title</p></h2>
  root.querySelectorAll('h1 > p, h2 > p, h3 > p, h4 > p, h5 > p, h6 > p').forEach(unwrap);

  // styled <p class="heading-title"> section headings become real h2
  root.querySelectorAll('.highlightsBenefits p.heading-title').forEach((p) => {
    if (text(p)) renameTag(p, 'h2');
  });

  // headings typed inside data-table cells (<td><h5>15%</h5></td>) are cell text, not headings
  root.querySelectorAll('table td h1, table td h2, table td h3, table td h4, table td h5, table td h6, table th h1, table th h2, table th h3, table th h4, table th h5, table th h6').forEach((h) => {
    const p = renameTag(h, 'p');
    if (!text(p)) p.remove();
  });

  // empty / &nbsp;-only headings
  root.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach((h) => {
    if (isBlank(h)) h.remove();
  });

  // promote the visible page title to h1 when the page has none
  if (!root.querySelector('h1')) {
    const main = root.querySelector('div.root > div.cmp-container > div.aem-Grid > div.responsivegrid > div.aem-Grid') || root;
    const firstComponent = main.firstElementChild;
    const candidates = [
      root.querySelector('.newsannouncementdetails .news-heading'),
      root.querySelector('.banner .banner-title'),
      root.querySelector('.titlewithimage .title'),
      firstComponent && firstComponent.matches('.information')
        ? firstComponent.querySelector('.infoContainer .head-title')
        : null,
    ];
    const title = candidates.find((c) => c && text(c));
    if (title) {
      const h1 = renameTag(title, 'h1');
      h1.textContent = text(h1);
    }
  }
}

/* ---------- news body (typed pseudo-structure) ---------- */

const SEPARATOR = /^[-–—_=\s]{5,}$/;

function isBoldOnly(p) {
  if (!p.querySelector('strong, b')) return false;
  const c = p.cloneNode(true);
  c.querySelectorAll('strong, b').forEach((s) => s.remove());
  return !text(c);
}

function stripLeading(el, re) {
  const walker = el.ownerDocument.createTreeWalker(el, 4 /* SHOW_TEXT */);
  let n = walker.nextNode();
  while (n) {
    if (n.nodeValue.replace(/[\s ]+/g, '')) {
      n.nodeValue = n.nodeValue.replace(re, '');
      return;
    }
    n.nodeValue = '';
    n = walker.nextNode();
  }
}

function listKind(el, next) {
  if (!el || el.tagName !== 'P' || el.hasAttribute('data-thai-record')) return null;
  const t = text(el);
  if (/^\*\s*\S/.test(t) && next && next.tagName === 'P' && text(next).startsWith(PIN)) {
    return { type: 'star', tag: 'ul', strip: /^[\s ]*\*[\s ]*/ };
  }
  if (/^[•·]/.test(t)) return { type: 'bullet', tag: 'ul', strip: /^[\s ]*[•·][\s ]*/ };
  if (/^\d{1,2}[.)]\s+\S/.test(t)) return { type: 'num', tag: 'ol', strip: /^[\s ]*\d{1,2}[.)][\s ]+/ };
  if (t.startsWith(PIN)) return { type: 'pin', tag: 'ul', strip: null };
  return null;
}

function moveInto(from, to, strip) {
  if (strip) stripLeading(from, strip);
  while (from.firstChild) to.append(from.firstChild);
  from.remove();
}

function normalizeNewsBody(body, doc) {
  // spacers, typed dashed separators, update titles
  let atStart = true;
  [...body.children].forEach((el) => {
    if (el.tagName === 'P' && SEPARATOR.test(el.textContent) && /[-–—_=]{5,}/.test(el.textContent)) {
      el.remove();
      atStart = true;
      return;
    }
    // separator typed in the same paragraph as the next title: "-----<br><br><strong>Title</strong>"
    if (el.tagName === 'P' && /^[\s ]*[-–—_=]{5,}/.test(el.textContent)) {
      while (el.firstChild && (el.firstChild.nodeName === 'BR' || (el.firstChild.nodeType === 3
        && /^[\s -–—_=]*$/.test(el.firstChild.nodeValue)))) {
        el.firstChild.remove();
      }
      atStart = true;
    }
    if (isBlank(el)) {
      el.remove();
      return;
    }
    if (atStart && el.tagName === 'P' && isBoldOnly(el) && !/^as of\b/i.test(text(el))) {
      const h2 = renameTag(el, 'h2');
      h2.textContent = text(h2);
    }
    atStart = false;
  });

  // flight records: pin line + "Date:/Route:/Departure:/Arrival:" lines -> one paragraph
  [...body.children].forEach((el) => {
    if (!el.isConnected || el.tagName !== 'P' || !text(el).startsWith(PIN)) return;
    let next = el.nextElementSibling;
    let merged = false;
    while (next && next.tagName === 'P' && /^(date|route|departure|arrival|time)\s*:/i.test(text(next))) {
      const after = next.nextElementSibling;
      el.append(doc.createElement('br'));
      moveInto(next, el, null);
      merged = true;
      next = after;
    }
    if (merged) el.setAttribute('data-thai-record', '');
  });

  // typed lists: "•" lines, "1." lines, pin lines, "*TGxxx" + pin-time pairs
  const kids = [...body.children];
  let i = 0;
  while (i < kids.length) {
    const kind = listKind(kids[i], kids[i + 1]);
    if (!kind) {
      i += 1;
      continue;
    }
    const list = doc.createElement(kind.tag);
    list.setAttribute('data-thai-typed', '');
    kids[i].before(list);
    while (i < kids.length) {
      const k = listKind(kids[i], kids[i + 1]);
      if (!k || k.type !== kind.type) break;
      const li = doc.createElement('li');
      moveInto(kids[i], li, k.strip);
      if (k.type === 'star') {
        li.append(doc.createElement('br'));
        moveInto(kids[i + 1], li, null);
        i += 2;
      } else {
        i += 1;
      }
      list.append(li);
    }
  }
  body.querySelectorAll('[data-thai-record]').forEach((el) => el.removeAttribute('data-thai-record'));

  // a sentence split over two paragraphs ("..., " / "next part") -> one paragraph
  [...body.querySelectorAll(':scope > p')].forEach((p) => {
    const next = p.nextElementSibling;
    if (!p.isConnected || !next || next.tagName !== 'P') return;
    if (/,$/.test(text(p)) && !isBoldOnly(p) && !isBoldOnly(next)) {
      p.append(doc.createTextNode(' '));
      moveInto(next, p, null);
    }
  });

  // authored list items: unwrap <p>, join mid-sentence <br>, typed "•" lines -> nested list
  body.querySelectorAll('li').forEach((li) => {
    if (li.parentElement.hasAttribute('data-thai-typed')) return;
    if (li.children.length === 1 && li.firstElementChild.tagName === 'P' && !text(li).replace(text(li.firstElementChild), '')) {
      unwrap(li.firstElementChild);
    }
    if (!li.querySelector(':scope > br')) return;
    const segments = [[]];
    [...li.childNodes].forEach((n) => {
      if (n.nodeName === 'BR') segments.push([]);
      else segments[segments.length - 1].push(n);
    });
    const segText = (seg) => seg.map((n) => n.textContent).join('').replace(/[\s ]+/g, ' ').trim();
    const firstBullet = segments.findIndex((seg) => /^[•·]/.test(segText(seg)));
    const lead = firstBullet === -1 ? segments : segments.slice(0, firstBullet);
    const bullets = firstBullet === -1 ? [] : segments.slice(firstBullet);
    li.textContent = '';
    lead.forEach((seg, idx) => {
      if (idx > 0) li.append(doc.createTextNode(' '));
      seg.forEach((n) => li.append(n));
    });
    if (bullets.length) {
      const ul = doc.createElement('ul');
      bullets.forEach((seg) => {
        const item = doc.createElement('li');
        seg.forEach((n) => item.append(n));
        stripLeading(item, /^[\s ]*[•·][\s ]*/);
        ul.append(item);
      });
      li.append(ul);
    }
  });
  body.querySelectorAll('[data-thai-typed]').forEach((el) => el.removeAttribute('data-thai-typed'));
}

/* ---------- spacers ---------- */

function removeSpacers(root) {
  root.querySelectorAll('strong, b, em, i, u, span').forEach((el) => {
    if (isBlank(el) && !el.closest('button')) el.remove();
  });
  root.querySelectorAll('p').forEach((p) => {
    if (isBlank(p)) p.remove();
  });
}

function removeComments(root, doc) {
  const it = doc.createNodeIterator(root, 128 /* SHOW_COMMENT */);
  const list = [];
  let n = it.nextNode();
  while (n) {
    list.push(n);
    n = it.nextNode();
  }
  list.forEach((c) => c.remove());
}

/* ---------- afterTransform helpers ---------- */

function setLevel(h, level, doc) {
  if (`H${level}` === h.tagName) return h;
  const n = doc.createElement(`h${level}`);
  [...h.attributes].forEach((a) => n.setAttribute(a.name, a.value));
  while (h.firstChild) n.append(h.firstChild);
  h.replaceWith(n);
  return n;
}

// repeated card titles typed at mixed levels in the source (h3, h4, h4 ...) -> one level
function unifyCardTitleLevels(root, doc) {
  const groups = {};
  root.querySelectorAll('h2, h3, h4, h5, h6').forEach((h) => {
    const cls = (h.getAttribute('class') || '').trim();
    if (!/card/i.test(cls)) return;
    (groups[cls] = groups[cls] || []).push(h);
  });
  Object.values(groups).forEach((hs) => {
    const min = Math.min(...hs.map((h) => parseInt(h.tagName.slice(1), 10)));
    hs.forEach((h) => setLevel(h, min, doc));
  });
}

// one h1; no skipped levels; siblings keep a common level (stack based)
/**
 * Links to migrated content pages (/{market}/content/…) use the Edge Delivery page URL:
 * relative, lower case, no trailing slash (the source mixes case: /offers-Promotions/…/).
 * Links into the booking and service applications (/{market}/book/…) are left as they are.
 */
function normalizeLinks(root) {
  root.querySelectorAll('a[href]').forEach((a) => {
    const href = a.getAttribute('href');
    const m = href.match(/^(?:https?:\/\/www\.thaiairways\.com)?(\/[a-z]{2}-[a-z]{2}\/content\/[^?#]*)([?#].*)?$/i);
    if (!m) return;
    const path = m[1].replace(/\/+$/, '').toLowerCase();
    a.setAttribute('href', `${path}${m[2] || ''}`);
  });
}

/**
 * Every page needs one h1. Many source pages have none (the title is a styled h2, or there is
 * no title at all): the first heading outside blocks becomes the h1; failing that, the page
 * title (without the "| Thai Airways" suffix) is inserted as the h1 at the top.
 */
function ensureH1(root, doc) {
  if (root.querySelector('h1')) return;
  const first = [...root.querySelectorAll('h2, h3, h4, h5, h6')].find((h) => !h.closest('table'));
  if (first) {
    renameTag(first, 'h1');
    return;
  }
  const title = text(doc.querySelector('title')).split('|')[0].trim();
  if (!title) return;
  const h1 = doc.createElement('h1');
  h1.textContent = title;
  root.prepend(h1);
}

function closeHeadingGaps(root, doc) {
  const stack = [];
  let seenH1 = false;
  [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')].forEach((h) => {
    let src = parseInt(h.tagName.slice(1), 10);
    if (src === 1) {
      if (seenH1) src = 2;
      seenH1 = true;
    }
    while (stack.length && stack[stack.length - 1].src >= src) stack.pop();
    const parentOut = stack.length ? stack[stack.length - 1].out : 0;
    const out = parentOut ? Math.min(src, parentOut + 1) : Math.min(src, src === 1 ? 1 : 2);
    stack.push({ src, out });
    setLevel(h, out, doc);
  });
}

const TRACKING_ATTR = /^(on[a-z]+|data-cmp-.*|data-bs-.*|data-analytics.*|data-track.*|data-gtm.*|data-sly-.*|data-tab-id|data-emptytext)$/i;

function stripTracking(root) {
  root.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((a) => {
      if (TRACKING_ATTR.test(a.name)) el.removeAttribute(a.name);
    });
  });
}

export default function transform(hookName, element, payload) {
  const doc = (payload && payload.document) || element.ownerDocument;

  if (hookName === 'beforeTransform') {
    // chrome and widgets
    removeAll(element, CHROME);
    element.querySelectorAll('nav.cmp-breadcrumb').forEach((nav) => (nav.closest('.cmp') || nav).remove());

    // assets inside components (JSON-LD is kept for the metadata transformer)
    removeAll(element, ['link[rel="stylesheet"]', 'link[href*="clientlibs"]', 'style', 'noscript']);
    element.querySelectorAll('script').forEach((s) => {
      // the home page's content feeds (data-excat-feed) are read by its parsers
      if (!/ld\+json/i.test(s.getAttribute('type') || '') && !s.hasAttribute('data-excat-feed')) s.remove();
    });
    removeComments(element, doc);

    // hidden mobile duplicates of tab bars / jump links
    removeAll(element, [
      '.offers .navigation-section .nav-select',
      '.multitabscrolling nav.d-md-none',
      '.multitabscrolling select',
      '.multitabfilter nav.d-md-none',
    ]);
    // single-tab filter bar (nothing to switch); multi-tab bars are left for review
    element.querySelectorAll('.multitabfilter').forEach((bar) => {
      if (bar.querySelectorAll('.nav-item, .nav-link').length <= 1 || bar.querySelectorAll('.nav-item').length <= 1) bar.remove();
    });

    // empty spacer / separator components
    removeAll(element, ['.ghost', '.separator', 'hr.cmp-separator__horizontal-rule']);
    // source rules would open stray sections (section-break markers are kept)
    element.querySelectorAll('hr:not([data-excat-section-id])').forEach((hr) => hr.remove());
    element.querySelectorAll('.highlightsBenefits .note, .infoContainer').forEach((el) => {
      if (isBlank(el)) el.remove();
    });
    // embedded 1×1 spacer images (the importer may already have turned data: into blob:)
    element.querySelectorAll('img[src^="data:"], img[src^="blob:"]').forEach((img) => {
      const w = parseInt(img.getAttribute('width'), 10);
      const h = parseInt(img.getAttribute('height'), 10);
      const src = img.getAttribute('src');
      if (w <= 2 || h <= 2 || (src.startsWith('data:') && src.length < 400)) (img.closest('picture') || img).remove();
    });
    // components with nothing in them (e.g. a carousel rendered only in the browser) would
    // become empty blocks
    element.querySelectorAll('.aem-GridColumn').forEach((el) => {
      if (isBlank(el)) el.remove();
    });

    fixImages(element, doc);
    convertButtons(element, doc);
    decodeMailto(element);
    normalizeHeadings(element, doc);

    element.querySelectorAll('.newsannouncementdetails .news-text').forEach((body) => normalizeNewsBody(body, doc));
    element.querySelectorAll('.news-divider').forEach((el) => el.remove());

    removeSpacers(element);
    unifyCardTitleLevels(element, doc);
  }

  if (hookName === 'afterTransform') {
    // news category/date belong to page metadata (read by thaiairways-metadata.js)
    removeAll(element, ['.news-subtitle', '.news-divider', '.news-img']);
    removeAll(element, [
      'script', 'style', 'link', 'noscript', 'meta', 'select', '#fb-root', '#onetrust-consent-sdk',
      'iframe:not([src*="youtube"]):not([src*="youtu.be"]):not([src*="vimeo"])',
    ]);

    normalizeLinks(element);
    ensureH1(element, doc);
    closeHeadingGaps(element, doc);
    stripTracking(element);

    // body-level empty wrappers
    [...element.querySelectorAll(':scope > div')].forEach((div) => {
      if (isBlank(div) && !div.querySelector('table, hr')) div.remove();
    });
  }
}
