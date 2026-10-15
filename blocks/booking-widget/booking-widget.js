import { loadScript } from '../../scripts/aem.js';

/*
 * Mounts the existing Thai Airways React booking widget (the "web layer" bundle in AEM).
 * When it executes, the bundle renders into the element with id MOUNT_ID, reads every
 * data-* attribute as its configuration, and calls its backend APIs relative to the page
 * origin. It only receives live data on the production domain, where the CDN routes those
 * paths to the existing origin.
 */
const BUNDLE_URL = 'https://www.thaiairways.com/content/dam/thaiairways/scripts/standalone-react/bookingwidget.bundle.min.js';
// stylesheets the widget expects from the hosting page; loaded scoped to the widget only
const VENDOR_CSS = [
  'https://www.thaiairways.com/etc.clientlibs/thaiairways/clientlibs/clientlib-bootstrap.min.css',
  'https://cdn.jsdelivr.net/npm/react-datepicker/dist/react-datepicker.min.css',
];
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

function afterPageLoad() {
  if (document.readyState === 'complete') return Promise.resolve();
  return new Promise((resolve) => { window.addEventListener('load', resolve, { once: true }); });
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
  await afterPageLoad();
  await whenNearViewport(block);
  await loadScopedVendorCss();
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
