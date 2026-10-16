import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

// rendered image widths per layout (logos and portraits are small)
const IMAGE_WIDTHS = { logos: '400', profile: '600' };

const isTitle = (el) => /^H[1-6]$/.test(el.tagName)
  || (el.tagName === 'P' && el.children.length === 1 && el.firstElementChild.tagName === 'STRONG'
    && el.textContent.trim() === el.firstElementChild.textContent.trim());

/**
 * Marks the parts of a card body: the title (first heading or bold-only paragraph), and for
 * profiles the role (the paragraph after the name).
 */
function decorateBody(body, layout) {
  const title = [...body.children].find(isTitle);
  title?.classList.add('cards-card-title');
  if (layout === 'profile' && title?.nextElementSibling?.tagName === 'P') {
    title.nextElementSibling.classList.add('cards-card-role');
  }
  body.querySelectorAll('a[href]').forEach((a) => {
    if (new URL(a.href, window.location.href).origin === window.location.origin) return;
    const icon = document.createElement('span');
    icon.className = 'cards-icon-external';
    icon.setAttribute('aria-hidden', 'true');
    a.append(icon);
  });
  return title;
}

/**
 * Overlay cards: the title and an arrow sit on the image. On a card that is one link, anything
 * after the title is shown on hover or keyboard focus; otherwise it stays visible so its links
 * can be reached on touch screens.
 */
function decorateOverlay(card, body, title, linked) {
  if (!linked) return;
  if (title) {
    const arrow = document.createElement('span');
    arrow.className = 'cards-card-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    title.append(arrow);
  }
  const rest = [...body.children].filter((el) => el !== title);
  if (!rest.length) return;
  const more = document.createElement('div');
  more.className = 'cards-card-more';
  const inner = document.createElement('div');
  inner.append(...rest);
  more.append(inner);
  body.append(more);
  card.classList.add('has-more');
}

/**
 * loads and decorates the cards
 * @param {Element} block The cards block element
 */
export default function decorate(block) {
  const layout = ['overlay', 'compact', 'profile', 'logos'].find((name) => block.classList.contains(name)) || 'default';
  const ul = document.createElement('ul');
  [...block.children].forEach((row) => {
    const li = document.createElement('li');
    li.className = 'cards-card';
    moveInstrumentation(row, li);
    while (row.firstElementChild) li.append(row.firstElementChild);
    [...li.children].forEach((cell) => {
      if (cell.querySelector('picture') && !cell.textContent.trim()) cell.className = 'cards-card-image';
      else if (cell.textContent.trim() || cell.querySelector('img')) cell.className = 'cards-card-body';
      else cell.remove();
    });

    const body = li.querySelector('.cards-card-body');
    const title = body ? decorateBody(body, layout) : null;
    // one link: the whole card is its click target; two links stay separate actions
    const links = body ? [...body.querySelectorAll('a[href]')] : [];
    const linked = links.length === 1;
    if (linked) {
      li.classList.add('is-linked');
      links[0].classList.add('cards-card-link');
    }
    if (layout === 'overlay' && body) decorateOverlay(li, body, title, linked);
    if (layout === 'logos' && body) {
      body.classList.add('cards-visually-hidden');
      // the link text names the partner; skip the duplicate alt text
      const img = li.querySelector('.cards-card-image img');
      if (img && linked && links[0].textContent.trim().toLowerCase() === img.alt.trim().toLowerCase()) img.alt = '';
    }
    if (!li.querySelector('.cards-card-image')) li.classList.add('no-image');
    ul.append(li);
  });

  const width = IMAGE_WIDTHS[layout] || '750';
  ul.querySelectorAll('picture > img').forEach((img) => {
    const optimizedPic = createOptimizedPicture(img.src, img.alt, false, [{ width }]);
    moveInstrumentation(img, optimizedPic.querySelector('img'));
    img.closest('picture').replaceWith(optimizedPic);
  });
  block.replaceChildren(ul);
}
