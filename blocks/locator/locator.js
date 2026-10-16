const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';
const ALLOWED_TAGS = new Set(['P', 'UL', 'OL', 'LI', 'B', 'STRONG', 'I', 'EM', 'BR', 'A']);

function element(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
  return el;
}

const clean = (value) => String(value ?? '').replace(/\s+/g, ' ').trim();

/** Plain text of a value holding HTML or entities, e.g. "<p>Reservation &amp; Ticketing</p>". */
function plainText(value) {
  const text = String(value ?? '');
  if (!/[<&]/.test(text)) return clean(text);
  return clean(new DOMParser().parseFromString(text, 'text/html').body.textContent);
}

/**
 * Field label from a data key: "operationTime" -> "Operation time", "call" -> "Call",
 * "KIOSK CHECK-IN" -> "Kiosk check-in"; mixed-case keys ("Royal Silk Class") stay as written.
 */
function prettyLabel(key) {
  const raw = clean(String(key).replace(/_+/g, ' '));
  // camelCase keys from the feeds become words
  const text = /^[a-z][A-Za-z0-9]*$/.test(raw) ? raw.replace(/([a-z0-9])([A-Z])/g, '$1 $2') : raw;
  const lower = text.toLowerCase();
  if (raw !== text || text === lower || text === text.toUpperCase()) {
    return lower.charAt(0).toUpperCase() + lower.slice(1);
  }
  return text;
}

const hasDigits = (text, min) => (text.match(/\d/g) || []).length >= min;

/** Turns phone numbers, e-mail addresses and web addresses in a text node into links. */
function linkifyText(node, { phones }) {
  // phone: an optional "(+66)" or "+" prefix, then digits, spaces and dashes
  const pattern = /([\w.+-]+@[\w-]+\.[\w.-]+)|(https?:\/\/[^\s,<>]+|www\.[^\s,<>]+)|((?:\(\s*\+?[\d\s]{1,8}\)|\+)?\s*\d[\d\s-]{5,}\d)/g;
  const text = node.textContent;
  const parts = [];
  let last = 0;
  text.replace(pattern, (match, email, url, phone, offset) => {
    if (phone && (!phones || !hasDigits(phone, 7))) return match;
    parts.push(text.slice(last, offset));
    let href;
    if (email) href = `mailto:${email}`;
    else if (url) href = url.startsWith('http') ? url : `https://${url}`;
    else href = `tel:${phone.replace(/[^\d+]/g, '')}`;
    const a = element('a', '', { href });
    a.textContent = match;
    parts.push(a);
    last = offset + match.length;
    return match;
  });
  if (!parts.length) return;
  parts.push(text.slice(last));
  node.replaceWith(...parts.filter((part) => part !== ''));
}

/**
 * Renders a data value: authored HTML is reduced to paragraphs, lists, emphasis and safe links;
 * plain phone numbers, e-mails and web addresses become links (fax and licence numbers stay text).
 */
function renderValue(value, label = '') {
  const container = element('div');
  const source = String(value ?? '');
  if (/<[a-z][\s\S]*>/i.test(source)) {
    const { body } = new DOMParser().parseFromString(source, 'text/html');
    body.querySelectorAll('*').forEach((el) => {
      if (!ALLOWED_TAGS.has(el.tagName)) {
        el.replaceWith(...el.childNodes);
        return;
      }
      const href = el.tagName === 'A' ? el.getAttribute('href') : null;
      [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
      if (href && /^(https?:|mailto:|tel:|\/)/i.test(href.trim())) el.setAttribute('href', href.trim());
    });
    // drop spacer paragraphs (&nbsp; only)
    body.querySelectorAll('p').forEach((p) => { if (!p.textContent.trim() && !p.querySelector('br')) p.remove(); });
    container.append(...body.childNodes);
  } else {
    container.textContent = clean(source);
  }
  const phones = !/fax|licen[cs]e/i.test(label);
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) if (!walker.currentNode.parentElement.closest('a')) nodes.push(walker.currentNode);
  nodes.forEach((node) => linkifyText(node, { phones }));
  return container;
}

/** Icon for a field, chosen by its label and what the value holds. */
function iconFor(label, value) {
  const text = label.toLowerCase();
  const content = plainText(value);
  if (text.length > 40) return 'info';
  if (/mail/.test(text)) return 'mail';
  if (/web|site|url/.test(text)) return 'globe';
  if (/locat|address/.test(text)) return 'location';
  const startsWithNumber = /^\s*(?:\(\s*\+?[\d\s]{1,8}\)|\+)?\s*\d[\d\s-]{5,}\d/.exec(content);
  if (/call|phone|tel|fax/.test(text) || (startsWithNumber && hasDigits(startsWithNumber[0], 7))) return 'phone';
  if (/time|hour|open/.test(text)) return 'clock';
  return 'info';
}

/** Adds the city to airport names without it: "Bangkok (Suvarnabhumi Airport)". */
function airportName(city, airport) {
  if (!airport) return city;
  return airport.toLowerCase().includes(city.toLowerCase()) ? airport : `${city} (${airport})`;
}

/* ---------- data: current AEM feeds ---------- */

/** /bin/modal/v1/airportinformation.json: countries > cities > tabs of groups. */
function fromAemAirports(json) {
  return json.countryItems.flatMap((country) => (country.cityDetails || []).map((city) => ({
    country: clean(country.country),
    countryCode: clean(country.countryCode).toUpperCase(),
    countryDefault: clean(country.defaultairportCode).toUpperCase(),
    city: clean(city.city),
    code: clean(city.cityCode).toUpperCase(),
    name: airportName(clean(city.city), clean(city.airportInfo)),
    image: city.bannerImage || '',
    sections: (city.tabItems || []).map((tab) => {
      const section = {
        title: clean(tab.tab), intro: '', html: '', groups: [],
      };
      Object.entries(tab).forEach(([key, value]) => {
        if (key === 'tab' || value === null || value === undefined) return;
        if (key === 'loungeTitle' || key === 'basicFactTitle') {
          section.title = clean(value) || section.title;
        } else if (key === 'loungeDesc') {
          section.intro = value;
        } else if (key === 'basicFactDesc') {
          section.html = value;
        } else if (key === 'imagesList' && Array.isArray(value)) {
          value.forEach((lounge) => section.groups.push({
            kind: 'feature',
            eyebrow: clean(lounge.loungeType),
            title: clean(lounge.loungeTitle),
            subtitle: clean(lounge.loungeText),
            entries: lounge.loungeDescription ? [{ label: '', value: lounge.loungeDescription }] : [],
            image: lounge.imagePath || '',
            link: lounge.ctaredirectionurl
              ? { href: lounge.ctaredirectionurl, text: clean(lounge.ctabuttontext) }
              : null,
          }));
        } else if (typeof value === 'object') {
          const entries = Object.entries(value)
            .filter(([, v]) => plainText(v))
            .map(([label, v]) => ({ label: prettyLabel(label), value: v }));
          if (entries.length) section.groups.push({ title: clean(key), entries });
        }
      });
      return section;
    }).filter((section) => section.groups.length
      || plainText(section.html) || plainText(section.intro)),
  })));
}

/** /bin/modal/thaiworldwideOfficesv1.json: countries > cities > categories > offices. */
function fromAemOffices(json) {
  return json.countryList.flatMap((country) => (country.cityDetails || []).map((city) => {
    const categories = new Map();
    (city.categoryItems || []).forEach((item) => {
      // the feed spells one category several ways ("<p>Reservation &amp; Ticketing</p>", ...)
      const title = plainText(item.category).replace(/\s*:.*$/, '');
      if (!categories.has(title)) categories.set(title, []);
      (item.officeDetails || []).forEach((office) => {
        const { address, ...fields } = office;
        categories.get(title).push({
          name: plainText(address),
          entries: Object.entries(fields)
            .filter(([, v]) => plainText(v) && plainText(v) !== 'null')
            .map(([label, v]) => ({ label: prettyLabel(label), value: v })),
        });
      });
    });
    return {
      country: clean(country.country),
      countryCode: clean(country.countryCode).toUpperCase(),
      city: clean(city.city),
      categories: [...categories].map(([title, offices]) => ({ title, offices })),
    };
  }));
}

/* ---------- data: published sheets (one row per field) ---------- */

const RESERVED = ['country', 'countrycode', 'city', 'citycode', 'airport', 'image', 'section', 'group', 'label', 'value', 'link', 'linktext', 'category', 'name'];
const keyOf = (header) => header.toLowerCase().replace(/[^a-z0-9]/g, '');

function sheetRows(json) {
  const data = Array.isArray(json.data) ? json.data : json[json[':names']?.[0]]?.data;
  return (data || []).map((row) => {
    const byKey = {};
    Object.entries(row).forEach(([header, value]) => { byKey[keyOf(header)] = value; });
    return { row, byKey };
  });
}

/**
 * Airports sheet: Country, Country code, City, City code, Airport, Image, Section, Group, Label,
 * Value, Link, Link text. A row without a group is the section's introduction.
 */
function fromSheetAirports(json) {
  const cities = new Map();
  sheetRows(json).forEach(({ byKey: r }) => {
    const code = clean(r.citycode).toUpperCase();
    if (!code) return;
    if (!cities.has(code)) {
      cities.set(code, {
        country: clean(r.country),
        countryCode: clean(r.countrycode).toUpperCase(),
        city: clean(r.city),
        code,
        name: airportName(clean(r.city), clean(r.airport)),
        image: '',
        sections: [],
      });
    }
    const city = cities.get(code);
    if (!r.section) {
      if (r.image) city.image = r.image;
      return;
    }
    let section = city.sections.find((s) => s.title === clean(r.section));
    if (!section) {
      section = {
        title: clean(r.section), intro: '', html: '', groups: [],
      };
      city.sections.push(section);
    }
    if (!r.group) {
      section.intro = [section.intro, r.value].filter(Boolean).join(' ');
      return;
    }
    let group = section.groups.find((g) => g.title === clean(r.group));
    if (!group) {
      group = { title: clean(r.group), entries: [] };
      section.groups.push(group);
    }
    if (r.image) {
      group.kind = 'feature';
      group.image = r.image;
    }
    if (r.link) group.link = { href: r.link, text: clean(r.linktext) || clean(r.link) };
    if (plainText(r.value)) group.entries.push({ label: clean(r.label), value: r.value });
  });
  return [...cities.values()];
}

/** Offices sheet: Country, Country code, City, Category, Name, then any other columns as fields. */
function fromSheetOffices(json) {
  const cities = new Map();
  sheetRows(json).forEach(({ row, byKey: r }) => {
    const key = `${clean(r.countrycode)}|${clean(r.city)}`;
    if (!clean(r.city)) return;
    if (!cities.has(key)) {
      cities.set(key, {
        country: clean(r.country),
        countryCode: clean(r.countrycode).toUpperCase(),
        city: clean(r.city),
        categories: [],
      });
    }
    const city = cities.get(key);
    const title = plainText(r.category);
    let category = city.categories.find((c) => c.title === title);
    if (!category) {
      category = { title, offices: [] };
      city.categories.push(category);
    }
    category.offices.push({
      name: plainText(r.name),
      entries: Object.entries(row)
        .filter(([header, value]) => !RESERVED.includes(keyOf(header)) && plainText(value))
        .map(([header, value]) => ({ label: clean(header), value })),
    });
  });
  return [...cities.values()];
}

async function loadData(source, kind) {
  const resp = await fetch(source);
  if (!resp.ok) throw new Error(`locator data responded ${resp.status}`);
  const json = await resp.json();
  if (Array.isArray(json.countryItems)) return fromAemAirports(json);
  if (Array.isArray(json.countryList)) return fromAemOffices(json);
  return kind === 'offices' ? fromSheetOffices(json) : fromSheetAirports(json);
}

/* ---------- rendering ---------- */

function precedingHeadingLevel(block) {
  const section = block.closest('.section');
  const ordered = [...(section?.querySelectorAll(`${HEADING_SELECTOR}, .block`) || [])];
  const heading = ordered.slice(0, Math.max(ordered.indexOf(block), 0))
    .filter((el) => el.matches(HEADING_SELECTOR)).at(-1) || document.querySelector('main h1');
  return Number(heading?.tagName.slice(1) || 1);
}

const headingTag = (level) => `h${Math.min(Math.max(level, 2), 6)}`;

function renderEntries(entries) {
  const list = element('dl', 'locator-entries');
  entries.forEach(({ label, value }) => {
    const item = element('div', `locator-entry${label ? '' : ' no-label'}`);
    if (label) {
      const icon = element('span', `locator-icon locator-icon-${iconFor(label, value)}`, { 'aria-hidden': 'true' });
      const dt = element('dt');
      dt.textContent = label;
      item.append(icon, dt);
    }
    const dd = element('dd');
    dd.append(...renderValue(value, label).childNodes);
    item.append(dd);
    list.append(item);
  });
  return list;
}

function renderGroup(group, level) {
  const card = element('article', group.kind === 'feature' ? 'locator-card locator-feature' : 'locator-card');
  if (group.image) {
    const img = element('img', 'locator-feature-image', { src: group.image, alt: '', loading: 'lazy' });
    img.addEventListener('error', () => img.remove());
    card.append(img);
  }
  const body = element('div', 'locator-card-body');
  if (group.eyebrow) {
    const eyebrow = element('p', 'locator-eyebrow');
    eyebrow.textContent = group.eyebrow;
    body.append(eyebrow);
  }
  if (group.title) {
    const title = element(headingTag(level), 'locator-card-title');
    title.textContent = group.title;
    if (group.subtitle) {
      const sub = element('span', 'locator-card-subtitle');
      sub.textContent = group.subtitle;
      title.append(element('br'), sub);
    }
    body.append(title);
  }
  if (group.entries.length) body.append(renderEntries(group.entries));
  if (group.link?.href) {
    const link = element('a', 'button secondary locator-card-link', { href: group.link.href });
    link.textContent = group.link.text;
    body.append(link);
  }
  card.append(body);
  return card;
}

function renderAirport(airport, level, idBase) {
  const wrap = element('div', 'locator-result');
  const heading = element(headingTag(level), 'locator-heading');
  heading.textContent = airport.name;
  wrap.append(heading);
  if (!airport.sections.length) return wrap;

  const ids = airport.sections.map((section, i) => `${idBase}-${i + 1}`);
  const nav = element('nav', 'locator-jump', { 'aria-label': airport.name });
  const navList = element('ul');
  airport.sections.forEach((section, i) => {
    const li = element('li');
    const a = element('a', '', { href: `#${ids[i]}` });
    a.textContent = section.title;
    li.append(a);
    navList.append(li);
  });
  nav.append(navList);
  wrap.append(nav);

  if (airport.image) {
    const banner = element('img', 'locator-banner', { src: airport.image, alt: '', loading: 'lazy' });
    banner.addEventListener('error', () => banner.remove());
    wrap.append(banner);
  }

  airport.sections.forEach((section, i) => {
    const el = element('section', 'locator-section', { 'aria-labelledby': ids[i] });
    const title = element(headingTag(level + 1), 'locator-section-title', { id: ids[i], tabindex: '-1' });
    title.textContent = section.title;
    el.append(title);
    if (plainText(section.intro)) {
      const intro = element('div', 'locator-intro');
      intro.append(...renderValue(section.intro).childNodes);
      el.append(intro);
    }
    if (plainText(section.html)) {
      const rich = element('div', 'locator-rich');
      rich.append(...renderValue(section.html).childNodes);
      el.append(rich);
    }
    if (section.groups.length) {
      const grid = element('div', section.groups.some((g) => g.kind === 'feature') ? 'locator-grid locator-features' : 'locator-grid');
      section.groups.forEach((group) => grid.append(renderGroup(group, level + 2)));
      el.append(grid);
    }
    wrap.append(el);
  });
  return wrap;
}

function renderOffices(city, categoryTitle, level) {
  const wrap = element('div', 'locator-result');
  const heading = element(headingTag(level), 'locator-heading');
  heading.textContent = city.city;
  wrap.append(heading);
  city.categories
    .filter((category) => !categoryTitle || category.title === categoryTitle)
    .forEach((category) => {
      const el = element('section', 'locator-section');
      const title = element(headingTag(level + 1), 'locator-category-title');
      title.textContent = category.title;
      el.append(title);
      const grid = element('div', 'locator-grid locator-list');
      category.offices.forEach((office) => grid.append(
        renderGroup({ title: office.name, entries: office.entries }, level + 2),
      ));
      el.append(grid);
      wrap.append(el);
    });
  return wrap;
}

function createSelect(id, labelText) {
  const field = element('div', 'locator-field');
  const label = element('label', '', { for: id });
  label.textContent = labelText;
  const select = element('select', '', { id });
  field.append(label, select);
  return { field, select };
}

const option = (value, text) => new Option(text, value);

function syncUrl(params) {
  const url = new URL(window.location.href);
  Object.entries(params).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
    else url.searchParams.delete(key);
  });
  window.history.replaceState(null, '', url);
}

/** Block-level fields arrive as single-cell rows in model order: source, default, labels. */
function readConfig(block) {
  const [source, defaultLocation, labels] = [...block.children].map((row) => {
    const cell = row.firstElementChild;
    return cell?.querySelector('a')?.getAttribute('href') || cell?.textContent.trim() || '';
  });
  return {
    kind: block.classList.contains('offices') ? 'offices' : 'airports',
    source,
    defaultLocation: (defaultLocation || '').trim(),
    labels: (labels || '').split('|').map((label) => label.trim()),
  };
}

function setupAirports(block, airports, config, panel, results, level, uid) {
  const [, fieldLabel = ''] = config.labels;
  const { field, select } = createSelect(`${uid}-airport`, fieldLabel);
  const countries = new Map();
  airports.forEach((airport) => {
    if (!countries.has(airport.country)) countries.set(airport.country, []);
    countries.get(airport.country).push(airport);
  });
  [...countries].sort(([a], [b]) => a.localeCompare(b)).forEach(([country, list]) => {
    const group = element('optgroup', '', { label: country });
    list.sort((a, b) => a.city.localeCompare(b.city))
      .forEach((airport) => group.append(option(airport.code, `${airport.city} (${airport.code})`)));
    select.append(group);
  });
  panel.append(field);

  const find = (code) => {
    const wanted = (code || '').toUpperCase();
    const country = airports.find((a) => a.countryCode === wanted);
    return airports.find((a) => a.code === wanted)
      || (country && (airports.find((a) => a.code === country.countryDefault) || country));
  };
  const show = (airport) => {
    select.value = airport.code;
    results.replaceChildren(renderAirport(airport, level, `${uid}-${airport.code.toLowerCase()}`));
  };
  const initial = find(new URLSearchParams(window.location.search).get('location'))
    || find(config.defaultLocation) || airports[0];
  show(initial);
  select.addEventListener('change', () => {
    const airport = find(select.value);
    if (!airport) return;
    show(airport);
    syncUrl({ location: airport.code });
  });
}

function setupOffices(block, cities, config, panel, results, level, uid) {
  const [, countryLabel = '', cityLabel = '', officeLabel = ''] = config.labels;
  const country = createSelect(`${uid}-country`, countryLabel);
  const city = createSelect(`${uid}-city`, cityLabel);
  const office = createSelect(`${uid}-office`, officeLabel);
  panel.append(country.field, city.field, office.field);

  const countries = [...new Map(cities.map((c) => [c.countryCode, c.country]))]
    .sort(([, a], [, b]) => a.localeCompare(b));
  country.select.append(...countries.map(([code, name]) => option(code, name)));

  const citiesOf = (code) => cities.filter((c) => c.countryCode === code);
  const fillCities = (code) => city.select
    .replaceChildren(...citiesOf(code).map((c) => option(c.city, c.city)));
  const current = () => cities
    .find((c) => c.countryCode === country.select.value && c.city === city.select.value);
  const fillOffices = () => {
    const titles = current()?.categories.map((c) => c.title) || [];
    office.select.replaceChildren(...titles.map((title) => option(title, title)));
  };
  const render = () => {
    const selected = current();
    if (selected) results.replaceChildren(renderOffices(selected, office.select.value, level));
    syncUrl({
      country: country.select.value, city: city.select.value, office: office.select.value,
    });
  };

  const params = new URLSearchParams(window.location.search);
  const wanted = (config.defaultLocation || '').toUpperCase();
  const byCity = cities.find((c) => c.city.toUpperCase() === wanted);
  const start = cities.find((c) => c.countryCode === params.get('country') && c.city === params.get('city'))
    || cities.find((c) => c.countryCode === params.get('country'))
    || byCity || cities.find((c) => c.countryCode === wanted) || cities[0];
  country.select.value = start.countryCode;
  fillCities(start.countryCode);
  city.select.value = start.city;
  fillOffices();
  if (params.get('office') && [...office.select.options].some((o) => o.value === params.get('office'))) {
    office.select.value = params.get('office');
  }
  const selected = current();
  if (selected) results.replaceChildren(renderOffices(selected, office.select.value, level));

  country.select.addEventListener('change', () => {
    fillCities(country.select.value);
    fillOffices();
    render();
  });
  city.select.addEventListener('change', () => {
    fillOffices();
    render();
  });
  office.select.addEventListener('change', render);
}

/**
 * loads and decorates the locator
 * @param {Element} block The locator block element
 */
export default async function decorate(block) {
  const config = readConfig(block);
  const uid = `locator-${[...document.querySelectorAll('.locator.block')].indexOf(block) + 1}`;
  const level = precedingHeadingLevel(block) + 1;

  const fieldset = element('fieldset', 'locator-picker');
  const legend = element('legend');
  legend.textContent = config.labels[0] || '';
  const panel = element('div', 'locator-fields');
  fieldset.append(legend, panel);
  const results = element('div', 'locator-results');
  block.replaceChildren(fieldset, results);

  // in Universal Editor the data address may not be set yet
  if (!config.source) return;
  let data;
  try {
    data = await loadData(config.source, config.kind);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('locator: data unavailable', error);
  }
  if (!data?.length) {
    block.classList.add('is-empty');
    return;
  }
  if (config.kind === 'offices') setupOffices(block, data, config, panel, results, level, uid);
  else setupAirports(block, data, config, panel, results, level, uid);
}
