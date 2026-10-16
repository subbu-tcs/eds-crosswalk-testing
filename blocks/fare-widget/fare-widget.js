import { readBlockConfig } from '../../scripts/aem.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function element(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
  return el;
}

const text = (value) => String(Array.isArray(value) ? value.join(' ') : value ?? '').trim();

/** "Bangkok (BKK), Chiang Mai (CNX)" -> [{ code, name }, ...]; bare codes ("BKK") work too. */
function parseOrigins(value) {
  return text(value).split(',').map((part) => {
    const match = part.trim().match(/^(.*?)\s*\(([A-Za-z]{3})\)$/);
    if (match) {
      const code = match[2].toUpperCase();
      return { code, name: match[1].trim() || code };
    }
    const code = part.trim().toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? { code, name: code } : null;
  }).filter(Boolean);
}

/** "ECONOMY" -> "Economy", "PREMIUM_ECONOMY" -> "Premium economy". */
function cabinName(fareClass) {
  const words = text(fareClass).replace(/_+/g, ' ').toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

const fill = (template, values) => text(template)
  .replace(/\{(\w+)\}/g, (match, key) => (key in values ? values[key] : match));

/** Normalises a fare from the service ({ prices: [...] }) or a sheet row ({ data: [...] }). */
function toFare(item) {
  if (item.fare) {
    return {
      origin: item.departureAirportIataCode,
      destination: item.arrivalAirportIataCode,
      city: item.arrivalCityName,
      image: item.arrivalCityImageURL,
      date: item.date,
      returnDate: item.returnDate,
      journey: item.journeyType,
      price: item.fare.totalPrice,
      currency: item.fare.currencyCode,
      cabin: item.fare.fareClass,
    };
  }
  const row = Object.fromEntries(Object.entries(item).map(([key, value]) => [key.toLowerCase().replace(/[^a-z]/g, ''), value]));
  return {
    origin: row.origin,
    destination: row.destination,
    city: row.city || row.destinationname,
    image: row.image,
    date: row.date,
    returnDate: row.returndate,
    journey: row.journey || row.journeytype,
    price: row.price,
    currency: row.currency,
    cabin: row.cabin,
  };
}

const cache = new Map();

/**
 * Loads the fares from one origin. The fares service takes a POST with the trip type and
 * origin; a .json address is read as a sheet and filtered by origin.
 */
function loadFares(source, origin, journey) {
  const key = `${source}|${origin}|${journey}`;
  if (!cache.has(key)) {
    const isSheet = /\.json(\?|$)/.test(source);
    const request = isSheet
      ? fetch(source)
      : fetch(source, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ journeyType: journey, origins: [origin] }),
      });
    cache.set(key, request.then((resp) => {
      if (!resp.ok) throw new Error(`fares responded ${resp.status}`);
      return resp.json();
    }).then((json) => {
      const items = json.prices || json.data || [];
      return items.map(toFare)
        .filter((fare) => fare.city && fare.price)
        .filter((fare) => !isSheet || text(fare.origin).toUpperCase() === origin)
        .filter((fare) => !isSheet || !fare.journey || fare.journey === journey);
    }).catch((error) => {
      cache.delete(key);
      throw error;
    }));
  }
  return cache.get(key);
}

function renderFare(fare, config, origin, index, idBase) {
  const li = element('li', 'fare-widget-item');
  if (fare.image) {
    const img = element('img', 'fare-widget-image', {
      src: fare.image, alt: '', loading: index < 4 ? 'eager' : 'lazy', width: '350', height: '585',
    });
    img.addEventListener('error', () => img.remove());
    li.append(img);
  }
  const body = element('div', 'fare-widget-body');
  const titleId = `${idBase}-${index}`;
  const to = element('p', 'fare-widget-to');
  to.textContent = text(config.to);
  const city = element('h3', 'fare-widget-city', { id: titleId });
  city.textContent = fare.city;
  const trip = element('p', 'fare-widget-trip');
  const journey = fare.journey || config.journey;
  trip.textContent = [journey === 'ONE_WAY' ? text(config.oneway) : text(config.roundtrip), cabinName(fare.cabin)]
    .filter(Boolean).join(', ');
  const price = element('p', 'fare-widget-price');
  price.textContent = fill(config.price || '{currency} {price}', { currency: fare.currency || '', price: fare.price });
  if (text(config.to)) body.append(to);
  body.append(city, trip, price);

  const href = fill(config.link || '', {
    origin, destination: fare.destination || '', date: fare.date || '', returnDate: fare.returnDate || '', journey,
  });
  if (href) {
    const link = element('a', 'fare-widget-book', { href, 'aria-describedby': titleId });
    link.textContent = text(config.book) || fare.city;
    body.append(link);
  }
  li.append(body);
  return li;
}

/**
 * loads and decorates the fare widget
 * @param {Element} block The fare widget block element
 */
export default async function decorate(block) {
  const config = readBlockConfig(block);
  const origins = parseOrigins(config.origins);
  const source = text(config.source);
  const journey = text(config.journey) === 'ONE_WAY' ? 'ONE_WAY' : 'ROUND_TRIP';
  config.journey = journey;
  const limit = Number.parseInt(text(config.limit), 10);
  const uid = `fare-widget-${[...document.querySelectorAll('.fare-widget.block')].indexOf(block) + 1}`;
  block.replaceChildren();
  if (!origins.length || !source) return;

  const header = element('div', 'fare-widget-header');
  const heading = element('h2', 'fare-widget-heading', { id: `${uid}-heading` });
  const headingText = element('span');
  headingText.textContent = text(config.heading);
  heading.append(headingText);
  header.append(heading);

  let select;
  if (origins.length > 1) {
    const field = element('div', 'fare-widget-origin');
    const label = element('label', 'fare-widget-visually-hidden', { for: `${uid}-origin` });
    label.textContent = text(config.from);
    select = element('select', '', { id: `${uid}-origin` });
    origins.forEach((origin) => select.append(new Option(origin.name, origin.code)));
    field.append(label, select);
    header.append(field);
  } else {
    const name = element('span', 'fare-widget-origin-name');
    name.textContent = ` ${origins[0].name}`;
    heading.append(name);
  }

  const controls = element('div', 'fare-widget-controls');
  const prev = element('button', 'fare-widget-prev', { type: 'button', 'aria-label': text(config.previous), 'aria-controls': `${uid}-list` });
  const next = element('button', 'fare-widget-next', { type: 'button', 'aria-label': text(config.next), 'aria-controls': `${uid}-list` });
  [prev, next].forEach((button) => button.append(element('span', 'fare-widget-icon', { 'aria-hidden': 'true' })));
  controls.append(prev, next);
  header.append(controls);

  const list = element('ul', 'fare-widget-list', { id: `${uid}-list`, 'aria-labelledby': `${uid}-heading` });
  block.append(header, list);

  const syncControls = () => {
    const max = list.scrollWidth - list.clientWidth;
    prev.disabled = list.scrollLeft <= 2;
    next.disabled = list.scrollLeft >= max - 2;
    controls.hidden = max <= 2;
  };
  const step = (direction) => {
    const item = list.querySelector('.fare-widget-item');
    const distance = item ? item.getBoundingClientRect().width : list.clientWidth;
    list.scrollBy({ left: direction * distance, behavior: prefersReducedMotion.matches ? 'auto' : 'smooth' });
  };
  prev.addEventListener('click', () => step(-1));
  next.addEventListener('click', () => step(1));
  list.addEventListener('scroll', syncControls, { passive: true });
  window.addEventListener('resize', syncControls, { passive: true });
  // keyboard focus on a fare scrolls it into view
  list.addEventListener('focusin', (e) => e.target.closest('.fare-widget-item')?.scrollIntoView({ block: 'nearest', inline: 'nearest' }));

  const show = async (origin) => {
    block.classList.add('is-loading');
    try {
      const fares = (await loadFares(source, origin, journey))
        .slice(0, Number.isInteger(limit) && limit > 0 ? limit : undefined);
      list.replaceChildren(...fares.map((fare, i) => renderFare(fare, config, origin, i, `${uid}-${origin}`)));
      list.scrollLeft = 0;
      block.classList.toggle('is-empty', fares.length === 0);
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('fare-widget: fares unavailable', error);
      list.replaceChildren();
      block.classList.add('is-empty');
    }
    block.classList.remove('is-loading');
    syncControls();
  };

  select?.addEventListener('change', () => show(select.value));
  await show(origins[0].code);
}
