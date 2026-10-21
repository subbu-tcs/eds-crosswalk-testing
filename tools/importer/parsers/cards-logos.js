/* eslint-disable */
/* global WebImporter */

/**
 * Parser for cards-logos (project block "cards" + option logos = "Cards (logos)").
 * Source: thaiairways.com `.heading-multiImage` (partner logo grids, usually inside a shared
 * `.experiencefragment`): h2.heading-title (often empty) + .alignedList* > a[href] > img.
 * Model (blocks/cards/_cards.json, item "card"): image (+imageAlt) | text -> one row per logo;
 * the text is one link named after the partner ("Logos: one link named after the partner").
 * A logo whose <a> has no href (Citi) gets plain text (card not clickable).
 *
 * The source alts are empty, so the partner name is resolved in this order:
 *   1. a non-empty img alt / link title in the source
 *   2. the curated names from the page analyses (keyed by the link's last path segment, or the
 *      image file name when there is no link)
 *   3. a name humanised from the link slug / image file name (review these after import).
 * Links keep the source paths. A non-empty heading is kept as default content above the block.
 */
const NAMES = {
  // credit card partners
  'aeon-royal-orchid-plus': 'AEON Royal Orchid Plus',
  'thai-american-express-platinum-credit-card': 'THAI American Express Platinum Credit Card',
  'ktc-royal-orchid-plus': 'KTC Royal Orchid Plus',
  'uob-royal-orchid-plus-credit-card': 'UOB Royal Orchid Plus Credit Card',
  aeon: 'AEON',
  'american-express': 'American Express',
  'bangkok-bank-credit-card': 'Bangkok Bank',
  'central-credit-card': 'Central The1 Credit Card',
  'citi-logo': 'Citi',
  'diners-club-international': 'Diners Club International',
  'k-credit-card': 'KBank K Credit Card',
  'krungsri-credit-cards': 'Krungsri Credit Cards',
  ktc: 'KTC',
  'scb-credit-cards': 'SCB',
  'tmb-thanachart-ttb': 'ttb (TMBThanachart)',
  uob: 'UOB',
  // Star Alliance airlines
  'aegean-airlines': 'Aegean Airlines',
  'air-canada-ac': 'Air Canada',
  'air-china-ca': 'Air China',
  'air-india-ai': 'Air India',
  'air-new-zealand-nz': 'Air New Zealand',
  'all-nippon-airways-nh': 'ANA (All Nippon Airways)',
  'asiana-airlines-oz': 'Asiana Airlines',
  'austrian-airlines-group-os': 'Austrian Airlines',
  'avianca-brazil': 'Avianca',
  'brussels-airlines-sn': 'Brussels Airlines',
  'copa-airlines-cm': 'Copa Airlines',
  'croatia-airlines-ou': 'Croatia Airlines',
  'egypt-air-ms': 'EgyptAir',
  'ethiopian-airlines-et': 'Ethiopian Airlines',
  'eva-air-br': 'EVA Air',
  'ita-airways-az': 'ITA Airways',
  'lot-polishairlines-lo': 'LOT Polish Airlines',
  'lufthansa-lh': 'Lufthansa',
  'shenzhen-airlines-zh': 'Shenzhen Airlines',
  'singapore-airlines-sq': 'Singapore Airlines',
  'south-african-airways-sa': 'South African Airways',
  'swiss-lx': 'SWISS',
  'tap-portugal-tp': 'TAP Air Portugal',
  thai: 'Thai Airways',
  'turkish-airlines-tk': 'Turkish Airlines',
  'united-airlines-ua': 'United Airlines',
};
const ACRONYMS = new Set(['aeon', 'ktc', 'uob', 'scb', 'ana', 'eva', 'ita', 'lot', 'thai', 'ttb', 'kbank', 'bbl', 'amex', 'tap']);

const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

function hinted(document, field, nodes) {
  const frag = document.createDocumentFragment();
  frag.appendChild(document.createComment(` field:${field} `));
  nodes.forEach((n) => frag.appendChild(n));
  return frag;
}

function lastSegment(url) {
  const path = (url || '').split(/[?#]/)[0];
  const parts = path.split('/').filter(Boolean);
  return decodeURIComponent(parts[parts.length - 1] || '').replace(/\.html?$/i, '').toLowerCase();
}

function fileKey(src) {
  return lastSegment(src).replace(/\.(png|jpe?g|gif|svg|webp)$/i, '');
}

function humanize(slug, dropCode) {
  let words = slug.replace(/[_%20]+/g, '-').split('-').filter(Boolean)
    .filter((w) => !/^(logo\d*|wine|noncobrand|nonco)$/i.test(w));
  if (dropCode && words.length > 1 && /^[a-z0-9]{2}$/i.test(words[words.length - 1])) words = words.slice(0, -1);
  return words.map((w) => (ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1))).join(' ');
}

function partnerName(a, img) {
  const own = norm(img && img.getAttribute('alt')) || norm(a && a.getAttribute('title')) || norm(a && a.textContent);
  if (own) return own;
  const href = a && a.getAttribute('href');
  const slug = href ? lastSegment(href) : '';
  const file = img ? fileKey(img.getAttribute('src') || '') : '';
  if (slug && NAMES[slug]) return NAMES[slug];
  if (!slug && file && NAMES[file.toLowerCase()]) return NAMES[file.toLowerCase()];
  if (slug) return humanize(slug, /star-alliance|airlines?/i.test(href));
  return humanize(file, false);
}

/** Path of an image URL, decoded, for matching it against a panel id. */
function imagePath(src) {
  try {
    return decodeURIComponent(new URL(src, 'https://www.thaiairways.com').pathname);
  } catch (e) {
    return src || '';
  }
}

/**
 * Hotel partners: each logo opens a panel (.offcanvas, id ending with the logo's path) with the
 * partner name, description and links. Those become regular cards, not logos.
 */
function panelText(document, panel, fallbackName) {
  const nodes = [];
  const h3 = document.createElement('h3');
  h3.textContent = norm(panel.querySelector('.hover-card-title')?.textContent) || fallbackName;
  nodes.push(h3);
  panel.querySelectorAll('.hover-card-content p, .hover-card-content li').forEach((el) => {
    if (!norm(el.textContent)) return;
    const p = document.createElement('p');
    p.textContent = norm(el.textContent);
    nodes.push(p);
  });
  panel.querySelectorAll('a[href]').forEach((a) => {
    const label = norm(a.textContent);
    if (!label) return;
    const p = document.createElement('p');
    const link = document.createElement('a');
    link.setAttribute('href', a.getAttribute('href'));
    link.textContent = label;
    p.append(link);
    nodes.push(p);
  });
  return nodes;
}

export default function parse(element, { document }) {
  const cells = [];
  let items = [...element.querySelectorAll('.alignedList')];
  // the same logos twice, once per viewport: keep the desktop copies
  if (items.some((i) => /web-view/.test(i.className))) items = items.filter((i) => !/mobile-view/.test(i.className));
  const units = items.length ? items : [...element.querySelectorAll('img')].map((img) => img.closest('a') || img);
  const panels = [...element.querySelectorAll('.offcanvas[id]')];
  const seen = new Set();
  let described = false;
  units.forEach((unit) => {
    const imgSrc = unit.tagName === 'IMG' ? unit : unit.querySelector('img');
    if (!imgSrc) return;
    const src = imgSrc.getAttribute('src') || imgSrc.getAttribute('data-src') || '';
    if (seen.has(src)) return;
    seen.add(src);
    const a = unit.tagName === 'A' ? unit : (imgSrc.closest('a') || unit.querySelector('a'));
    const path = imagePath(src);
    const panel = panels.find((p) => path && p.id.endsWith(path));
    const name = norm(panel?.querySelector('.hover-card-title')?.textContent) || partnerName(a, imgSrc);

    const img = document.createElement('img');
    img.setAttribute('src', src);
    img.setAttribute('alt', name);

    if (panel) {
      described = true;
      cells.push([hinted(document, 'image', [img]), hinted(document, 'text', panelText(document, panel, name))]);
      return;
    }
    const p = document.createElement('p');
    const href = a && a.getAttribute('href');
    if (href && href !== '#') {
      const link = document.createElement('a');
      link.setAttribute('href', href);
      link.textContent = name;
      p.append(link);
    } else {
      p.textContent = name;
    }
    cells.push([hinted(document, 'image', [img]), hinted(document, 'text', [p])]);
  });

  const block = WebImporter.Blocks.createBlock(document, { name: 'cards', variants: described ? [] : ['logos'], cells });

  const heading = element.querySelector('.heading-title, h2');
  const title = norm(heading && heading.textContent);
  if (title) {
    const h2 = document.createElement('h2');
    h2.textContent = title;
    element.before(h2);
  }
  element.replaceWith(block);
}
