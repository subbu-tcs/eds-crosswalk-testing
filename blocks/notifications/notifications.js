// interface labels the content cannot carry (until the per-market labels sheet exists)
const LABELS = {
  region: 'Notices',
  dialog: 'Notice',
  seeAll: 'See All',
  close: 'Close',
  dismiss: 'Dismiss notices',
  pause: 'Pause notices',
  play: 'Play notices',
};
const ROTATE_MS = 6000;
const ALLOWED_TAGS = new Set(['P', 'UL', 'OL', 'LI', 'B', 'STRONG', 'I', 'EM', 'BR', 'A']);
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

function element(tag, className, attrs = {}) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
  return el;
}

const clean = (text) => String(text ?? '').replace(/\s+/g, ' ').trim();
const plainText = (html) => clean(new DOMParser().parseFromString(String(html ?? ''), 'text/html').body.textContent);

/**
 * A date from the sheet or feed. ISO values keep their time zone (UTC when given as "Z");
 * a date-only end date covers the whole day.
 */
function parseTime(value, { end = false } = {}) {
  const text = clean(value);
  if (!text) return end ? Infinity : -Infinity;
  if (/^\d+(\.\d+)?$/.test(text)) {
    // spreadsheet serial dates (days since 1899-12-30)
    return Math.round((Number(text) - 25569) * 86400000);
  }
  const time = Date.parse(text);
  if (Number.isNaN(time)) return end ? Infinity : -Infinity;
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && end ? time + 86399999 : time;
}

/** Message HTML kept to paragraphs, lists, emphasis and safe links; plain text gets paragraphs. */
function renderMessage(value) {
  const source = String(value ?? '');
  const container = element('div', 'notifications-message');
  if (!/<[a-z][\s\S]*>/i.test(source)) {
    source.split(/\n\s*\n/).map(clean).filter(Boolean).forEach((text) => {
      const p = element('p');
      p.textContent = text;
      container.append(p);
    });
    return container;
  }
  const { body } = new DOMParser().parseFromString(source, 'text/html');
  body.querySelectorAll('*').forEach((el) => {
    if (!ALLOWED_TAGS.has(el.tagName)) {
      el.replaceWith(...el.childNodes);
      return;
    }
    const href = el.tagName === 'A' ? el.getAttribute('href') : null;
    const external = el.tagName === 'A' && el.getAttribute('target') === '_blank';
    [...el.attributes].forEach((attr) => el.removeAttribute(attr.name));
    if (href && /^(https?:|mailto:|tel:|\/)/i.test(href.trim())) el.setAttribute('href', href.trim());
    if (external) {
      el.target = '_blank';
      el.rel = 'noopener';
    }
  });
  body.querySelectorAll('p').forEach((p) => {
    if (!p.textContent.trim() && !p.querySelector('br, a')) p.remove();
  });
  container.append(...body.childNodes);
  return container;
}

/** Notices from the market sheet (Heading, Message, Link, Link text, Start, End) or AEM feed. */
function toNotices(json) {
  if (Array.isArray(json.seeAllBannerNotification)) {
    return json.seeAllBannerNotification.map((item) => ({
      heading: plainText(item.message?.bannerHeading),
      message: item.message?.description || '',
      start: parseTime(item.startTimeUTC),
      end: parseTime(item.endTimeUTC, { end: true }),
    }));
  }
  const rows = Array.isArray(json.data) ? json.data : json[json[':names']?.[0]]?.data || [];
  return rows.map((row) => {
    const r = Object.fromEntries(Object.entries(row)
      .map(([k, v]) => [k.toLowerCase().replace(/[^a-z]/g, ''), v]));
    return {
      heading: clean(r.heading),
      message: r.message || '',
      link: clean(r.link)
        ? { href: clean(r.link), text: clean(r.linktext) || clean(r.link) }
        : null,
      start: parseTime(r.start),
      end: parseTime(r.end, { end: true }),
    };
  });
}

/**
 * Loads this market's notices: its notifications sheet, otherwise the current AEM feed
 * (which only responds on the production domain).
 */
async function loadNotices(market) {
  const sources = [`${market ? `/${market}` : ''}/notifications.json`];
  if (market) sources.push(`/bin/banner/notification.json?${market}`);
  return sources.reduce((found, source) => found.then(async (notices) => {
    if (notices) return notices;
    try {
      const resp = await fetch(source);
      return resp.ok ? toNotices(await resp.json()) : null;
    } catch {
      return null;
    }
  }), Promise.resolve(null)).then((notices) => notices || []);
}

function signature(notices) {
  return notices.map((n) => n.heading).join('|').slice(0, 500);
}

function buildDialog(notices) {
  const dialog = element('dialog', 'notifications-dialog', { 'aria-labelledby': 'notifications-dialog-title' });
  const header = element('div', 'notifications-dialog-header');
  const title = element('h2', '', { id: 'notifications-dialog-title' });
  title.textContent = LABELS.dialog;
  const close = element('button', 'notifications-dialog-close', { type: 'button', 'aria-label': LABELS.close });
  close.append(element('span', 'notifications-icon', { 'aria-hidden': 'true' }));
  header.append(title, close);
  const list = element('ol', 'notifications-list');
  notices.forEach((notice, i) => {
    const li = element('li', '', { id: `notifications-item-${i + 1}` });
    const heading = element('h3');
    heading.textContent = notice.heading;
    li.append(heading, renderMessage(notice.message));
    if (notice.link) {
      const p = element('p');
      const a = element('a', '', { href: notice.link.href });
      a.textContent = notice.link.text;
      p.append(a);
      li.lastElementChild.append(p);
    }
    list.append(li);
  });
  const body = element('div', 'notifications-dialog-body');
  body.append(list);
  dialog.append(header, body);
  close.addEventListener('click', () => dialog.close());
  // a click on the backdrop closes the dialog
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
  dialog.addEventListener('close', () => { document.body.style.overflowY = ''; });
  return dialog;
}

/**
 * loads and decorates the notification ticker
 * @param {Element} block The notifications block element
 */
export default async function decorate(block) {
  const wrapper = block.parentElement;
  const [, market = ''] = window.location.pathname.split('/');
  const storageKey = `notifications:${market}`;
  const remember = (state) => {
    try { sessionStorage.setItem(storageKey, state); } catch { /* storage unavailable */ }
  };

  const now = Date.now();
  const notices = (await loadNotices(/^[a-z]{2}-[a-z]{2}$/.test(market) ? market : ''))
    .filter((n) => n.heading && n.start <= now && now <= n.end);
  let dismissed = '';
  try { dismissed = localStorage.getItem(`${storageKey}:dismissed`) || ''; } catch { /* none */ }
  if (!notices.length || dismissed === signature(notices)) {
    remember('none');
    wrapper.remove();
    return;
  }
  remember('shown');

  const bar = element('section', 'notifications-bar', { 'aria-label': LABELS.region });
  bar.append(element('span', 'notifications-info', { 'aria-hidden': 'true' }));
  const viewport = element('div', 'notifications-viewport');
  const track = element('ul', 'notifications-track');
  const dialog = buildDialog(notices);
  const open = (index) => {
    document.body.style.overflowY = 'hidden';
    dialog.showModal();
    if (index > 0) dialog.querySelector(`#notifications-item-${index + 1}`)?.scrollIntoView({ block: 'start' });
  };
  notices.forEach((notice, i) => {
    const li = element('li', i === 0 ? 'is-current' : '', i === 0 ? {} : { 'aria-hidden': 'true' });
    const button = element('button', 'notifications-headline', { type: 'button', tabindex: i === 0 ? '0' : '-1' });
    button.textContent = notice.heading;
    button.addEventListener('click', () => open(i));
    li.append(button);
    track.append(li);
  });
  viewport.append(track);

  const actions = element('div', 'notifications-actions');
  const seeAll = element('button', 'notifications-see-all', { type: 'button', 'aria-haspopup': 'dialog' });
  seeAll.textContent = LABELS.seeAll;
  seeAll.addEventListener('click', () => open(0));
  const dismiss = element('button', 'notifications-dismiss', { type: 'button', 'aria-label': LABELS.dismiss });
  dismiss.append(element('span', 'notifications-icon', { 'aria-hidden': 'true' }));
  dismiss.addEventListener('click', () => {
    try { localStorage.setItem(`${storageKey}:dismissed`, signature(notices)); } catch { /* session only */ }
    remember('none');
    wrapper.remove();
  });

  // one heading at a time; rotation pauses on hover, focus, the pause button or reduced motion
  let current = 0;
  let paused = false;
  let timer;
  const show = (index) => {
    [...track.children].forEach((li, i) => {
      li.classList.toggle('is-current', i === index);
      li.toggleAttribute('aria-hidden', i !== index);
      li.firstElementChild.tabIndex = i === index ? 0 : -1;
    });
    track.style.setProperty('--notifications-index', index);
    current = index;
  };
  const pause = element('button', 'notifications-pause', { type: 'button', 'aria-label': LABELS.pause, 'aria-pressed': 'false' });
  pause.append(element('span', 'notifications-icon', { 'aria-hidden': 'true' }));
  const stop = () => window.clearInterval(timer);
  const start = () => {
    stop();
    if (paused || notices.length < 2 || prefersReducedMotion.matches) return;
    timer = window.setInterval(() => show((current + 1) % notices.length), ROTATE_MS);
  };
  pause.addEventListener('click', () => {
    paused = !paused;
    pause.setAttribute('aria-pressed', String(paused));
    pause.setAttribute('aria-label', paused ? LABELS.play : LABELS.pause);
    if (paused) stop();
    else start();
  });
  bar.addEventListener('mouseenter', stop);
  bar.addEventListener('mouseleave', start);
  bar.addEventListener('focusin', stop);
  bar.addEventListener('focusout', (e) => { if (!bar.contains(e.relatedTarget)) start(); });
  prefersReducedMotion.addEventListener('change', start);

  if (notices.length > 1 && !prefersReducedMotion.matches) actions.append(pause);
  actions.append(seeAll, dismiss);
  const inner = element('div', 'notifications-inner');
  inner.append(bar.firstElementChild, viewport, actions);
  bar.append(inner);
  block.replaceChildren(bar, dialog);
  wrapper.classList.add('is-reserved');
  start();
}
