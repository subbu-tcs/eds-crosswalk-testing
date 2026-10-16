/**
 * loads and decorates the columns
 * @param {Element} block The columns block element
 */
export default function decorate(block) {
  const cols = [...block.firstElementChild.children];
  block.classList.add(`columns-${cols.length}-cols`);

  [...block.children].forEach((row) => {
    [...row.children].forEach((col) => {
      // a cell holding only an image is the image column (shown first on small screens)
      const pic = col.querySelector('picture');
      if (pic) {
        const picWrapper = pic.closest('div');
        if (picWrapper && picWrapper.children.length === 1) {
          // picture is only content in column
          picWrapper.classList.add('columns-img-col');
        }
      }
      // a link alone in its paragraph (not a button) is a call to action with an arrow
      col.querySelectorAll('p > a[href]:only-child:not(.button)').forEach((a) => {
        if (a.closest('p').textContent.trim() === a.textContent.trim()) a.classList.add('columns-link');
      });
    });
  });
}
