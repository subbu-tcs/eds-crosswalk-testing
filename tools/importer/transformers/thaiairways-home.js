/* eslint-disable */
/* global WebImporter */

/**
 * thaiairways.com home page (React app) transformer, for the home-page template only.
 *
 * The home page renders everything inside #root, with generated class names that change on
 * every build, so its sections are recognised by their content instead and marked with
 * data-home="<name>" for the template's block and section selectors:
 *   carousel  #primary.carousel-primary (hero slides)
 *   booking   the Book Flight / Manage Booking / Check-in / Flight Status panel
 *   services  Hotels / Transportation / Insurance / Airport Services strip
 *   offers    "Discover your next adventure" (h1)
 *   partners  "Exclusive Deals with Our Partners"
 *   fares     "Trending Destinations From"
 *   rop       the Royal Orchid Plus band ("More than a journey…")
 *   news      "News & Announcements"
 * The content feeds embedded in the snapshot as hidden divs (tools/importer/home-feeds.mjs) are
 * moved into the section that uses them, where the parsers read them. The notification ribbon
 * (an automatic block in the project), the empty personalisation slot, the app's header and its
 * loading overlays are removed, and duplicate meta tags are dropped.
 *
 * Runs before the sections and cleanup transformers (beforeTransform only).
 */
const norm = (s) => (s || '').replace(/[\s ​]+/g, ' ').trim();

const SECTIONS = [
  ['booking', (el) => /Book Flight/.test(el.textContent) && /Manage Booking/.test(el.textContent) && /Flight Status/.test(el.textContent)],
  ['services', (el) => /Hotels/.test(el.textContent) && /Transportation/.test(el.textContent) && /Insurance/.test(el.textContent) && el.textContent.length < 400],
  ['offers', (el) => /Discover your next adventure/i.test(el.textContent) && !!el.querySelector('h1, h2')],
  ['partners', (el) => /Exclusive Deals with Our Partners/i.test(el.textContent)],
  ['fares', (el) => /Trending Destinations From/i.test(el.textContent)],
  ['rop', (el) => /More than a journey/i.test(el.textContent) && /Royal Orchid Plus/i.test(el.textContent)],
  ['news', (el) => /News & Announcements/i.test(norm(el.textContent))],
];
const FEED_SECTION = { bannercarousel: 'carousel', moreservices: 'services', offers: 'offers' };

export default function transform(hookName, element, payload) {
  if (hookName !== 'beforeTransform') return;
  if (!payload || !payload.template || payload.template.name !== 'home-page') return;
  const doc = (payload && payload.document) || element.ownerDocument;
  const wrap = doc.querySelector('#root main > div') || doc.querySelector('#root main');
  if (!wrap) return;

  const carousel = wrap.querySelector('#primary');
  if (carousel) carousel.dataset.home = 'carousel';
  [...wrap.children].forEach((el) => {
    if (el.dataset.home) return;
    const match = SECTIONS.find(([name, test]) => !wrap.querySelector(`[data-home="${name}"]`) && test(el));
    if (match) el.dataset.home = match[0];
  });

  // feeds go into the section that reads them
  doc.querySelectorAll('[data-excat-feed]').forEach((feed) => {
    const target = wrap.querySelector(`[data-home="${FEED_SECTION[feed.dataset.excatFeed]}"]`);
    if (target) target.append(feed);
    else feed.remove();
  });

  // automatic in the project (notifications block) or empty for this visitor
  [...wrap.children].forEach((el) => {
    if (el.dataset.home) return;
    if (/notification ribbon|PASSENGER NOTICE/i.test(el.textContent) || el.id === 'mcp-placeholder1' || !norm(el.textContent)) el.remove();
  });
  // the app's own header (not in the .header-react wrapper of content pages) and overlays
  doc.querySelectorAll('#thaiHeader, #root .modal-backdrop, #root [class*="main-loading"], #root > noscript').forEach((el) => el.remove());
  // icons the app generates in the browser and tracking pixels (blob: URLs) can't be imported
  doc.querySelectorAll('img[src^="blob:"]').forEach((img) => (img.closest('picture') || img).remove());

  // the app writes its meta tags twice; createMetadata would join the duplicates
  const seen = new Set();
  doc.head.querySelectorAll('meta[name], meta[property]').forEach((m) => {
    const key = m.getAttribute('name') || m.getAttribute('property');
    if (seen.has(key)) m.remove();
    else seen.add(key);
  });
}
