/* eslint-disable */
/* global WebImporter */

/**
 * thaiairways.com page metadata transformer.
 *
 * beforeTransform reads values from the untouched source DOM (head meta, JSON-LD, news
 * header) and removes the news category/date line from the body; afterTransform writes
 * one Metadata block (field names follow models/_page.json):
 *   title, description (fallback: first body paragraph), image (og:image / JSON-LD /
 *   page banner), category + date (news), category + validfrom + validto (offer detail
 *   pages; see the offer sources below).
 * If a Metadata block already exists (import script called createMetadata), missing
 * rows are appended to it instead of creating a second block.
 */

const ORIGIN = 'https://www.thaiairways.com';
const state = new WeakMap();

const norm = (s) => (s || '').replace(/[\s ]+/g, ' ').trim();

const MONTHS = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

// offer folder -> category (must match the landing-page tab labels)
const OFFER_CATEGORIES = {
  'special-offers': 'Special Offers',
  partnerprivileges: 'Partners',
  'royal-orchid-plus': 'Royal Orchid Plus',
};

/*
 * Offer end dates ("Now until <date>" footnotes on the offers landing cards), captured
 * 2026-10-17 from migration-work/analysis/landing-page/offers-promotions/
 * authoring-analysis.json "offerInventory". Keyed by lower-case path without trailing
 * slash. Offers that were not on the landing page at capture time have no entry and get
 * no validto.
 */
const OFFER_VALIDTO = {
  '/th-th/content/offers-promotions/special-offers/fly-to-dom-2026': '2026-12-15',
  '/th-th/content/offers-promotions/special-offers/jnto-18': '2026-10-18',
  '/en-th/content/offers-promotions/special-offers/fly-thai-explore-europe': '2026-10-31',
  '/en-th/content/offers-promotions/special-offers/fly-thai-fly-beyond': '2026-10-31',
  '/en-th/content/offers-promotions/special-offers/experience-business-class-a-journey-made-exceptional': '2026-10-31',
  '/en-th/content/offers-promotions/special-offers/domestic-flash-sale': '2026-10-31',
  '/en-th/content/offers-promotions/special-offers/book-now-fly-later': '2026-10-31',
  '/en-th/content/offers-promotions/special-offers/getaway-for-less': '2026-10-31',
  '/en-th/content/offers-promotions/special-offers/rise-to-gold': '2026-11-30',
  '/en-th/content/offers-promotions/special-offers/senior-fare': '2027-03-31',
  '/en-th/content/offers-promotions/special-offers/religious-fare': '2027-03-31',
  '/en-th/content/offers-promotions/partnerprivileges/fly-to-japan-southkorea-china-and-europe-with-the-kbank-visa': '2027-01-31',
  '/en-th/content/offers-promotions/partnerprivileges/fly-to-hong-kong-with-ktc': '2026-12-31',
  '/en-th/content/offers-promotions/partnerprivileges/fly-to-asia-australia-and-europe-with-the-1-credit-card': '2026-12-31',
  '/en-th/content/offers-promotions/partnerprivileges/fly-to-korea-with-ktc': '2026-12-10',
  '/en-th/content/offers-promotions/partnerprivileges/fly-to-taiwan-with-ktc': '2026-11-30',
  '/en-th/content/offers-promotions/partnerprivileges/fly-to-singapore-with-ktc': '2026-12-31',
  '/en-th/content/offers-promotions/partnerprivileges/special-discount-for-new-amex-cardmembers-at-rktf2026': '2026-12-31',
  '/en-th/content/offers-promotions/partnerprivileges/uob-installments-and-cashback-oct-dec2026': '2026-12-31',
  '/en-th/content/offers-promotions/partnerprivileges/ttbbank-oct-2026-jan-2027': '2027-01-31',
  '/en-th/content/offers-promotions/partnerprivileges/scb-oct-dec-2026': '2026-12-31',
  '/en-th/content/offers-promotions/partnerprivileges/kbank-installments-and-cashback-sep-dec2026': '2026-12-31',
  '/en-th/content/offers-promotions/partnerprivileges/co-promotion-with-bangkok-bank-sep-nov26': '2026-11-30',
  '/en-th/content/offers-promotions/partnerprivileges/krungsri-synergy-sep-dec-2026': '2026-12-31',
  '/en-th/content/offers-promotions/partnerprivileges/krungsri-consumer-installment-jan-dec2026': '2026-12-31',
  '/en-th/content/offers-promotions/partnerprivileges/ktc-fly-forever-2026': '2026-12-31',
  '/en-th/content/offers-promotions/partnerprivileges/scb-installment-jan-dec-2026': '2026-12-31',
  '/en-th/content/offers-promotions/special-offers/mandai': '2027-01-31',
  '/en-th/content/offers-promotions/special-offers/ride-smart-with-thai-airways-and-grab': '2026-12-31',
  '/en-th/content/offers-promotions/special-offers/thaiairwaysxsentosa': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/roh-flavours-of-korat': '2026-10-30',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-i-can-read': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-the-little-gym': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-my-gym': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-quartier-cineart': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-zero-latency-thailand': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-vocalize-singing-academy-by-kru-fasai': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-vayu-muaythai': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-play-chef': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-kumo': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-kolor-me': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-kiddoland': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-copel': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-code-genius': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-chois-taekwondo-academy': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-character-academy': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-cala-dance-studio': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-yamaha-music-school': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-vrbear': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-playerbox-exclusiveprivilege': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-pianaksornchinese-language-school': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-mortimer-english-club': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-joyliday': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-haolechineselanguage-school': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/thai-junior-sky-explorers-bounce': '2027-03-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/hertz-offer-special-discounts-2026': '2026-12-15',
  '/en-th/content/offers-promotions/royal-orchid-plus/hertz-thailand-offer-october-december-2026': '2026-12-15',
  '/en-th/content/offers-promotions/royal-orchid-plus/sea-life-bangkok-and-madame-tussauds-bangkok': '2027-02-28',
  '/en-th/content/offers-promotions/royal-orchid-plus/avis-tg66aniversay': '2027-01-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/avis-tg66anni-airport-transfer': '2027-01-31',
  '/en-th/content/offers-promotions/royal-orchid-plus/discount-thai-smooth-as-silk-premier-cinema': '2026-12-31',
};

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
    // leave as-is
  }
  return s;
}

// "1 October 2026", "01 July 2025", "October 1, 2026", "2026-10-01..." -> YYYY-MM-DD
function toIsoDate(raw) {
  const s = norm(raw);
  if (!s) return '';
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  const pad = (n) => String(n).padStart(2, '0');
  m = s.match(/(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]+)\.?,?\s+(\d{4})/);
  if (m && MONTHS[m[2].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[2].toLowerCase()])}-${pad(m[1])}`;
  m = s.match(/([A-Za-z]+)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/);
  if (m && MONTHS[m[1].toLowerCase()]) return `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(m[2])}`;
  return '';
}

/*
 * Offer dates and category, from three sources in order:
 * 1. the offers feed (offers.model.json, the site's live offer list with validFrom, validTo
 *    and cardFilter), embedded in the page snapshot by tools/importer/home-feeds.mjs; matched
 *    by the offer's slug, preferring an entry in the same market;
 * 2. OFFER_VALIDTO above (the offers landing page on 2026-10-17), for offers since delisted;
 * 3. the period the page states: "Booking / Sales / Promotion / Ticketing / Purchase /
 *    Campaign period|date(s): … <date>", the last date of that statement (never a Travel or
 *    Stay period).
 */
const FEED_CATEGORIES = {
  specialOffers: 'Special Offers', partners: 'Partners', rop: 'Royal Orchid Plus', roh: 'Royal Orchid Holidays',
};
const urlPath = (u) => (u || '').replace(/^https?:\/\/www\.thaiairways\.com/i, '').split(/[?#]/)[0]
  .replace(/\/+$/, '').toLowerCase();
const slugOf = (p) => p.split('/').pop();

/** The embedded offers feed entries; the feed element is removed from the page. */
function readOfferFeed(doc) {
  const el = doc.querySelector('[data-excat-feed="offers"]');
  if (!el) return [];
  let entries = [];
  try {
    entries = JSON.parse(el.textContent).fieldValues || [];
  } catch (e) {
    entries = [];
  }
  el.remove();
  return entries;
}

function feedEntry(entries, path) {
  const market = path.split('/')[1];
  const matches = entries.filter((e) => slugOf(urlPath(e.redirectionurl)) === slugOf(path));
  return matches.find((e) => urlPath(e.redirectionurl).startsWith(`/${market}/`)) || matches[0] || null;
}

const PERIOD_LABEL = /\b(?:booking|sales|promotion(?:al)?|ticketing|purchase|campaign)\s+(?:period|dates?)\s*:?/i;
// where the statement ends: the next period label, or a travel/stay clause ("Stay anytime …")
const ANY_LABEL = /\b(?:(?:booking|sales|promotion(?:al)?|ticketing|purchase|campaign)\s+(?:period|dates?)|travel|stay|flight)\b/i;
const FULL_DATE = /\d{1,2}(?:st|nd|rd|th)?\s+[A-Za-z]+\.?,?\s+\d{4}/g;

/** The end date of the sales/booking period the page states, or ''. */
function statedEnd(element) {
  let end = '';
  element.querySelectorAll('p, li, td, h3, h4, h5, h6').forEach((el) => {
    const text = norm(el.textContent);
    const m = text.match(PERIOD_LABEL);
    if (!m) return;
    // up to the next period label (a Travel or Stay period often follows on the same line)
    let rest = text.slice(m.index + m[0].length);
    const next = rest.match(ANY_LABEL);
    if (next) rest = rest.slice(0, next.index);
    const dates = (rest.match(FULL_DATE) || []).map(toIsoDate).filter(Boolean);
    const last = dates[dates.length - 1];
    if (last && last > end) end = last;
  });
  return end;
}

function headMeta(doc, selector) {
  const head = doc.head || doc;
  const el = head.querySelector(selector);
  return norm(el && el.getAttribute('content'));
}

function jsonLdObjects(doc) {
  const out = [];
  doc.querySelectorAll('script[type="application/ld+json"]').forEach((s) => {
    try {
      const data = JSON.parse(s.textContent);
      const walk = (d) => {
        if (Array.isArray(d)) d.forEach(walk);
        else if (d && typeof d === 'object') {
          out.push(d);
          if (d['@graph']) walk(d['@graph']);
        }
      };
      walk(data);
    } catch (e) {
      // invalid JSON-LD: ignore
    }
  });
  return out;
}

function ldImage(obj) {
  const img = obj && obj.image;
  if (!img) return '';
  if (typeof img === 'string') return img;
  if (Array.isArray(img)) return ldImage({ image: img[0] });
  return img.url || img.contentUrl || '';
}

function pageUrl(payload, doc) {
  const p = payload || {};
  const candidates = [
    p.params && p.params.originalURL,
    p.url,
    doc.querySelector('link[rel="canonical"]') && doc.querySelector('link[rel="canonical"]').getAttribute('href'),
  ];
  for (const c of candidates) {
    if (!c) continue;
    try {
      return new URL(c, ORIGIN);
    } catch (e) {
      // try next
    }
  }
  return null;
}

// titles / taglines typed as fully bold or italic paragraphs are not descriptions
function isBoldOnly(p) {
  if (!p.querySelector('strong, b, em, i')) return false;
  const c = p.cloneNode(true);
  c.querySelectorAll('strong, b, em, i').forEach((s) => s.remove());
  return !norm(c.textContent);
}

function firstParagraph(root) {
  const scope = root.querySelector('.newsannouncementdetails .news-text')
    || root.querySelector('div.root > div.cmp-container > div.aem-Grid > div.responsivegrid > div.aem-Grid')
    || root;
  const skip = '.header-react, .footer-react, .cmp-breadcrumb, #onetrust-consent-sdk, .offers-bookingwidget-1, table, nav, .news-subtitle, [class*="card"], .multiAccordion';
  const p = [...scope.querySelectorAll('p')].find((el) => {
    const t = norm(el.textContent);
    return t && !el.closest(skip) && !isBoldOnly(el) && !/^[-–—_=]{5,}$/.test(t);
  });
  return p ? norm(p.textContent) : '';
}

export default function transform(hookName, element, payload) {
  const doc = (payload && payload.document) || element.ownerDocument;

  if (hookName === 'beforeTransform') {
    const meta = {};
    const ld = jsonLdObjects(doc);
    const article = ld.find((o) => /article/i.test(String(o['@type'] || ''))) || null;

    // title
    // (the cleanup transformer may already have turned h2.news-heading into the h1)
    const newsHeading = element.querySelector('.newsannouncementdetails .news-heading, .newsannouncementdetails .news-header h1');
    meta.title = norm(newsHeading && newsHeading.textContent)
      || norm(doc.querySelector('head > title') && doc.querySelector('head > title').textContent)
      || headMeta(doc, 'meta[property="og:title"]');

    // description
    const desc = [headMeta(doc, 'meta[name="description"]'), headMeta(doc, 'meta[property="og:description"]')]
      .find((d) => d && !/create-react-app/i.test(d));
    meta.description = desc || firstParagraph(element);

    // image
    const banner = element.querySelector('.newsannouncementdetails img.news-banner, .banner img.normalImg, .banner img, .titlewithimage img');
    meta.image = fixImageUrl(headMeta(doc, 'meta[property="og:image"]')
      || ldImage(article) || ld.map(ldImage).find(Boolean)
      || (banner && banner.getAttribute('src')) || '');

    // news: category badge + date line
    const subtitle = element.querySelector('.newsannouncementdetails .news-subtitle');
    if (subtitle || article) {
      const badge = subtitle && subtitle.querySelector('.card-badge');
      const dateEl = subtitle && subtitle.querySelector('h6, .news-date, time');
      if (badge && norm(badge.textContent)) meta.category = norm(badge.textContent);
      meta.date = toIsoDate(dateEl && (dateEl.getAttribute('datetime') || dateEl.textContent))
        || toIsoDate(article && (article.datePublished || article.dateModified));
    }
    if (subtitle) subtitle.remove();
    element.querySelectorAll('.newsannouncementdetails .news-divider').forEach((d) => d.remove());

    // offer detail pages: dates and category from the feed, the landing capture or the page
    const feed = readOfferFeed(doc);
    const url = pageUrl(payload, doc);
    if (url) {
      const path = url.pathname.toLowerCase().replace(/\/(index(\.html)?)?$/, '').replace(/\.html$/, '');
      const m = path.match(/\/offers-promotions\/([^/]+)\/[^/]+$/);
      if (m && OFFER_CATEGORIES[m[1]]) {
        const entry = feedEntry(feed, path);
        meta.category = (entry && FEED_CATEGORIES[entry.cardFilter]) || OFFER_CATEGORIES[m[1]];
        meta.validfrom = toIsoDate(entry && entry.validFrom);
        const sources = [
          ['offers feed', toIsoDate(entry && entry.validTo)],
          ['offers page capture', OFFER_VALIDTO[path] || ''],
          ['period stated on the page', statedEnd(element)],
        ];
        const [source, date] = sources.find(([, d]) => d) || ['', ''];
        meta.validto = date;
        if (date) console.log(`[thaiairways-metadata] ${path}: valid to ${date} (${source})`);
        else console.warn(`[thaiairways-metadata] ${path}: no end date in the feed, the capture or the page`);
      }
    }

    state.set(doc, meta);
  }

  if (hookName === 'afterTransform') {
    const meta = state.get(doc);
    if (!meta) return;
    state.delete(doc);

    const rows = [];
    const add = (key, value) => {
      if (value) rows.push([key, value]);
    };
    add('title', meta.title);
    add('description', meta.description);
    if (meta.image) {
      const img = doc.createElement('img');
      img.setAttribute('src', meta.image);
      rows.push(['image', img]);
    }
    add('category', meta.category);
    add('date', meta.date);
    add('validfrom', meta.validfrom);
    add('validto', meta.validto);
    if (!rows.length) return;

    const existing = [...element.querySelectorAll('table')].find((t) => {
      const c = t.querySelector('tr > th, tr > td');
      return c && /^metadata$/i.test(norm(c.textContent));
    });
    if (existing) {
      const have = new Set([...existing.querySelectorAll('tr')].map((tr) => norm(tr.firstElementChild && tr.firstElementChild.textContent).toLowerCase()));
      const body = existing.querySelector('tbody') || existing;
      rows.forEach(([k, v]) => {
        if (have.has(k.toLowerCase())) return;
        const tr = doc.createElement('tr');
        const td1 = doc.createElement('td');
        const td2 = doc.createElement('td');
        td1.textContent = k;
        if (typeof v === 'string') td2.textContent = v;
        else td2.append(v);
        tr.append(td1, td2);
        body.append(tr);
      });
      return;
    }

    const cells = {};
    rows.forEach(([k, v]) => {
      cells[k] = v;
    });
    element.append(WebImporter.Blocks.createBlock(doc, { name: 'Metadata', cells }));
  }
}
