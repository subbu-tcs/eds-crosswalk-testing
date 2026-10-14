import { createOptimizedPicture, toClassName } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// block-level fields rendered by Crosswalk as leading single-cell rows, in model order
const CONFIG_FIELDS = ['label', 'previousLabel', 'nextLabel'];
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6';

function uniqueId(base) {
  let id = base;
  let n = 2;
  while (document.getElementById(id)) {
    id = `${base}-${n}`;
    n += 1;
  }
  return id;
}

function scrollBehavior() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
}

function readConfig(block) {
  const config = {};
  CONFIG_FIELDS.forEach((field) => {
    const row = block.firstElementChild;
    if (row && row.children.length === 1 && !row.querySelector('picture')) {
      config[field] = row.textContent.trim();
      row.remove();
    }
  });
  return config;
}

function applyAccessibleName(block, labelText) {
  if (labelText) {
    block.setAttribute('role', 'region');
    block.setAttribute('aria-label', labelText);
    return;
  }
  const section = block.closest('.section');
  const ordered = [...(section?.querySelectorAll(`${HEADING_SELECTOR}, .block`) || [])];
  const heading = ordered
    .slice(0, Math.max(ordered.indexOf(block), 0))
    .filter((el) => el.matches(HEADING_SELECTOR))
    .at(-1);
  if (heading) {
    if (!heading.id) heading.id = uniqueId(toClassName(heading.textContent) || 'carousel-heading');
    block.setAttribute('role', 'region');
    block.setAttribute('aria-labelledby', heading.id);
  }
}

/**
 * Builds an optimized picture; with a mobile source the desktop crop applies from 600px up.
 */
function buildPicture(img, mobileImg, { hero, eager }) {
  const widths = hero
    ? [{ media: '(width >= 1200px)', width: '2000' }, { media: '(width >= 600px)', width: '1200' }, { width: '750' }]
    : [{ media: '(width >= 900px)', width: '750' }, { width: '600' }];
  const picture = createOptimizedPicture(img.src, img.alt, eager, widths);
  moveInstrumentation(img, picture.querySelector('img'));

  if (hero && mobileImg) {
    const mobile = createOptimizedPicture(mobileImg.src, img.alt, eager, [{ width: '750' }]);
    picture.querySelectorAll('source:not([media]), img').forEach((el) => el.remove());
    picture.append(...mobile.children);
  }
  if (eager) picture.querySelector('img').setAttribute('fetchpriority', 'high');
  return picture;
}

function slideTitle(content, image, index) {
  const candidate = content?.querySelector(`${HEADING_SELECTOR}, strong, b, p`);
  return candidate?.textContent.trim() || image?.alt?.trim() || String(index + 1);
}

function buildSlide(row, index, options) {
  const cells = [...row.children];
  const pictureCells = cells.filter((c) => c.querySelector('picture') && !c.textContent.trim());
  const content = cells.find((c) => !pictureCells.includes(c) && c.textContent.trim());
  const [imageCell, mobileCell] = pictureCells;
  const img = imageCell?.querySelector('img');

  const slide = document.createElement('li');
  slide.className = 'carousel-slide';
  moveInstrumentation(row, slide);

  if (img) {
    const media = document.createElement('div');
    media.className = 'carousel-slide-image';
    media.append(buildPicture(img, mobileCell?.querySelector('img'), {
      hero: options.hero,
      eager: options.eagerFirst && index === 0,
    }));
    slide.append(media);
  }
  if (content) {
    content.className = 'carousel-slide-content';
    slide.append(content);
  } else {
    slide.classList.add('carousel-slide-image-only');
  }
  return { slide, title: slideTitle(content, img, index) };
}

function iconButton(className, label) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = className;
  button.setAttribute('aria-label', label);
  return button;
}

function enhance(block, list, slides, titles, config) {
  const controls = document.createElement('div');
  controls.className = 'carousel-controls';

  const hasArrows = Boolean(config.previousLabel && config.nextLabel);
  const prev = hasArrows && iconButton('carousel-prev', config.previousLabel);
  const next = hasArrows && iconButton('carousel-next', config.nextLabel);

  const indicators = document.createElement('div');
  indicators.className = 'carousel-indicators';
  const dots = slides.map((slide, i) => {
    if (!slide.id) slide.id = uniqueId(`carousel-slide-${toClassName(titles[i]) || i + 1}`);
    const dot = iconButton('carousel-indicator', titles[i]);
    dot.setAttribute('aria-controls', slide.id);
    indicators.append(dot);
    return dot;
  });

  if (prev) controls.append(prev);
  controls.append(indicators);
  if (next) controls.append(next);
  block.append(controls);
  block.classList.add('carousel-ready');

  const origin = () => slides[0].offsetLeft;
  const goTo = (i) => list.scrollTo({
    left: slides[i].offsetLeft - origin(),
    behavior: scrollBehavior(),
  });
  const step = () => (slides[1] ? slides[1].offsetLeft - slides[0].offsetLeft : list.clientWidth);

  const visible = new Set();
  const update = () => {
    const firstVisible = slides.findIndex((s) => visible.has(s));
    const current = firstVisible >= 0 ? firstVisible : 0;
    dots.forEach((dot, i) => {
      if (i === current) dot.setAttribute('aria-current', 'true');
      else dot.removeAttribute('aria-current');
    });
    if (hasArrows) {
      const atStart = list.scrollLeft <= 1;
      const atEnd = list.scrollLeft + list.clientWidth >= list.scrollWidth - 1;
      prev.setAttribute('aria-disabled', String(atStart));
      next.setAttribute('aria-disabled', String(atEnd));
    }
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) visible.add(entry.target);
      else visible.delete(entry.target);
    });
    update();
  }, { root: list, threshold: 0.6 });
  slides.forEach((slide) => observer.observe(slide));
  // sections are hidden while loading and widths change on resize: re-measure when size changes
  const resizeObserver = new ResizeObserver(update);
  resizeObserver.observe(list);

  let frame;
  list.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }, { passive: true });

  dots.forEach((dot, i) => dot.addEventListener('click', () => goTo(i)));
  if (hasArrows) {
    prev.addEventListener('click', () => {
      if (prev.getAttribute('aria-disabled') !== 'true') list.scrollBy({ left: -step(), behavior: scrollBehavior() });
    });
    next.addEventListener('click', () => {
      if (next.getAttribute('aria-disabled') !== 'true') list.scrollBy({ left: step(), behavior: scrollBehavior() });
    });
  }
  update();
}

/**
 * loads and decorates the block
 * @param {Element} block The block element
 */
export default function decorate(block) {
  const config = readConfig(block);
  const hero = block.classList.contains('hero');
  const firstSection = document.querySelector('main .section');
  const options = { hero, eagerFirst: hero && block.closest('.section') === firstSection };

  const list = document.createElement('ul');
  list.className = 'carousel-slides';
  const titles = [];
  const slides = [...block.children]
    .filter((row) => row.children.length)
    .map((row, index) => {
      const { slide, title } = buildSlide(row, index, options);
      titles.push(title);
      list.append(slide);
      return slide;
    });

  applyAccessibleName(block, config.label);
  block.replaceChildren(list);
  if (slides.length > 1) enhance(block, list, slides, titles, config);
}
