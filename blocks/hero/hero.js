import { createOptimizedPicture } from '../../scripts/aem.js';
import { moveInstrumentation } from '../../scripts/scripts.js';

/**
 * Builds the banner picture. A mobile image, when authored, is used below 600px;
 * otherwise the main image is used at every size.
 * @param {HTMLImageElement} img main image
 * @param {HTMLImageElement} [mobileImg] optional small-screen crop
 * @param {boolean} eager load immediately (hero in the first section is usually the LCP)
 */
function buildPicture(img, mobileImg, eager) {
  const picture = createOptimizedPicture(img.src, img.alt, eager, [
    { media: '(width >= 1200px)', width: '2000' },
    { media: '(width >= 600px)', width: '1200' },
    { width: '750' },
  ]);
  if (mobileImg) {
    const mobile = createOptimizedPicture(mobileImg.src, img.alt, eager, [{ width: '750' }]);
    picture.querySelectorAll('source:not([media]), img').forEach((el) => el.remove());
    picture.append(...mobile.children);
  }
  // the rendered image keeps the main image's editor binding (the mobile image is a panel field)
  const rendered = picture.querySelector('img');
  moveInstrumentation(img, rendered);
  if (eager) rendered.setAttribute('fetchpriority', 'high');
  return picture;
}

/**
 * loads and decorates the hero
 * @param {Element} block The hero block element
 */
export default function decorate(block) {
  // Crosswalk renders one field per row; documents may put the picture and text in one cell
  const cells = [...block.children].flatMap((row) => [...row.children]);
  const pictureCells = cells.filter((c) => c.querySelector('picture') && !c.textContent.trim());
  const content = cells.find((c) => !pictureCells.includes(c) && c.textContent.trim());
  const [imageCell, mobileCell] = pictureCells;
  const img = imageCell?.querySelector('img') || content?.querySelector('picture img');
  if (img && !imageCell) img.closest('picture').remove();

  const firstSection = block.closest('main')?.querySelector('.section');
  const eager = !!firstSection && block.closest('.section') === firstSection;

  const parts = [];
  if (img) {
    const media = document.createElement('div');
    media.className = 'hero-media';
    media.append(buildPicture(img, mobileCell?.querySelector('img'), eager));
    parts.push(media);
  } else {
    block.classList.add('hero-no-image');
  }

  if (content) {
    const wrapper = document.createElement('div');
    wrapper.className = 'hero-content';
    moveInstrumentation(content, wrapper);
    wrapper.append(...content.childNodes);
    parts.push(wrapper);
  } else {
    block.classList.add('hero-image-only');
  }

  block.replaceChildren(...parts);
}
