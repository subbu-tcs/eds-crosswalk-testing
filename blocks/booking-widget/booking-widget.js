import { loadScript } from '../../scripts/aem.js';

/*
 * Mounts the existing Thai Airways React booking widget (the "web layer" bundle in AEM).
 * When it executes, the bundle renders into the element with id MOUNT_ID, reads every
 * data-* attribute as its configuration, and calls its backend APIs relative to the page
 * origin. On the production domain the CDN routes those paths to the existing origin; on
 * any other host (aem.page, aem.live, local) the block sends them to the airline's servers.
 */
const AIRLINE_ORIGIN = 'https://www.thaiairways.com';
const BUNDLE_URL = `${AIRLINE_ORIGIN}/content/dam/thaiairways/scripts/standalone-react/bookingwidget.bundle.min.js`;
// stylesheets the widget expects from the hosting page; loaded scoped to the widget only.
// The airline's clientlib-bootstrap is stock Bootstrap 5.3.3, which the CDN serves to any site
const VENDOR_CSS = [
  'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/react-datepicker/dist/react-datepicker.min.css',
];
// first path segments of the widget's services (its axios baseURL is "/")
const SERVICES = /^\/(?:common|custom_config|check-?in|loyalty|mythai|profile|adminportal|airaward[\w-]*|ancillaries|trip|order|pdf|mdm|flight|json|more-services|ereceipt|government|ticketing|refx|pss_router|promocode|osci|multi|etc\.clientlibs|content\/(?:dam|dapibooking|dapicheckin|thaiairways))(?:[/?]|$)/;
// the widget's fonts (osci/assets/*) and the site's copies of them in /fonts
const SITE_FONTS = {
  'Inter-Regular.ttf': 'inter-regular-latin.woff2',
  'Inter-Medium.ttf': 'inter-medium-latin.woff2',
  'Inter-Bold.ttf': 'inter-bold-latin.woff2',
  'Bellefair.ttf': 'bellefair-regular-latin.woff2',
};
const MOUNT_ID = 'bookFlightStandalone';

// attribute values emitted by the AEM offers-bookingwidget component; the widget needs the full set
const WIDGET_DEFAULTS = {
  'data-captureinputfield': 'false',
  'data-redemption': 'false',
  'data-redemption-toggle': 'false',
  'data-promocode': 'false',
  'data-default-airport-list': 'false',
  'data-trip-type-selection': 'true',
  'data-airport-filter': 'false',
  'data-class': '""',
  'data-trip-type': 'R',
  'data-origin-airport': '',
  'data-departure-airport': '',
  'data-blackout-dates': '',
  'data-show-strike-through': 'false',
  'data-clear-blackout-dates': 'false',
  'data-isdapiredirect': 'true',
  'data-widget-type': 'OFFERS',
  'data-custom-booking-class': '[]',
};

const IATA = /^[A-Z]{3}$/;
let vendorCss;

function toCodes(text) {
  return (text || '')
    .split(',')
    .map((code) => code.trim().toUpperCase())
    .filter((code) => IATA.test(code));
}

/** Block-level fields arrive as single-cell rows in model order: origin, destinations. */
function readConfig(block) {
  const [originRow, destinationsRow] = [...block.children];
  return {
    origin: toCodes(originRow?.textContent)[0] || '',
    destinations: toCodes(destinationsRow?.textContent),
    promoCode: block.classList.contains('promo-code'),
    fixedRoute: block.classList.contains('fixed-route'),
  };
}

function widgetAttributes({
  origin, destinations, promoCode, fixedRoute,
}) {
  const attrs = { ...WIDGET_DEFAULTS };
  attrs['data-promocode'] = String(promoCode);
  attrs['data-origin-airport'] = origin;
  attrs['data-departure-airport'] = destinations.join(',');
  if (fixedRoute && (origin || destinations.length)) {
    // same value format the AEM component writes, e.g. ['BKK'] and ['TPE,KHH']
    attrs['data-airport-filter'] = 'true';
    attrs['data-airport-filter-type'] = 'SelectedAirports';
    attrs['data-airport-filter-from'] = `['${origin}']`;
    attrs['data-airport-filter-to'] = `['${destinations.join(',')}']`;
  }
  return attrs;
}

/**
 * Fetches the vendor stylesheets once and confines them to the widget, in a low-priority
 * cascade layer, so Bootstrap's reset cannot restyle the rest of the page.
 */
function loadScopedVendorCss() {
  if (!vendorCss) {
    vendorCss = Promise.all(VENDOR_CSS.map(async (url) => {
      try {
        const resp = await fetch(url);
        if (!resp.ok) throw new Error(`${resp.status}`);
        const css = (await resp.text()).replace(/:root\b/g, ':scope');
        const style = document.createElement('style');
        style.dataset.bookingWidgetVendor = url;
        style.textContent = `@layer booking-widget-vendor {\n@scope (#${MOUNT_ID}) {\n${css}\n}\n}`;
        document.head.append(style);
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`booking-widget: could not load ${url}`, error);
      }
    }));
  }
  return vendorCss;
}

/** The airline's address for a request to one of the widget's services on this host, else null. */
function airlineUrl(url) {
  try {
    const target = new URL(url instanceof Request ? url.url : url, window.location.href);
    if (target.origin !== window.location.origin || !SERVICES.test(target.pathname)) return null;
    return `${AIRLINE_ORIGIN}${target.pathname}${target.search}`;
  } catch {
    return null;
  }
}

let servicesRouted;

/**
 * Off the airline's domain, sends the widget's service calls (XHR, as axios makes them, and
 * fetch) to the airline's servers instead of this site, and its fonts to the site's copies.
 * The airline answers cross-origin calls for /common/*; its /content/* configuration needs
 * the airline to allow this site's origins (CORS), see docs/booking-widget-hosting.md.
 */
function routeServicesToAirline() {
  if (servicesRouted || window.location.origin === AIRLINE_ORIGIN) return;
  servicesRouted = true;
  const { open } = XMLHttpRequest.prototype;
  XMLHttpRequest.prototype.open = function openOnAirline(method, url, ...rest) {
    return open.call(this, method, airlineUrl(url) || url, ...rest);
  };
  const nativeFetch = window.fetch;
  window.fetch = (input, init) => {
    const url = airlineUrl(input);
    if (!url) return nativeFetch(input, init);
    return nativeFetch(input instanceof Request ? new Request(url, input) : url, init);
  };
  // the widget's @font-face rules also ask this host for the fonts; the site has the same ones
  const fonts = `${window.hlx?.codeBasePath || ''}/fonts/`;
  const siteFonts = (style) => {
    if (!style.textContent.includes('osci/assets/')) return;
    style.textContent = style.textContent.replace(
      /url\((["']?)[^)"']*osci\/assets\/([\w-]+\.ttf)\1\)/g,
      (rule, quote, file) => (SITE_FONTS[file] ? `url(${fonts}${SITE_FONTS[file]})` : rule),
    );
  };
  new MutationObserver((mutations) => mutations.forEach(({ addedNodes }) => {
    addedNodes.forEach((node) => { if (node.tagName === 'STYLE') siteFonts(node); });
  })).observe(document.head, { childList: true });
}

function afterPageLoad() {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => { window.addEventListener('load', resolve, { once: true }); });
}

// any of these means a person is on the page; page-speed tests never send them. Not scroll or
// focusin: scripts cause those too (carousels resetting, the consent banner taking focus)
const INTERACTIONS = ['pointerdown', 'pointermove', 'touchstart', 'keydown', 'wheel'];
let interacted;

/** Resolves on the visitor's first interaction anywhere on the page. */
function firstInteraction() {
  if (!interacted) {
    interacted = new Promise((resolve) => {
      const done = () => {
        INTERACTIONS.forEach((type) => window.removeEventListener(type, done, true));
        resolve();
      };
      const options = { capture: true, passive: true };
      INTERACTIONS.forEach((type) => window.addEventListener(type, done, options));
    });
  }
  return interacted;
}

function whenNearViewport(element) {
  return new Promise((resolve) => {
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        observer.disconnect();
        resolve();
      }
    }, { rootMargin: '300px 0px' });
    observer.observe(element);
  });
}

async function mount(block, host) {
  // the 7 MB bundle waits for the page, for the visitor's first interaction and for the
  // widget to come near the screen, so it never competes with the page's own loading;
  // listening starts now, so an interaction while the page loads counts
  const interaction = firstInteraction();
  await afterPageLoad();
  await interaction;
  await whenNearViewport(block);
  await loadScopedVendorCss();
  routeServicesToAirline();
  try {
    await loadScript(BUNDLE_URL);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('booking-widget: the widget bundle could not be loaded', error);
    block.hidden = true;
    return;
  }
  const rendered = () => {
    host.removeAttribute('aria-busy');
    block.classList.add('booking-widget-ready');
  };
  if (host.childElementCount) {
    rendered();
    return;
  }
  const observer = new MutationObserver(() => {
    if (!host.childElementCount) return;
    observer.disconnect();
    rendered();
  });
  observer.observe(host, { childList: true });
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const config = readConfig(block);

  // while authoring, keep the configured values visible instead of loading the 7 MB bundle
  if (block.hasAttribute('data-aue-resource')) {
    block.classList.add('booking-widget-authoring');
    return;
  }

  block.replaceChildren();
  // the bundle can only drive a single mount point per page
  if (document.getElementById(MOUNT_ID)) {
    // eslint-disable-next-line no-console
    console.warn('booking-widget: only one booking widget can be shown per page; this one is hidden');
    block.hidden = true;
    return;
  }

  const host = document.createElement('div');
  host.id = MOUNT_ID;
  host.className = 'booking-widget-host';
  host.setAttribute('aria-busy', 'true');
  Object.entries(widgetAttributes(config))
    .forEach(([name, value]) => host.setAttribute(name, value));
  block.append(host);

  mount(block, host);
}
